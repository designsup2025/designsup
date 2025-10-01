'use strict';

function log(...args) { try { console.log(...args); } catch {} }
function err(...args) { try { console.error(...args); } catch {} }

async function readJson(req) {
  const chunks = [];
  return await new Promise((resolve, reject) => {
    req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      try {
        let raw = Buffer.concat(chunks).toString('utf8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // BOM 제거
        raw = raw.trim();

        log('[DBG] content-type:', req.headers['content-type'] || '(none)');
        log('[DBG] raw length:', raw.length);
        log('[DBG] raw preview:', raw.slice(0, 180));

        if (!raw) return resolve({});
        const obj = JSON.parse(raw);
        resolve(obj);
      } catch (e) {
        err('[DBG] JSON parse error:', e?.message);
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj ?? {}));
}
const ok  = (res, obj) => send(res, 200, obj);
const bad = (res, msg, code = 400) => send(res, code, { error: msg });

module.exports = { readJson, ok, bad };
