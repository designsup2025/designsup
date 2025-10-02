const crypto = require("crypto");
const { URLSearchParams } = require("url");

function b64urlToBuffer(b64url) {
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((2 - (b64url.length * 3) % 4) % 4);
  return Buffer.from(base64, "base64");
}

function decodeJWT(token) {
  const [h, p] = token.split(".");
  const payload = JSON.parse(b64urlToBuffer(p).toString("utf8"));
  return payload;
}

function verifyJWT(token, secret) {
  const [h, p, s] = token.split(".");
  const data = `${h}.${p}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  if (s !== sig) throw new Error("invalid_signature");
  const payload = JSON.parse(b64urlToBuffer(p).toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("token_expired");
  return payload;
}

function signJWT(payload, secret, expiresInSec) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSec, ...payload };
  const h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const p = Buffer.from(JSON.stringify(body)).toString("base64url");
  const data = `${h}.${p}`;
  const s = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${s}`;
}

async function readBody(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks).toString("utf8");
}

function parseForm(body) {
  const params = new URLSearchParams(body);
  const o = {};
  for (const [k, v] of params.entries()) o[k] = v;
  return o;
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) return null;
  const raw = Buffer.from(header.slice(6), "base64").toString("utf8");
  const idx = raw.indexOf(":");
  if (idx < 0) return null;
  return { client_id: raw.slice(0, idx), client_secret: raw.slice(idx + 1) };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.json({ error: "method_not_allowed" });
    }

    const raw = await readBody(req);
    const ct = (req.headers["content-type"] || "").toLowerCase();
    const data = ct.includes("application/json") ? JSON.parse(raw || "{}") : parseForm(raw);

    const basic = parseBasicAuth(req.headers.authorization);
    const client_id = basic?.client_id || data.client_id;
    const client_secret = basic?.client_secret || data.client_secret;

    if (client_id !== process.env.SMARTTHINGS_CLIENT_ID || client_secret !== process.env.SMARTTHINGS_CLIENT_SECRET) {
      res.statusCode = 401;
      return res.json({ error: "invalid_client" });
    }

    const grantType = data.grant_type;

    if (grantType === "authorization_code") {
      const code = data.code;
      const redirectUri = data.redirect_uri;

      if (!code || !redirectUri) {
        res.statusCode = 400;
        return res.json({ error: "invalid_request" });
      }

      const payload = verifyJWT(code, process.env.OAUTH_SIGNING_SECRET);
      if (payload.type !== "auth_code") throw new Error("invalid_code");
      if (payload.aud !== client_id) throw new Error("mismatched_client");
      if (payload.redirect_uri !== redirectUri) throw new Error("mismatched_redirect_uri");

      const access = signJWT(
        {
          type: "access",
          scope: payload.scope || "default",
          sub: payload.sub,
          aud: client_id,
        },
        process.env.OAUTH_SIGNING_SECRET,
        3600 // 1h
      );

      const refresh = signJWT(
        {
          type: "refresh",
          sub: payload.sub,
          aud: client_id,
        },
        process.env.OAUTH_SIGNING_SECRET,
        60 * 60 * 24 * 30 // 30d
      );

      res.statusCode = 200;
      return res.json({
        token_type: "bearer",
        access_token: access,
        expires_in: 3600,
        refresh_token: refresh,
        scope: payload.scope || "default",
      });
    }

    if (grantType === "refresh_token") {
      const rt = data.refresh_token;
      if (!rt) {
        res.statusCode = 400;
        return res.json({ error: "invalid_request" });
      }
      const rPayload = verifyJWT(rt, process.env.OAUTH_SIGNING_SECRET);
      if (rPayload.type !== "refresh") throw new Error("invalid_refresh_token");
      if (rPayload.aud !== client_id) throw new Error("mismatched_client");

      const access = signJWT(
        {
          type: "access",
          sub: rPayload.sub,
          aud: client_id,
        },
        process.env.OAUTH_SIGNING_SECRET,
        3600
      );

      res.statusCode = 200;
      return res.json({
        token_type: "bearer",
        access_token: access,
        expires_in: 3600,
      });
    }

    res.statusCode = 400;
    return res.json({ error: "unsupported_grant_type" });
  } catch (e) {
    console.error("[OAUTH][token] error:", e);
    res.statusCode = 400;
    return res.json({ error: "invalid_grant", detail: e.message });
  }
};
