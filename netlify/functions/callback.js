// Step 2 of the GitHub login: swap the one-time code GitHub sent back for an
// access token, then hand that token to the editor window that opened this one.
// The token stays in the browser; nothing is stored on the server.

exports.handler = async (event) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { statusCode: 500, body: "GitHub login is not configured for this site yet." };
  }

  const { code, state } = event.queryStringParameters || {};
  const cookie = (event.headers.cookie || "")
    .split(";").map((c) => c.trim().split("="))
    .find(([k]) => k === "vfy_oauth_state");

  if (!code) return fail("GitHub did not send a login code back.");
  if (!state || !cookie || cookie[1] !== state) return fail("This login attempt could not be verified. Please try again.");

  let token;
  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await res.json();
    if (data.error || !data.access_token) return fail(data.error_description || "GitHub refused the login.");
    token = data.access_token;
  } catch (e) {
    return fail("Could not reach GitHub to complete the login.");
  }

  return page(`
    (function () {
      var payload = ${JSON.stringify(JSON.stringify({ token, provider: "github" }))};
      function send(e) {
        window.opener.postMessage('authorization:github:success:' + payload, e.origin);
        window.removeEventListener('message', send, false);
      }
      window.addEventListener('message', send, false);
      window.opener.postMessage('authorizing:github', '*');
    })();
  `);
};

const fail = (message) => page(`
  document.body.textContent = ${JSON.stringify(message)};
  if (window.opener) window.opener.postMessage('authorization:github:error:' + ${JSON.stringify(JSON.stringify({ message }))}, '*');
`, 400);

const page = (script, statusCode = 200) => ({
  statusCode,
  headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  body: `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Signing in…</title></head>
<body style="font:16px/1.5 system-ui;padding:2rem">Signing in…<script>${script}</script></body></html>`,
});
