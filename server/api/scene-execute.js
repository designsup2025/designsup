const { readJson, ok, bad, getSiteToken, stFetch } = require('./_utils');

exports.config = { runtime: 'nodejs18.x' };

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return bad(res, 'Only POST allowed', 405);
    const { site, sceneId } = await readJson(req);

    if (!site || !sceneId) return bad(res, 'site, sceneId are required');

    const token = getSiteToken(site);
    if (!token) return bad(res, `invalid site or token missing: ${site}`);

    const data = await stFetch(`/scenes/${sceneId}/execute`, token, { method: 'POST' });
    return ok(res, { site, sceneId, result: data });
  } catch (e) {
    console.error('[API scene-execute] error:', e);
    return bad(res, e.message || 'failed', e.status || 500);
  }
};
