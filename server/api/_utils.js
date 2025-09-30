async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => (s += c));
    req.on('end', () => {
      try { resolve(s ? JSON.parse(s) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj ?? {}));
}
function ok(res, obj) { send(res, 200, obj); }
function bad(res, msg, code = 400) { send(res, code, { error: msg }); }

function getSiteToken(site) {
  const key = `ST_PAT__${(site || process.env.ST_DEFAULT_SITE || '').toUpperCase()}`;
  const token = process.env[key];
  return token || null;
}

async function stFetch(path, token, init = {}) {
  const url = path.startsWith('http') ? path : `https://api.smartthings.com/v1${path}`;
  const headers = Object.assign({ Authorization: `Bearer ${token}` }, init.headers || {});
  const r = await fetch(url, { ...init, headers });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const info = typeof data === 'object' ? data : { data };
    const err = new Error(`ST ${r.status}`);
    err.status = r.status;
    err.info = info;
    throw err;
  }
  return data;
}

module.exports = { readJson, ok, bad, getSiteToken, stFetch };
