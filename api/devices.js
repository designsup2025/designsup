const { ok, bad, getSiteToken, stFetch } = require('./_utils');

exports.config = { runtime: 'nodejs18.x' };

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const site = url.searchParams.get('site') || process.env.ST_DEFAULT_SITE;
    const capability = url.searchParams.get('capability'); // 예: 'switch'

    const token = getSiteToken(site);
    if (!token) return bad(res, `invalid site or token missing: ${site}`);

    const data = await stFetch('/devices', token);
    let items = Array.isArray(data.items) ? data.items : [];

    if (capability) {
      items = items.filter(d =>
        (d.components || []).some(c =>
          (c.capabilities || []).some(cap => cap.id === capability)
        )
      );
    }

    const devices = items.map(d => ({
      id: d.deviceId,
      name: d.label || d.name,
      room: d.roomName || null,
      type: d.deviceTypeName || null,
      components: d.components?.map(c => ({
        id: c.id,
        capabilities: (c.capabilities || []).map(cap => cap.id)
      })) || []
    }));

    return ok(res, { site, count: devices.length, devices });
  } catch (e) {
    console.error('[API devices] error:', e);
    return bad(res, e.message || 'failed', e.status || 500);
  }
};
