/** Live HTTPS acceptance for the existing, empty Delivery Staging service.
 * Preview is read-only. --apply creates one random, temporary login identity,
 * uses the packaged provisioner, and removes that exact identity in finally.
 * Never logs passwords, cookies, response bodies, or database/provider secrets.
 * No message, mailbox, domain, provider, or DNS operation is performed. */
import {createHash, createHmac, randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const scope = {
  project: '40970ac6-3ce6-4d31-8d6a-555d2dd6fecf',
  environment: '08a3efa0-8a70-44db-a2fb-ca46ddb84b95',
  service: 'd446f23c-2730-49e5-8e3d-6751ebe46afa',
  origin: 'https://chatvice-mail-delivery-staging-cutover-staging.up.railway.app',
};
const history = [
  '20261026_chatvice_mail_v1.sql',
  '20261026_chatvice_mail_attachments_v2.sql',
  '20261027_chatvice_mail_login.sql',
  '20261027_chatvice_mail_delivery_recipients_v3.sql',
];
const checks = [];
let stage = 'scope-guard';
let pool;
let cleanupNeeded = false;
let cleanupPassed = false;
let email;
let tenant;
let lock;
const check = (condition, name) => {
  if (!condition) throw new Error(name);
  checks.push(name);
};
const call = async (path, {method = 'GET', body, cookie, origin = scope.origin} = {}) => {
  const response = await fetch(scope.origin + path, {
    method, redirect: 'manual', signal: AbortSignal.timeout(15000),
    headers: {Accept: 'application/json', Origin: origin,
      ...(body ? {'Content-Type': 'application/json'} : {}),
      ...(cookie ? {Cookie: cookie} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (!/no-store/.test(response.headers.get('cache-control') || '') ||
      !/noindex/.test(response.headers.get('x-robots-tag') || ''))
    throw new Error('private-response-headers');
  return response;
};
const expectStatus = async (path, status, options) => {
  const response = await call(path, options);
  const correct = response.status === status;
  await response.arrayBuffer();
  if (!correct) throw new Error('unexpected-http-status');
};

try {
  const e = process.env;
  const connection = new URL(e.DATABASE_URL || 'postgres://invalid/');
  tenant = e.CHATVICE_MAIL_INITIAL_TENANT || '';
  check(e.RAILWAY_PROJECT_ID === scope.project &&
    e.RAILWAY_ENVIRONMENT_ID === scope.environment &&
    e.RAILWAY_SERVICE_ID === scope.service &&
    e.CHATVICE_MAIL_APP_ROLE === 'isolated-mail' &&
    e.CHATVICE_MAIL_APP_ORIGIN === scope.origin &&
    e.CHATVICE_MAIL_ALLOWED_ORIGINS === scope.origin &&
    e.CHATVICE_MAIL_ENABLED === 'true' &&
    e.CHATVICE_MAIL_OUTBOUND_ENABLED === 'false' &&
    e.CHATVICE_MAIL_ATTACHMENTS_ENABLED === 'false' &&
    e.CHATVICE_MAIL_AI_ENABLED === 'false' &&
    e.CHATVICE_MAIL_PROVIDER === 'disabled' &&
    e.CHATVICE_MAIL_QA_BOOTSTRAP !== 'true' &&
    /^[a-zA-Z0-9_-]{1,32}$/.test(tenant) &&
    /^[a-f0-9]{64}$/i.test(e.CHATVICE_MAIL_SESSION_SECRET || '') &&
    Boolean(e.CHATVICE_MAIL_SCHEMA_EXPECTED_HOST) &&
    connection.hostname === e.CHATVICE_MAIL_SCHEMA_EXPECTED_HOST,
  'exact-disabled-staging-scope');
  const apply = process.argv.includes('--apply');
  if (apply && e.MAIL_STAGING_LOGIN_SMOKE !== 'temporary-identity')
    throw new Error('explicit-apply-guard');

  stage = 'database-preflight';
  const {default: pg} = await import('pg');
  pool = new pg.Pool({connectionString: connection.toString(), max: 2,
    connectionTimeoutMillis: 10000, statement_timeout: 10000});
  lock = await pool.connect();
  const locked = await lock.query('SELECT pg_try_advisory_lock(772130028) AS locked');
  check(locked.rows[0]?.locked === true, 'exclusive-login-probe');
  const migrations = await pool.query('SELECT name,sha256,initial_tenant FROM mail_schema_migrations');
  check(migrations.rowCount === history.length && history.every(name => {
    const sha = createHash('sha256').update(readFileSync('migrations/' + name)).digest('hex');
    return migrations.rows.some(row => row.name === name && row.sha256 === sha && row.initial_tenant === tenant);
  }), 'packaged-schema-history-matches');
  check((await pool.query('SELECT id FROM merchants WHERE id=$1', [tenant])).rowCount === 1,
    'existing-isolated-tenant');
  const inventory = await pool.query(`SELECT
    (SELECT count(*) FROM mail_login_users) AS identities,
    (SELECT count(*) FROM mail_domains) AS domains,
    (SELECT count(*) FROM mail_mailboxes) AS mailboxes,
    (SELECT count(*) FROM mail_messages) AS messages`);
  check(Object.values(inventory.rows[0]).every(n => Number(n) === 0), 'empty-staging-before-probe');

  stage = 'anonymous-http';
  await expectStatus('/health', 200);
  await expectStatus('/api/mail-auth/session', 401);
  await expectStatus('/api/mail/mailboxes', 401, {cookie: 'connect.sid=synthetic-main-app-only'});
  checks.push('https-health', 'anonymous-denied', 'main-app-cookie-denied');

  const probeId = randomBytes(12).toString('hex');
  email = 'probe-' + probeId + '@qa-mail.example.invalid';
  const provisioning = {...e, MAIL_PROVISION_TENANT: tenant, MAIL_PROVISION_USER: tenant,
    MAIL_PROVISION_ADMIN: 'true', MAIL_PROVISION_EMAIL: email,
    MAIL_PROVISION_EXPECTED_HOST: connection.hostname};
  delete provisioning.MAIL_PROVISION_PASSWORD;
  const provision = args => JSON.parse(execFileSync(process.execPath,
    ['dist/mail-provision-user.mjs', ...args], {env: provisioning, encoding: 'utf8',
      timeout: 20000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe']}).trim());
  stage = 'provision-preview';
  const preview = provision([]);
  check(preview.preview === true && preview.valid === true, 'packaged-provision-preview');
  check((await pool.query('SELECT id FROM mail_login_users WHERE email=$1', [email])).rowCount === 0,
    'preview-creates-no-identity');

  if (apply) {
    stage = 'temporary-identity';
    const password = randomBytes(32).toString('base64url');
    provisioning.MAIL_PROVISION_PASSWORD = password;
    // Set this before invoking the child: it may commit just before a timeout.
    cleanupNeeded = true;
    console.log(JSON.stringify({test: 'delivery-staging-login', stage, probeId}));
    try { check(provision(['--apply']).created === true, 'packaged-provision-applied'); }
    finally { delete provisioning.MAIL_PROVISION_PASSWORD; }
    const identity = await pool.query(`SELECT id,password_hash FROM mail_login_users
      WHERE email=$1 AND tenant_id=$2 AND user_id=$2 AND is_admin=true`, [email, tenant]);
    check(identity.rowCount === 1 && /^scrypt1\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(identity.rows[0].password_hash),
      'salted-password-hash');
    const id = identity.rows[0].id;

    stage = 'login-http';
    await expectStatus('/api/mail-auth/login', 403, {method: 'POST', body: {email, password},
      origin: 'https://unrelated.example.invalid'});
    await expectStatus('/api/mail-auth/login', 401, {method: 'POST', body: {email, password: 'invalid-synthetic-password'}});
    checks.push('cross-origin-login-denied', 'wrong-password-denied');
    const login = async () => {
      const response = await call('/api/mail-auth/login', {method: 'POST', body: {email, password}});
      if (response.status !== 200) throw new Error('login-failed');
      const cookie = response.headers.get('set-cookie') || '';
      check(/^__Host-chatvice_mail=[a-f0-9]{64};/.test(cookie) &&
        ['Path=/', 'Secure', 'HttpOnly', 'SameSite=Strict'].every(flag => cookie.includes(flag)) &&
        !/\bdomain=/i.test(cookie), 'host-only-secure-cookie');
      const data = await response.json();
      if (data.authenticated !== true || data.email !== email || data.admin !== true)
        throw new Error('login-identity-mismatch');
      return cookie.split(';')[0];
    };
    let cookie = await login();
    const session = await call('/api/mail-auth/session', {cookie});
    const current = await session.json();
    check(session.status === 200 && current.authenticated === true && current.email === email && current.admin === true,
      'authenticated-session');
    const stored = await pool.query('SELECT token_hash FROM mail_login_sessions WHERE login_id=$1', [id]);
    const rawToken = cookie.split('=')[1];
    const expectedHash = createHmac('sha256', e.CHATVICE_MAIL_SESSION_SECRET).update('session|' + rawToken).digest('hex');
    check(stored.rowCount === 1 && stored.rows[0].token_hash === expectedHash && stored.rows[0].token_hash !== rawToken,
      'session-token-hashed-at-rest');

    stage = 'authenticated-read-apis';
    for (const path of ['/api/mail/mailboxes', '/api/mail/domains']) {
      const response = await call(path, {cookie});
      const data = await response.json();
      check(response.status === 200 && Array.isArray(data) && data.length === 0,
        path.endsWith('mailboxes') ? 'authenticated-mailbox-api' : 'authenticated-domain-api');
    }
    const response = await call('/api/mail/capabilities', {cookie});
    const flags = await response.json();
    check(response.status === 200 && flags.admin === true && flags.outbound === false &&
      flags.attachments === false && flags.ai === false, 'live-delivery-features-disabled');

    stage = 'credential-revocation';
    await pool.query('UPDATE mail_login_users SET credential_version=credential_version+1 WHERE id=$1', [id]);
    await expectStatus('/api/mail-auth/session', 401, {cookie});
    checks.push('credential-version-revokes-session');
    cookie = await login();
    stage = 'logout-revocation';
    await expectStatus('/api/mail-auth/logout', 200, {method: 'POST', cookie});
    await expectStatus('/api/mail-auth/session', 401, {cookie});
    checks.push('logout-revokes-session');
  }
} catch {
  process.exitCode = 1;
  console.error(JSON.stringify({test: 'delivery-staging-login', status: 'failed', stage}));
} finally {
  if (cleanupNeeded && pool) {
    try {
      await pool.query(`DELETE FROM mail_login_users WHERE email=$1 AND tenant_id=$2
        AND user_id=$2 AND is_admin=true`, [email, tenant]);
      const remaining = await pool.query('SELECT id FROM mail_login_users WHERE email=$1', [email]);
      const orphan = await pool.query(`SELECT s.token_hash FROM mail_login_sessions s
        LEFT JOIN mail_login_users u ON u.id=s.login_id WHERE u.id IS NULL`);
      check(remaining.rowCount === 0 && orphan.rowCount === 0, 'temporary-identity-and-sessions-removed');
      // Remove only this random probe account's login-limit entry; keep IP limits intact.
      const accountHash = createHmac('sha256', process.env.CHATVICE_MAIL_SESSION_SECRET)
        .update('account|' + email).digest('hex');
      await pool.query('DELETE FROM mail_login_limits WHERE key_hash=$1', [accountHash]);
      cleanupPassed = true;
    } catch {
      process.exitCode = 1;
      console.error(JSON.stringify({test: 'delivery-staging-login', status: 'failed', stage: 'identity-cleanup'}));
    }
  }
  if (lock) {
    await lock.query('SELECT pg_advisory_unlock(772130028)').catch(() => {});
    lock.release();
  }
  if (pool) await pool.end();
}
if (!process.exitCode) console.log(JSON.stringify({test: 'delivery-staging-login', status: 'passed',
  mode: cleanupNeeded ? 'temporary-identity' : 'read-only-preview',
  cleanupPassed, checks: [...new Set(checks)], evidence: 'Live HTTP and database only; no browser or provider delivery proof.'}));
