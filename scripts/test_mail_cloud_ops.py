import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location('ops', Path(__file__).with_name('mail-cloud-ops.py'))
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)

acceptance_spec = importlib.util.spec_from_file_location(
    'acceptance', Path(__file__).with_name('mail-delivery-acceptance.py'))
acceptance = importlib.util.module_from_spec(acceptance_spec)
acceptance_spec.loader.exec_module(acceptance)


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

    def test_quoted_dns_record_is_already_present_without_write(self):
        record = {'type': 'TXT', 'name': ops.HOST, 'content': '"' + ops.challenge() + '"'}
        responses = [{'success': True, 'result': {'name': 'chatvice.app'}},
                     {'success': True, 'result': [record]},
                     {'success': True, 'result': [record]}]
        with patch.object(ops, 'api', side_effect=responses) as api, patch.object(
                ops, 'public_dns', return_value=True):
            ops.publish_dns()
        self.assertEqual([c.args[0] for c in api.call_args_list], ['GET'] * 3)

    def test_txt_malformed_quotes_and_whitespace_are_not_equal(self):
        value = ops.challenge()
        for content in [None, '"' + value, value + '"', '""' + value + '""',
                        ' ' + value, value + '\n', '"different"']:
            with self.subTest(content=content):
                self.assertFalse(ops.txt_matches(content, value))

    def test_public_dns_requires_txt_with_exact_value(self):
        value = ops.challenge()
        for content, kind, expected in [('"' + value + '"', 16, True),
                                      ('""' + value + '""', 16, False),
                                      (value, 5, False)]:
            with patch.object(ops, 'api', return_value={'Answer': [{'type': kind, 'data': content}]}):
                self.assertEqual(ops.public_dns(), expected)

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


class DeliveryAcceptance(unittest.TestCase):
    def test_reply_accepts_mime_newlines_but_not_changed_content(self):
        for text in ['Controlled QA reply.', 'Controlled QA reply.\n', 'Controlled QA reply.\r\n']:
            self.assertTrue(acceptance.qa_reply_matches(text))
        for text in [None, ' Controlled QA reply.', 'Controlled QA reply. ',
                     'Controlled QA reply.\nextra', 'Controlled QA\nreply.']:
            self.assertFalse(acceptance.qa_reply_matches(text))

    def run_wait(self, inspect):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / 'evidence.json'
            state.write_text('{}')
            with patch.dict(os.environ, {'MAIL_ACCEPTANCE_STATE_FILE': str(state),
                    'CHATVICE_MAIL_QA_OPERATOR_PASSWORD': 'synthetic-password'}, clear=True), patch.object(
                    acceptance.sys, 'argv', ['probe', 'wait']), patch.object(
                    acceptance, 'call', return_value=Mock(json=lambda: {'admin': True})) as call, patch.object(
                    acceptance, 'inspect_status', side_effect=inspect) as status, patch.object(
                    acceptance.time, 'sleep'), patch.object(acceptance.time, 'monotonic', return_value=0):
                try:
                    acceptance.main()
                finally:
                    self.assertEqual([c.args[:2] for c in call.call_args_list], [
                        ('POST', '/api/mail-auth/login'), ('GET', '/api/mail-auth/session'),
                        ('POST', '/api/mail-auth/logout')])
                return status.call_count

    def test_wait_reuses_one_login_and_logs_out(self):
        self.assertEqual(self.run_wait([False, False, True]), 3)

    def test_wait_failure_still_logs_out_without_retrying_login(self):
        with self.assertRaisesRegex(RuntimeError, 'provider failure'):
            self.run_wait(RuntimeError('provider failure'))

    def test_wait_timeout_is_bounded(self):
        inspect = Mock(return_value=False)
        with patch.object(acceptance.time, 'monotonic', side_effect=[0, 0, 10, 20]), patch.object(
                acceptance.time, 'sleep') as sleep:
            with self.assertRaisesRegex(RuntimeError, 'still pending'):
                acceptance.wait_for_status(inspect, timeout=20, interval=10)
        self.assertEqual(inspect.call_count, 3)
        self.assertEqual([c.args[0] for c in sleep.call_args_list], [10, 10])

    def test_status_rejects_duplicate_replies(self):
        original = {'id': 'original', 'status': 'delivered', 'direction': 'outbound', 'subject': 'QA'}
        reply = {'id': 'reply', 'status': 'received', 'direction': 'inbound',
                 'from_email': 'qa-inbox@' + acceptance.DOMAIN, 'text_body': 'Controlled QA reply.\r\n'}
        with patch.object(acceptance, 'state', {'clean': {'id': 'original', 'threadId': 'thread'},
                'qa-inbox': 'inbox'}, create=True), patch.object(acceptance, 'call', side_effect=[
                    Mock(json=lambda: [original, reply, reply]), Mock(json=lambda: [])]):
            with self.assertRaisesRegex(RuntimeError, 'Duplicate QA reply'):
                acceptance.inspect_status()

    def test_pending_delivery_does_not_trust_old_passed_checks(self):
        original = {'id': 'original', 'status': 'sent', 'direction': 'outbound', 'subject': 'QA'}
        with patch.object(acceptance, 'state', {'clean': {'id': 'original', 'threadId': 'thread'},
                'qa-inbox': 'inbox', 'checks': {'signed-delivery-confirmed': True,
                'received-attachment-roundtrip': True}}, create=True), patch.object(
                acceptance, 'call', side_effect=[Mock(json=lambda: [original]), Mock(json=lambda: [])]):
            self.assertFalse(acceptance.inspect_status())

    def test_wait_completion_requires_both_signed_deliveries_and_attachment_bytes(self):
        original = {'id': 'original', 'status': 'delivered', 'direction': 'outbound', 'subject': 'QA'}
        received = {'id': 'received', 'status': 'received', 'direction': 'inbound',
                    'subject': 'QA', 'thread_id': 'inbox-thread',
                    'from_email': 'qa-sender@' + acceptance.DOMAIN}
        reply = {'id': 'reply-received', 'status': 'received', 'direction': 'inbound',
                 'from_email': 'qa-inbox@' + acceptance.DOMAIN, 'text_body': 'Controlled QA reply.\r\n'}
        for reply_status in ['sent', 'delivered']:
            state = {'clean': {'id': 'original', 'threadId': 'thread'}, 'qa-inbox': 'inbox',
                     'reply-queued': True, 'reply': {'id': 'reply-sent'}}
            responses = [Mock(json=lambda: [original, reply]),
                         Mock(json=lambda: [{'id': 'inbox-thread', 'subject': 'QA'}]),
                         Mock(json=lambda: [received, {'id': 'reply-sent', 'status': reply_status}]),
                         Mock(json=lambda: [{'id': 'attachment', 'scan_status': 'clean'}]),
                         Mock(content=b'Chatvice staging attachment integrity test, 2026-10-28.\n')]
            with patch.object(acceptance, 'state', state, create=True), patch.object(
                    acceptance, 'call', side_effect=responses), patch.object(acceptance, 'save'):
                self.assertEqual(acceptance.inspect_status(), reply_status == 'delivered')


if __name__ == '__main__':
    unittest.main()
