// Read-only comparison of source and restored synthetic CI databases.
import pg from 'pg';
import {createHash} from 'node:crypto';
if(process.env.CHATVICE_MAIL_INTEGRATION_DB!=='isolated-ci')throw Error('Disposable CI only');
const source=new URL(process.env.DATABASE_URL),target=new URL(source.href);
target.pathname='/chatvice_mail_restore_ci';
if(source.hostname!=='127.0.0.1'||source.pathname!=='/chatvice_mail_ci')throw Error('CI target guard');
const a=new pg.Pool({connectionString:source.href,max:1}),b=new pg.Pool({connectionString:target.href,max:1});
const tables=['merchants','supervisors','leads','mail_domains','mail_mailboxes','mail_memberships','mail_aliases',
  'mail_threads','mail_messages','mail_attachments','mail_delivery_events','mail_login_users','mail_login_sessions','mail_login_limits'];
const digest=rows=>createHash('sha256').update(rows.map(x=>JSON.stringify(x.row)).sort().join('\n')).digest('hex');
try{
  let records=0;
  for(const table of tables){
    const [left,right]=await Promise.all([a.query(`SELECT to_jsonb(t) AS row FROM "${table}" t`),b.query(`SELECT to_jsonb(t) AS row FROM "${table}" t`)]);
    if(left.rowCount!==right.rowCount||digest(left.rows)!==digest(right.rows))throw Error('Restore integrity mismatch: '+table);
    records+=left.rowCount;
  }
  console.log(JSON.stringify({syntheticRestoreVerified:true,tables:tables.length,records}));
}finally{await a.end();await b.end();}
