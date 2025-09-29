module.exports.config = { runtime: 'nodejs' };

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buf = Buffer.concat(chunks);
  return buf.toString('utf8');
}

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj ?? {}));
}

function ok(res, obj)  { sendJson(res, 200, obj); }
function bad(res, msg, code = 400) { sendJson(res, code, { error: msg }); }

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return bad(res, 'Only POST allowed', 405);

    let body;
    try {
      const text = await readBody(req);
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('[ST] invalid json body', e);
      return bad(res, 'invalid json');
    }

    const lc = body?.lifecycle;
    if (!lc) return bad(res, 'lifecycle missing');

    console.log('[ST] lifecycle:', lc);

    if (lc === 'CONFIGURATION') {
      const phase = body?.configurationData?.phase;
      console.log('[ST] CONFIGURATION phase:', phase);

      if (phase === 'INITIALIZE') {
        const resp = {
          configurationData: {
            initialize: {
              id: 'designsup-app',
              name: 'Designsup SmartApp',
              description: 'Designsup automation',
              firstPageId: 'mainPage',
              permissions: ['r:devices:*', 'x:devices:*', 'r:scenes:*'],
              disableCustomDisplayName: false,
              disableRemoveApp: false,
            },
          },
        };
        console.log('[ST] INITIALIZE resp:', JSON.stringify(resp));
        return ok(res, resp);
      }

      if (phase === 'PAGE') {
        const resp = {
          configurationData: {
            page: {
              pageId: 'mainPage',
              name: 'Setup Page',
              nextPageId: null,
              previousPageId: null,
              complete: true,
              sections: [
                {
                  name: 'Select Devices',
                  settings: [
                    {
                      id: 'switchDevices',
                      name: 'Choose switches',
                      description: 'Select switches to control',
                      type: 'DEVICE',
                      required: true,
                      multiple: true,
                      capabilities: ['switch'],
                      permissions: ['r', 'x'],
                    },
                  ],
                },
              ],
            },
          },
        };
        console.log('[ST] PAGE resp:', JSON.stringify(resp));
        return ok(res, resp);
      }

      return ok(res, {});
    }

    if (lc === 'CONFIRMATION') {
      const url = body?.confirmationData?.confirmationUrl;
      if (!url) return bad(res, 'confirmationUrl missing');
      try {
        const r = await fetch(url, { method: 'GET' });
        console.log('[ST] confirmationUrl status:', r.status);
        return ok(res, {});
      } catch (e) {
        console.error('[ST] confirmation fetch failed', e);
        return bad(res, 'confirmation fetch failed', 500);
      }
    }

    if (lc === 'INSTALL')    { console.log('[ST] INSTALL:', JSON.stringify(body.installData || {}));     return ok(res, {}); }
    if (lc === 'UPDATE')     { console.log('[ST] UPDATE:', JSON.stringify(body.updateData || {}));        return ok(res, {}); }
    if (lc === 'UNINSTALL')  { console.log('[ST] UNINSTALL:', JSON.stringify(body.uninstallData || {}));  return ok(res, {}); }
    if (lc === 'EVENT')      { console.log('[ST] EVENT:', JSON.stringify(body.eventData || {}));          return ok(res, {}); }
    if (lc === 'OAUTH_CALLBACK') {
      console.log('[ST] OAUTH_CALLBACK:', JSON.stringify(body.oauthCallbackData || {}));
      return ok(res, {});
    }

    console.warn('[ST] unsupported lifecycle:', lc);
    return ok(res, {});
  } catch (e) {
    console.error('[ST] handler error', e);
    return bad(res, 'internal error', 500);
  }
};
