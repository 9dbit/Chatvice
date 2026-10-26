/** Static, tracker-free login form for the synthetic Mail QA environment. */
export function renderQaLoginPage(error=false):string {
  const alert=error?
    '<p class="error" role="alert">Login gagal. Periksa username dan password.</p>':"";
  return `<!doctype html><html lang="id"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Chatvice Mail · QA Login</title>
  <style>
    :root{color-scheme:dark;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}body{margin:0;background:#080a0e;color:#f8fafc;min-height:100vh;display:grid;place-items:center;padding:22px}
    main{width:min(100%,415px);padding:34px;border:1px solid #30333b;border-radius:24px;background:#101218}
    .brand{display:flex;gap:12px;align-items:center;font-size:13px;font-weight:800;letter-spacing:.10em}
    .mark{height:36px;width:36px;border-radius:12px;background:#f97316;display:grid;place-items:center;color:#101218;font-size:22px;font-weight:900}
    h1{font-size:29px;margin:36px 0 8px;letter-spacing:-.04em}
    .description{color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 30px}
    label{display:block;font-size:13px;font-weight:650;margin:20px 0 8px}
    input{width:100%;padding:14px 15px;border:1px solid #343741;border-radius:12px;background:#191c23;color:#fff;font-size:16px;outline:0}
    input:focus{border-color:#f97316;box-shadow:0 0 0 3px #f9731620}
    button{margin-top:28px;width:100%;padding:15px 20px;border-radius:12px;background:#f97316;color:#111;font-size:15px;font-weight:800;border:0;cursor:pointer}
    button:active{transform:scale(.99)}
    .fine{font-size:12px;color:#777f8c;text-align:center;margin:24px 0 0;line-height:1.6}
    .error{padding:12px;background:#461c22;color:#fecdd3;border-radius:10px;font-size:13px}
  </style></head><body><main>
    <div class="brand"><span class="mark" aria-hidden="true">C</span>CHATVICE MAIL <span style="color:#f97316">QA</span></div>
    <h1>Sign in</h1><p class="description">Masuk ke lingkungan pengujian Mail yang terpisah dari production.</p>
    ${alert}
    <form method="post" action="/qa/login" autocomplete="off">
      <label for="username">Username</label>
      <input id="username" name="username" type="text" value="mailqa" autocomplete="username" required maxlength="50">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus maxlength="256">
      <button type="submit">Sign in</button>
    </form>
    <p class="fine">Private QA environment. No customer mail or public email delivery.</p>
  </main></body></html>`;
}
