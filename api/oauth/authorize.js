const crypto = require("crypto");
const { URL } = require("url");

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJWT(payload, secret, expiresInSec = 300) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSec, ...payload };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${sig}`;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.statusCode = 405;
      return res.json({ error: "method_not_allowed" });
    }

    const url = new URL(req.url, "https://dummy.local");
    const clientId = url.searchParams.get("client_id");
    const redirectUri = url.searchParams.get("redirect_uri");
    const responseType = url.searchParams.get("response_type");
    const scope = url.searchParams.get("scope") || "default";
    const state = url.searchParams.get("state") || "";

    if (!clientId || !redirectUri || responseType !== "code") {
      res.statusCode = 400;
      return res.json({ error: "invalid_request" });
    }

    if (clientId !== process.env.SMARTTHINGS_CLIENT_ID) {
      res.statusCode = 401;
      return res.json({ error: "invalid_client" });
    }

    const code = signJWT(
      {
        type: "auth_code",
        aud: clientId,
        scope,
        redirect_uri: redirectUri,
        sub: "designsup-user",
      },
      process.env.OAUTH_SIGNING_SECRET,
      300 // 5분 유효
    );

    const redirect = new URL(redirectUri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);

    res.statusCode = 302;
    res.setHeader("Location", redirect.toString());
    return res.end();
  } catch (e) {
    console.error("[OAUTH][authorize] error:", e);
    res.statusCode = 500;
    return res.json({ error: "server_error" });
  }
};
