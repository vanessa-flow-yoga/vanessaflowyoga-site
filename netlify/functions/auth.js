// Step 1 of the GitHub login: send the editor's popup window to GitHub.
// The client secret is never used here, and never leaves Netlify's settings.

const CALLBACK = "https://vanessaflowyoga.co.uk/oauth/callback";

exports.handler = async () => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return { statusCode: 500, body: "GITHUB_CLIENT_ID is not set in the Netlify site settings." };
  }
  // Random value echoed back by GitHub, so we can tell a real reply from a forged one.
  const state = [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", CALLBACK);
  url.searchParams.set("scope", "repo");
  url.searchParams.set("state", state);

  return {
    statusCode: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": `vfy_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      "Cache-Control": "no-store",
    },
    body: "",
  };
};
