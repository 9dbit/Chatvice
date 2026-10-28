#!/usr/bin/env python3
"""One-shot cloud operator. Fixed staging targets; no HTTP listener or shell input."""
import contextlib
import fcntl
import io
import json
import os
from pathlib import Path
import re
import runpy
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://chatvice-mail-delivery-staging-cutover-staging.up.railway.app'
DOMAIN = 'qa-mail-staging.chatvice.app'
HOST = '_chatvice-mail.' + DOMAIN
WEBHOOK = 'c1413829-97d6-4947-82c7-f49e1704f101'
PROJECT = '40970ac6-3ce6-4d31-8d6a-555d2dd6fecf'
ENVIRONMENT = '08a3efa0-8a70-44db-a2fb-ca46ddb84b95'
EVENTS = {'email.received', 'email.sent', 'email.delivered', 'email.bounced',
          'email.complained', 'email.failed'}
ROOT = Path(__file__).resolve().parent.parent
ACTIONS = {'preflight', 'dns', 'verify', 'storage', 'status', 'send', 'reply',
           'webhook-check', 'webhook-enable', 'webhook-disable'}


class GuardError(Exception):
    """Messages are static diagnostic codes, never provider response bodies."""


def require(ok, code):
    if not ok:
        raise GuardError(code)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def api(method, url, token=None, data=None):
    parsed = urllib.parse.urlsplit(url)
    require(parsed.scheme == 'https' and parsed.hostname in {
        'api.cloudflare.com', 'api.resend.com', 'dns.google',
        urllib.parse.urlsplit(BASE).hostname}, 'http-target-denied')
    headers = {'Accept': 'application/json', 'User-Agent': 'Chatvice-Cloud-Ops/1.0'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if data is not None:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(url, method=method, headers=headers,
              data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=40) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise GuardError('provider-http-' + str(error.code)) from None


def emit(**data):
    print(json.dumps(data, sort_keys=True), flush=True)


def state_path():
    return Path(os.environ.get('MAIL_ACCEPTANCE_STATE_FILE', '/state/acceptance.json'))


def read_state():
    state = json.loads(state_path().read_text())
    require(state['domain']['domain'] == DOMAIN, 'state-domain-denied')
    return state


def probe(mode):
    # Discard arbitrary response/error text. Only emit audited result fields below.
    previous = sys.argv
    sys.argv = ['mail-delivery-acceptance.py', mode]
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            runpy.run_path(str(ROOT / 'scripts/mail-delivery-acceptance.py'), run_name='__main__')
    except Exception:
        raise GuardError('probe-' + mode + '-failed') from None
    finally:
        sys.argv = previous
    emit(probe=mode, result='passed')


def challenge():
    state = read_state()
    dns = state['dns']
    require(dns['type'] == 'TXT' and dns['host'] == HOST, 'dns-target-denied')
    require(re.fullmatch(r'chatvice-verify=[0-9a-f-]{36}', dns['value']) is not None,
            'dns-value-denied')
    return dns['value']


def public_dns():
    data = api('GET', 'https://dns.google/resolve?' + urllib.parse.urlencode(
        {'name': HOST, 'type': 'TXT'}))
    return any(row.get('type') == 16 and row.get('data', '').strip('"') == challenge()
               for row in data.get('Answer', []))


def publish_dns():
    token = os.environ.get('CLOUDFLARE_DNS_API_TOKEN')
    zone = os.environ.get('CLOUDFLARE_ZONE_ID', '')
    require(bool(token), 'missing-cloudflare-dns-token')
    require(re.fullmatch(r'[a-f0-9]{32}', zone) is not None, 'missing-cloudflare-zone-id')
    root = 'https://api.cloudflare.com/client/v4/zones/' + zone
    # Zone Read lets us refuse an accidentally supplied zone for another domain.
    zone_data = api('GET', root, token)
    require(zone_data.get('success') and zone_data['result']['name'] == 'chatvice.app',
            'cloudflare-zone-denied')
    records_url = root + '/dns_records?' + urllib.parse.urlencode({'name': HOST, 'per_page': 100})
    result = api('GET', records_url, token)
    require(result.get('success') is True, 'cloudflare-list-failed')
    records = result['result']
    value = challenge()
    if records:
        require(all(r['type'] == 'TXT' and r['content'] == value for r in records),
                'dns-conflict-no-overwrite')
    else:
        result = api('POST', root + '/dns_records', token,
                     {'type': 'TXT', 'name': HOST, 'content': value, 'ttl': 1})
        require(result.get('success') is True, 'cloudflare-create-failed')
    result = api('GET', records_url, token)
    require(result.get('success') and any(r['type'] == 'TXT' and r['name'] == HOST
               and r['content'] == value for r in result['result']), 'dns-readback-failed')
    emit(dns_record='verified-in-cloudflare', public_dns_ready=public_dns())


def webhook(action):
    token = os.environ.get('RESEND_RECEIVING_API_KEY')
    require(bool(token), 'missing-resend-receiving-key')
    url = 'https://api.resend.com/webhooks/' + WEBHOOK
    current = api('GET', url, token)
    require(current.get('endpoint') == BASE + '/api/mail/provider/resend/webhook',
            'webhook-endpoint-denied')
    require(set(current.get('events', [])) == EVENTS, 'webhook-events-denied')
    if action != 'webhook-check':
        if action == 'webhook-enable':
            probe('verify')
            checks = read_state().get('checks', {})
            require(all(checks.get(x) is True for x in ['private-storage-roundtrip',
                'clamav-clean', 'clamav-eicar-blocked', 'blocked-download-denied',
                'anonymous-download-denied']), 'webhook-storage-gates-missing')
        desired = 'enabled' if action == 'webhook-enable' else 'disabled'
        if current.get('status') != desired:
            api('PATCH', url, token, {'status': desired})
        current = api('GET', url, token)
        require(current.get('status') == desired, 'webhook-readback-failed')
    emit(webhook_id=WEBHOOK, status=current.get('status'))


def main():
    action = os.environ.get('MAIL_CLOUD_ACTION', 'preflight')
    require(action in ACTIONS, 'unknown-action')
    require(os.environ.get('RAILWAY_PROJECT_ID') == PROJECT and
            os.environ.get('RAILWAY_ENVIRONMENT_ID') == ENVIRONMENT, 'railway-scope-denied')
    require(sys.flags.optimize == 0, 'python-optimization-denied')
    os.umask(0o077)
    state_path().parent.mkdir(parents=True, exist_ok=True)
    with (state_path().parent / 'operator.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if not state_path().exists():
            state_path().write_bytes((ROOT / 'docs/evidence/mail-delivery-staging-20261028.json').read_bytes())
        os.environ['MAIL_ACCEPTANCE_STATE_FILE'] = str(state_path())
        read_state()
        if action == 'preflight':
            require(api('GET', BASE + '/health').get('status') == 'ok', 'health-failed')
            probe('login')
            emit(health='passed', public_dns_ready=public_dns(),
                 cloudflare_token_present=bool(os.environ.get('CLOUDFLARE_DNS_API_TOKEN')),
                 cloudflare_zone_present=bool(os.environ.get('CLOUDFLARE_ZONE_ID')),
                 resend_key_present=bool(os.environ.get('RESEND_RECEIVING_API_KEY')))
        elif action == 'dns':
            publish_dns()
        elif action.startswith('webhook-'):
            webhook(action)
        else:
            if action in {'send', 'reply'}:
                require(os.environ.get('MAIL_ACCEPTANCE_ALLOW_SEND') == 'qa-domain-only',
                        'sending-not-authorized')
                probe('verify')
            probe(action)
        state = read_state()
        emit(action=action, result='completed', checks=state.get('checks', {}),
             domain_status=state['domain']['status'],
             send_queued=bool(state.get('send-queued')), reply_queued=bool(state.get('reply-queued')))


if __name__ == '__main__':
    try:
        main()
    except GuardError as error:
        emit(result='blocked', reason=str(error))
        sys.exit(1)
    except Exception as error:
        # Do not serialize exception text: SDK/HTTP errors can contain credentials.
        emit(result='failed', reason=type(error).__name__)
        sys.exit(1)
