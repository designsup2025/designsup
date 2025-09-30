const { readJson, ok, bad, getSiteToken, stFetch } = require('./_utils');

exports.config = { runtime: 'nodejs18.x' };

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return bad(res, 'Only POST allowed', 405);
    const { site, deviceId, command, component, capability } = await readJson(req);

    if (!site || !deviceId || !command)
      return bad(res, 'site, deviceId, command are required');

    const token = getSiteToken(site);
    if (!token) return bad(res, `invalid site or token missing: ${site}`);

    const cap = capability || 'switch';
    const comp = component || 'main';
    const cmd = (command || '').toLowerCase() === 'on' ? 'on' : 'off';

    const payload = {
      commands: [{
        component: comp,
        capability: cap,
        command: cmd
      }]
    };

    const data = await stFetch(`/devices/${deviceId}/commands`, token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return ok(res, { site, deviceId, result: data });
  } catch (e) {
    console.error('[API command] error:', e);
    return bad(res, e.message || 'failed', e.status || 500);
  }
};
