import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ops', Path(__file__).with_name('mail-cloud-ops.py'))
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)


class CloudOpsSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.state = Path(self.temp.name) / 'state.json'
        self.data = json.loads((ops.ROOT / 'docs/evidence/mail-delivery-staging-20261028.json').read_text())
        self.state.write_text(json.dumps(self.data))
        self.env = patch.dict(os.environ, {
            'MAIL_ACCEPTANCE_STATE_FILE': str(self.state),
            'CLOUDFLARE_DNS_API_TOKEN': 'test-token-never-log',
            'CLOUDFLARE_ZONE_ID': 'a' * 32,
            'RESEND_RECEIVING_API_KEY': 'test-key-never-log'}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        self.addCleanup(self.temp.cleanup)

    def test_production_environment_refused_before_network(self):
        with patch.object(ops, 'api') as api:
            with self.assertRaisesRegex(ops.GuardError, 'railway-scope-denied'):
                ops.main()
            api.assert_not_called()

    def test_unknown_action_refused(self):
        os.environ['MAIL_CLOUD_ACTION'] = 'delete-all'
        with self.assertRaisesRegex(ops.GuardError, 'unknown-action'):
            ops.main()

    def test_dns_apex_rejected(self):
        self.data['dns']['host'] = 'chatvice.app'
        self.state.write_text(json.dumps(self.data))
        with self.assertRaisesRegex(ops.GuardError, 'dns-target-denied'):
            ops.challenge()

    def test_wrong_zone_refused_without_write(self):
        with patch.object(ops, 'api', return_value={'success': True, 'result': {'name': 'other.app'}}) as api:
            with self.assertRaisesRegex(ops.GuardError, 'cloudflare-zone-denied'):
                ops.publish_dns()
            self.assertEqual([c.args[0] for c in api.call_args_list], ['GET'])

    def test_conflicting_record_refused_without_overwrite(self):
        responses = [{'success': True, 'result': {'name': 'chatvice.app'}},
                     {'success': True, 'result': [{'type': 'TXT', 'content': 'different'}]}]
        with patch.object(ops, 'api', side_effect=responses) as api:
            with self.assertRaisesRegex(ops.GuardError, 'dns-conflict-no-overwrite'):
                ops.publish_dns()
            self.assertTrue(all(c.args[0] == 'GET' for c in api.call_args_list))

    def test_dns_create_then_rerun_is_idempotent(self):
        record = {'type': 'TXT', 'name': ops.HOST, 'content': ops.challenge()}
        for existing, expected_posts in [([], 1), ([record], 0)]:
            calls = []
            reads = 0
            def fake(method, url, token=None, data=None):
                nonlocal reads
                calls.append((method, url, data))
                if '/dns_records' not in url:
                    return {'success': True, 'result': {'name': 'chatvice.app'}}
                if method == 'POST':
                    self.assertEqual(data, {**record, 'ttl': 1})
                    return {'success': True}
                reads += 1
                return {'success': True, 'result': existing if reads == 1 else [record]}
            with patch.object(ops, 'api', side_effect=fake), patch.object(ops, 'public_dns', return_value=True):
                ops.publish_dns()
            self.assertEqual(sum(c[0] == 'POST' for c in calls), expected_posts)

    def test_webhook_wrong_endpoint_cannot_be_enabled(self):
        with patch.object(ops, 'api', return_value={'endpoint': 'https://other.app'}) as api:
            with self.assertRaisesRegex(ops.GuardError, 'webhook-endpoint-denied'):
                ops.webhook('webhook-enable')
            self.assertEqual(api.call_count, 1)

    def test_webhook_enable_requires_live_verification(self):
        current = {'endpoint': ops.BASE + '/api/mail/provider/resend/webhook',
                   'events': list(ops.EVENTS), 'status': 'disabled'}
        with patch.object(ops, 'api', return_value=current) as api, patch.object(
            ops, 'probe', side_effect=ops.GuardError('probe-verify-failed')):
            with self.assertRaisesRegex(ops.GuardError, 'probe-verify-failed'):
                ops.webhook('webhook-enable')
            self.assertEqual(api.call_count, 1)

    def test_network_target_and_redirect_denied(self):
        with self.assertRaisesRegex(ops.GuardError, 'http-target-denied'):
            ops.api('GET', 'https://example.com', 'a-secret')
        self.assertIsNone(ops.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://example.com'))


if __name__ == '__main__':
    unittest.main()
