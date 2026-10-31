import test from 'node:test';
import assert from 'node:assert/strict';
import {mailReplyRecipients,parseMailRecipients} from '../../shared/mail-recipients';

test('reply-all excludes the mailbox and its aliases and deduplicates To/CC case-insensitively',()=>{
 const result=mailReplyRecipients({from_email:'Client@Example.org',
  to_emails:['HELLO@studio.example','sales@studio.example','partner@example.org','client@example.org'],
  cc_emails:['Partner@Example.org','reviewer@example.org','REVIEWER@example.org','hello@studio.example']
 },['hello@studio.example','sales@studio.example'],true);
 assert.deepEqual(result,{to:['client@example.org','partner@example.org'],cc:['reviewer@example.org']});
});
test('normal reply addresses only the sender and neither reply mode accepts BCC',()=>{
 const message={from_email:'client@example.org',to_emails:['hello@studio.example','partner@example.org'],
  cc_emails:['reviewer@example.org'],bcc_emails:['private@example.org']};
 assert.deepEqual(mailReplyRecipients(message,['hello@studio.example']),{to:['client@example.org'],cc:[]});
 assert.equal(JSON.stringify(mailReplyRecipients(message,['hello@studio.example'],true)).includes('private@example.org'),false);
});
test('recipient entry accepts comma/semicolon lists and removes empty or repeated addresses',()=>{
 assert.deepEqual(parseMailRecipients(' One@Example.org, two@example.org;ONE@example.org; , '),['one@example.org','two@example.org']);
 assert.deepEqual(parseMailRecipients(''),[]);
});
