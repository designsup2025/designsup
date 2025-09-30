'use strict';

const https = require('https');
const { readJson, ok, bad } = require('./_utils');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => resolve({ status: res.statusCode || 0 }));
    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return bad(res, 'Only POST allowed', 405);

    const body = await readJson(req);
    const lc = body?.lifecycle;
    if (!lc) return bad(res, 'lifecycle missing');
    console.log('[ST] lifecycle:', lc);

    if (lc === 'PING') {
      return ok(res, { pingData: body.pingData || {} });
    }

    if (lc === 'CONFIRMATION') {
      const url = body?.confirmationData?.confirmationUrl;
      if (!url) return bad(res, 'confirmationUrl missing');
      try {
        const r = await httpGet(url);
        console.log('[ST] confirmationUrl status:', r.status);
        return ok(res, { result: 'confirmation succeeded', status: r.status });
      } catch (e) {
        console.error('[ST] confirmation fetch failed', e);
        return bad(res, 'confirmation fetch failed', 500);
      }
    }

    if (lc === 'CONFIGURATION') {
      const phase = body?.configurationData?.phase || body?.phase;
      console.log('[ST] CONFIGURATION phase:', phase);

      if (phase === 'INITIALIZE') {
        return ok(res, {
          configurationData: {
            initialize: {
              name: process.env.ST_CLIENT_NAME || 'Designsup',
              description: `디자인숩 자동화 SmartApp${process.env.ST_PUBLIC_URL ? ` (${process.env.ST_PUBLIC_URL})` : ''}`,
              firstPageId: 'main',
              permissions: ['r:devices:*', 'x:devices:*', 'r:scenes:*'],
              disableCustomDisplayName: false,
              disableRemoveApp: false,
            },
          },
        });
      }

      if (phase === 'PAGE') {
        const pageId = body?.configurationData?.pageId || 'main';
        return ok(res, {
          configurationData: {
            page: {
              pageId,
              name: 'Setup Page',
              nextPageId: null,
              previousPageId: null,
              complete: true,
              sections: [
                {
                  name: 'Select Devices',
                  settings: [
                    {
                      id: 'switches',
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
        });
      }

      return ok(res, {
        configurationData: {
          page: { pageId: 'main', name: 'Setup', complete: true, sections: [] },
        },
      });
    }

    if (lc === 'INSTALL')    { console.log('[ST] INSTALL');    return ok(res, { installData: {} }); }
    if (lc === 'UPDATE')     { console.log('[ST] UPDATE');     return ok(res, { updateData: {} }); }
    if (lc === 'UNINSTALL')  { console.log('[ST] UNINSTALL');  return ok(res, { uninstallData: {} }); }
    if (lc === 'EVENT')      { console.log('[ST] EVENT');      return ok(res, { eventData: {} }); }

    console.warn('[ST] unsupported lifecycle:', lc);
    return ok(res, { status: 'ignored' });
  } catch (e) {
    console.error('[ST] handler error:', e);
    return bad(res, 'internal error', 500);
  }
};
