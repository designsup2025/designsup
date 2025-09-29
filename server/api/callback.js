export const config = {
  runtime: 'nodejs',
};

const ok = (extra = {}) =>
  new Response(JSON.stringify(extra), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const bad = (msg, code = 400) =>
  new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return bad('Only POST allowed', 405);
    }

    let body = req.body;
    if (!body) {
      try {
        const text = await new Response(req.body).text();
        body = JSON.parse(text);
      } catch (e) {
        console.error('[ST] invalid json body', e);
        return bad('invalid json');
      }
    }

    if (!body || !body.lifecycle) {
      console.warn('[ST] lifecycle missing');
      return bad('lifecycle missing');
    }

    const lc = body.lifecycle;
    console.log(`[ST] lifecycle: ${lc}`);

    if (lc === 'CONFIRMATION') {
      const url = body.confirmationData?.confirmationUrl;
      if (!url) return bad('confirmationUrl missing');

      try {
        const res = await fetch(url, { method: 'GET' });
        console.log('[ST] confirmationUrl status:', res.status);
        return ok();
      } catch (e) {
        console.error('[ST] confirmation fetch failed', e);
        return bad('confirmation fetch failed', 500);
      }
    }

    if (lc === 'INSTALL') {
      console.log('[ST] INSTALL payload:', JSON.stringify(body.installData || {}));
      return ok({});
    }

    if (lc === 'UPDATE') {
      console.log('[ST] UPDATE payload:', JSON.stringify(body.updateData || {}));
      return ok({});
    }

    if (lc === 'UNINSTALL') {
      console.log('[ST] UNINSTALL payload:', JSON.stringify(body.uninstallData || {}));
      return ok({});
    }

    if (lc === 'EVENT') {
      console.log('[ST] EVENT payload:', JSON.stringify(body.eventData || {}));
      return ok({});
    }

    if (lc === 'OAUTH_CALLBACK') {
      console.log('[ST] OAUTH_CALLBACK payload:', JSON.stringify(body.oauthCallbackData || {}));
      return ok({});
    }

    console.warn('[ST] unsupported lifecycle:', lc);
    return ok({});
  } catch (err) {
    console.error('[ST] handler error', err);
    return bad('internal error', 500);
  }
}
