export const config = { runtime: 'nodejs' };

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buf = Buffer.concat(chunks);
  return buf.toString('utf8');
}

const jsonOk = (obj = {}) =>
  new Response(JSON.stringify(obj), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const jsonErr = (msg, code = 400) =>
  new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return jsonErr('Only POST allowed', 405);

    let body;
    try {
      const text = await readBody(req);
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('[ST] invalid json body', e);
      return jsonErr('invalid json');
    }

    const lc = body?.lifecycle;
    if (!lc) return jsonErr('lifecycle missing');
    console.log('[ST] lifecycle:', lc);

      const phase = body?.configurationData?.phase;
      console.log('[ST] CONFIGURATION phase:', phase);

      if (phase === 'INITIALIZE') {
        const resp = {
          configurationData: {
            initialize: {
              id: 'designsup-app',                 // 임의 식별자
              name: 'Designsup SmartApp',          // 표시 이름
              description: 'Designsup automation', // (옵션) 설명
              firstPageId: 'mainPage',             // 반드시 문자열
              permissions: [                       // 프로젝트 Scopes의 부분집합
                'r:devices:*',
                'x:devices:*',
                'r:scenes:*',
              ],
              disableCustomDisplayName: false,
              disableRemoveApp: false,
            },
          },
        };
        console.log('[ST] INITIALIZE resp:', JSON.stringify(resp));
        return jsonOk(resp);
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
        return jsonOk(resp);
      }

      return jsonOk({});
    }

      const url = body?.confirmationData?.confirmationUrl;
      if (!url) return jsonErr('confirmationUrl missing');
      try {
        const r = await fetch(url, { method: 'GET' });
        console.log('[ST] confirmationUrl status:', r.status);
        return jsonOk({});
      } catch (e) {
        console.error('[ST] confirmation fetch failed', e);
        return jsonErr('confirmation fetch failed', 500);
      }
    }

    if (lc === 'INSTALL') {
      console.log('[ST] INSTALL:', JSON.stringify(body.installData || {}));
      return jsonOk({});
    }
    if (lc === 'UPDATE') {
      console.log('[ST] UPDATE:', JSON.stringify(body.updateData || {}));
      return jsonOk({});
    }
    if (lc === 'UNINSTALL') {
      console.log('[ST] UNINSTALL:', JSON.stringify(body.uninstallData || {}));
      return jsonOk({});
    }
    if (lc === 'EVENT') {
      console.log('[ST] EVENT:', JSON.stringify(body.eventData || {}));
      return jsonOk({});
    }
    if (lc === 'OAUTH_CALLBACK') {
      console.log('[ST] OAUTH_CALLBACK:', JSON.stringify(body.oauthCallbackData || {}));
      return jsonOk({});
    }

    console.warn('[ST] unsupported lifecycle:', lc);
    return jsonOk({});
  } catch (e) {
    console.error('[ST] handler error', e);
    return jsonErr('internal error', 500);
  }
}
