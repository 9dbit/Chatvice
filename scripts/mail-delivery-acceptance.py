#!/usr/bin/env python3
"""Guarded operator probe for the isolated QA domain; no credentials in output.

Credentials and the resumable evidence path are supplied through environment.
Sending is a separate, explicitly gated command. This never targets production.
"""
import json
import os
from pathlib import Path
import sys
import time
import uuid
import http.cookiejar
import urllib.error
import urllib.parse
import urllib.request


class Response:
    def __init__(self, response):
        self.status_code = response.status
        self.content = response.read()

    def json(self):
        return json.loads(self.content)


class Session:
    def __init__(self):
        self.headers = {}
        self.opener = urllib.request.build_opener(
            NoRedirect(),
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def request(self, method, url, timeout, **kwargs):
        headers = dict(self.headers)
        data = None
        if 'params' in kwargs:
            url += '?' + urllib.parse.urlencode(kwargs['params'])
        if 'json' in kwargs:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(kwargs['json']).encode()
        if 'files' in kwargs:
            filename, content, media = kwargs['files']['file']
            assert all(c not in filename for c in '\r\n"')
            boundary = uuid.uuid4().hex
            headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
            data = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
                    f'filename="{filename}"\r\nContent-Type: {media}\r\n\r\n').encode()
            data += content + f'\r\n--{boundary}--\r\n'.encode()
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            response = self.opener.open(request, timeout=timeout)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return Response(response)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


BASE = 'https://chatvice-mail-delivery-staging-cutover-staging.up.railway.app'
DOMAIN = 'qa-mail-staging.chatvice.app'


def save():
    temporary = state_file.with_suffix('.tmp')
    with temporary.open('w') as output:
        output.write(json.dumps(state, indent=2) + '\n')
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, state_file)


def call(method, path, expected=200, **kwargs):
    response = session.request(method, BASE + path, timeout=50, **kwargs)
    if response.status_code != expected:
        raise RuntimeError(f'{method} {path}: HTTP {response.status_code}, expected {expected}')
    return response


def check(ok, name):
    if not ok:
        raise RuntimeError(name)
    state.setdefault('checks', {})[name] = True
    save()
    print(json.dumps({'passed': name}), flush=True)


def compose(box, recipient, subject, text, **extra):
    assert recipient.endswith('@' + DOMAIN)
    return call('POST', '/api/mail/compose', 201, json={
        'mailboxId': box, 'to': [recipient], 'subject': subject,
        'text': text, 'draft': True, **extra}).json()


def upload(message, content, filename):
    return call('POST', f'/api/mail/messages/{message}/attachments', 201,
                files={'file': (filename, content, 'text/plain')}).json()


def qa_reply_matches(value):
    # MIME can add terminal line endings; spaces and content changes still fail.
    return isinstance(value, str) and value.replace('\r\n', '\n').rstrip('\n') == 'Controlled QA reply.'


def wait_for_status(inspect, timeout=120, interval=10):
    # The caller authenticates once; no login retries or cookie persistence.
    deadline = time.monotonic() + timeout
    while True:
        if inspect():
            return
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise RuntimeError('QA delivery still pending after bounded wait')
        time.sleep(min(interval, remaining))


def inspect_status():
    sent = call('GET', '/api/mail/threads/' + state['clean']['threadId']).json()
    print(json.dumps({'outbound': [{'id': m['id'], 'status': m['status'], 'direction': m['direction']} for m in sent]}))
    inbound = call('GET', '/api/mail/threads', params={'mailboxId': state['qa-inbox'], 'folder': 'inbox'}).json()
    original = next(m for m in sent if m['id'] == state['clean']['id'])
    expected = next((m for m in inbound if m['subject'] == original['subject']), None)
    attachment_verified = False
    if expected:
        messages = call('GET', '/api/mail/threads/' + expected['id']).json()
        state['inbound'] = next(m for m in messages if m['direction'] == 'inbound'
                                and m['subject'] == original['subject']
                                and m['from_email'] == 'qa-sender@' + DOMAIN)
        # Keep only identifiers/status in the persisted evidence.
        state['inbound'] = {k: state['inbound'][k] for k in ['id', 'thread_id', 'status']}
        save()
        attachments = call('GET', f"/api/mail/messages/{state['inbound']['id']}/attachments").json()
        if attachments:
            check(len(attachments) == 1, 'received-single-attachment')
            attachment = attachments[0]
            check(attachment['scan_status'] == 'clean', 'received-attachment-clean')
            data = call('GET', f"/api/mail/attachments/{attachment['id']}/download").content
            check(data == b'Chatvice staging attachment integrity test, 2026-10-28.\n', 'received-attachment-roundtrip')
            attachment_verified = True
        print(json.dumps({'inbound': state['inbound'], 'attachments': len(attachments)}))
    replies = [m for m in sent if m['direction'] == 'inbound'
               and m['from_email'] == 'qa-inbox@' + DOMAIN]
    if len(replies) > 1:
        raise RuntimeError('Duplicate QA reply in original thread')
    reply_received = bool(state.get('reply-queued') and len(replies) == 1
                          and qa_reply_matches(replies[0].get('text_body')))
    if reply_received:
        check(True, 'reply-correlated-to-original-thread')
    original_delivered = any(m['id'] == state['clean']['id'] and m['status'] == 'delivered' for m in sent)
    if original_delivered:
        check(True, 'signed-delivery-confirmed')
    reply_delivered = bool(expected and state.get('reply-queued') and any(
        m['id'] == state['reply']['id'] and m['status'] == 'delivered' for m in messages))
    if reply_delivered:
        check(True, 'signed-reply-delivery-confirmed')
    return original_delivered and reply_received and reply_delivered and attachment_verified


def main():
    global state_file, state, session
    if sys.flags.optimize:
        raise RuntimeError("Python optimization is not allowed")
    state_file = Path(os.environ['MAIL_ACCEPTANCE_STATE_FILE'])
    if os.environ.get('CHATVICE_MAIL_QA_OPERATOR_PASSWORD'):
        credentials = {'email': 'qa-operator@' + DOMAIN,
                       'password': os.environ['CHATVICE_MAIL_QA_OPERATOR_PASSWORD']}
    else:
        credentials = json.loads(Path(os.environ['MAIL_ACCEPTANCE_CREDENTIAL_FILE']).read_text())
    assert credentials['email'] == 'qa-operator@' + DOMAIN
    state = json.loads(state_file.read_text()) if state_file.exists() else {}
    session = Session()
    session.headers['Origin'] = BASE


    mode = sys.argv[1]
    call('POST', '/api/mail-auth/login', json=credentials)
    try:
        check(call('GET', '/api/mail-auth/session').json().get('admin') is True, 'operator-login')
        if mode == 'login':
            pass
        elif mode == 'setup':
            domains = call('GET', '/api/mail/domains').json()
            domain = next((d for d in domains if d['domain'] == DOMAIN), None)
            if not domain:
                domain = call('POST', '/api/mail/domains', 201, json={'domain': DOMAIN}).json()
            state['domain'] = domain
            save()
            boxes = call('GET', '/api/mail/mailboxes').json()
            for local in ['qa-sender', 'qa-inbox']:
                box = next((b for b in boxes if b['domain'] == DOMAIN and b['local_part'] == local), None)
                if not box:
                    box = call('POST', '/api/mail/mailboxes', 201,
                               json={'domainId': domain['id'], 'localPart': local,
                                     'displayName': 'Chatvice QA ' + local}).json()
                state[local] = box['id']
                save()
            state['dns'] = call('GET', f"/api/mail/domains/{domain['id']}/dns").json()
            save()
            print(json.dumps({'domain': DOMAIN, 'dns': state['dns']}))
        elif mode == 'verify':
            state['domain'] = call('POST', f"/api/mail/domains/{state['domain']['id']}/verify", json={}).json()
            check(state['domain']['status'] == 'verified', 'application-domain-verified')
        elif mode == 'storage':
            if 'clean' not in state:
                state['clean'] = compose(state['qa-sender'], 'qa-inbox@' + DOMAIN,
                                         'Chatvice QA delivery ' + str(uuid.uuid4()),
                                         'Controlled QA email. No customer content.')
                save()
            payload = b'Chatvice staging attachment integrity test, 2026-10-28.\n'
            if 'attachment' not in state:
                state['attachment'] = upload(state['clean']['id'], payload, 'chatvice-qa.txt')
                save()
            attachment = state['attachment']
            check(attachment['scanStatus'] == 'clean', 'clamav-clean')
            path = f"/api/mail/attachments/{attachment['id']}/download"
            check(call('GET', path).content == payload, 'private-storage-roundtrip')
            check(Session().request('GET', BASE + path, timeout=30).status_code == 401, 'anonymous-download-denied')
            if 'quarantine' not in state:
                state['quarantine'] = compose(state['qa-sender'], 'qa-inbox@' + DOMAIN,
                                              'QA quarantine only - never send', 'Antivirus test draft.')
                save()
            if 'blocked' not in state:
                eicar = b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
                state['blocked'] = upload(state['quarantine']['id'], eicar, 'eicar-qa.txt')
                save()
            check(state['blocked']['scanStatus'] == 'blocked', 'clamav-eicar-blocked')
            call('GET', f"/api/mail/attachments/{state['blocked']['id']}/download", 410)
            check(True, 'blocked-download-denied')
            call('POST', f"/api/mail/drafts/{state['clean']['id']}/send", 503, json={})
            check(True, 'outbound-disabled-before-acceptance')
        elif mode in ['send', 'reply']:
            assert os.environ.get('MAIL_ACCEPTANCE_ALLOW_SEND') == 'qa-domain-only'
            assert state['checks']['application-domain-verified']
            assert state['checks']['private-storage-roundtrip']
            if mode == 'send':
                message = state['clean']
            else:
                assert state['checks']['received-attachment-roundtrip']
                if 'reply' not in state:
                    state['reply'] = compose(state['qa-inbox'], 'qa-sender@' + DOMAIN,
                                             'Re: Chatvice QA delivery', 'Controlled QA reply.',
                                             replyToId=state['inbound']['id'])
                    save()
                message = state['reply']
            if not state.get(mode + '-queued'):
                if state.get(mode + '-attempted'):
                    raise RuntimeError('Ambiguous send attempt: inspect message status before retrying')
                draft = call('GET', f"/api/mail/drafts/{message['id']}").json()
                recipient = ('qa-inbox' if mode == 'send' else 'qa-sender') + '@' + DOMAIN
                assert draft['to'] == [recipient] and not draft['cc'] and not draft['bcc']
                assert message['id'] != state['quarantine']['id']
                boxes = call('GET', '/api/mail/mailboxes').json()
                expected_local = 'qa-sender' if mode == 'send' else 'qa-inbox'
                assert any(b['id'] == draft['mailboxId'] and b['domain'] == DOMAIN
                           and b['local_part'] == expected_local for b in boxes)
                # Write intent before transport; a lost response must never auto-requeue.
                state[mode + '-attempted'] = message['id']
                save()
                result = call('POST', f"/api/mail/drafts/{message['id']}/send", 200, json={}).json()
                state[mode + '-queued'] = result
                save()
            print(json.dumps({mode: state[mode + '-queued']}))
        elif mode in ['status', 'wait']:
            if mode == 'wait':
                wait_for_status(inspect_status)
            else:
                inspect_status()
        else:
            raise RuntimeError('Unknown mode')
    finally:
        call('POST', '/api/mail-auth/logout', json={})


if __name__ == "__main__":
    main()
