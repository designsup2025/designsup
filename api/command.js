'use strict';

const { getCollection } = require('./_db');

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj ?? {}));
}
const ok  = (res, obj) => send(res, 200, obj);
const bad = (res, msg, code = 400) => send(res, code, { error: msg });

async function readJson(req) {
  const chunks = [];
  return await new Promise((resolve, reject) => {
    req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8').trim() || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const ST_API = 'https://api.smartthings.com/v1';

async function stCommand({ token, deviceId, command, component = 'main', capability = 'switch' }) {
  const resp = await fetch(`${ST_API}/devices/${deviceId}/commands`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      component, capability, command, arguments: [],
    }]),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, data: text ? JSON.parse(text) : null, raw: text };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return bad(res, 'Only POST allowed', 405);

  let body;
  try { body = await readJson(req); }
  catch { return bad(res, 'invalid json', 400); }

  const installedAppId = body?.installedAppId;
  const deviceIdInput  = body?.deviceId;
  const command        = (body?.command || '').toLowerCase(); // 'on' | 'off'
  const component      = body?.component || 'main';
  const capability     = body?.capability || 'switch';

  if (!['on','off'].includes(command)) return bad(res, 'command must be on|off');

  const token = process.env.ST_ACCESS_TOKEN;
  if (!token) return bad(res, 'server missing ST_ACCESS_TOKEN', 500);

  let deviceId = deviceIdInput;

  if (!deviceId && installedAppId) {
    try {
      const coll = await getCollection();
      const doc = await coll.findOne({ installedAppId });
      if (!doc || !doc.devices || !doc.devices.length) {
        return bad(res, 'no devices saved for this installedAppId', 404);
      }
      deviceId = doc.devices[0];
    } catch (e) {
      console.error('[CMD] DB read error', e);
      return bad(res, 'db error', 500);
    }
  }

  if (!deviceId) return bad(res, 'deviceId or installedAppId required');

  try {
    const result = await stCommand({ token, deviceId, command, component, capability });
    if (!result.ok) {
      console.error('[CMD] ST error', result.status, result.raw);
      return bad(res, `smartthings ${result.status}`, result.status);
    }
    return ok(res, { ok: true, deviceId, command, st: result.data });
  } catch (e) {
    console.error('[CMD] error', e);
    return bad(res, 'internal error', 500);
  }
};
