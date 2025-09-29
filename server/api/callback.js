exports.config = { runtime: 'nodejs' };

function sendJSON(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

exports.handler = async (req, res) => {
  try {
    const body = await parseBody(req);
    const { lifecycle } = body || {};
    console.log('[ST] lifecycle:', lifecycle);

    if (lifecycle === 'PING') {
      const pingData = body.pingData || {};
      return sendJSON(res, { pingData: { challenge: pingData.challenge } });
    }

    if (lifecycle === 'CONFIRMATION') {
      const { confirmationUrl } = body.confirmationData || {};
      console.log('[ST] confirmationUrl:', confirmationUrl);
      return sendJSON(res, { status: 'ok' });
    }

    if (lifecycle === 'CONFIGURATION') {
      const phase = body.configurationData?.phase;
      console.log('[ST] CONFIGURATION phase:', phase);

      if (phase === 'INITIALIZE') {
        return sendJSON(res, {
          configurationData: {
            initialize: {
              name: 'Designsup',
              description: '디자인숩의 자동화 시스템 제어 어플리케이션입니다.',
              firstPageId: 'main',
              permissions: [
                'r:devices:*',
                'x:devices:*',
                'r:locations:*',
                'r:scenes:*',
                'w:rules:*'
              ]
            }
          }
        });
      }

      if (phase === 'PAGE') {
        const pageId = body.configurationData?.pageId || 'main';
        return sendJSON(res, {
          configurationData: {
            page: {
              pageId,
              name: 'Setup Page',
              nextPageId: null,
              previousPageId: null,
              complete: true,
              sections: [
                {
                  name: 'Give this app a new display name',
                  settings: [
                    {
                      id: 'appName',
                      name: 'Name',
                      description: 'Optional',
                      type: 'TEXT',
                      required: false,
                      defaultValue: 'Designsup'
                    }
                  ]
                },
                {
                  name: 'Select Devices',
                  settings: [
                    {
                      id: 'switches',
                      name: 'Choose switches',
                      description: '(Optional) Select switches to control',
                      type: 'DEVICE',
                      required: false,
                      multiple: true,
                      capabilities: ['switch'],
                      permissions: ['r', 'x']
                    }
                  ]
                }
              ]
            }
          }
        });
      }

      console.warn('[ST] unsupported CONFIGURATION phase:', phase);
      return sendJSON(res, {
        configurationData: {
          page: {
            pageId: 'main',
            name: 'Setup Page',
            nextPageId: null,
            previousPageId: null,
            complete: true,
            sections: []
          }
        }
      });
    }

    if (lifecycle === 'INSTALL') {
      console.log('[ST] INSTALL:', JSON.stringify(body, null, 2));
      return sendJSON(res, { installData: {} });
    }

    if (lifecycle === 'UPDATE') {
      console.log('[ST] UPDATE:', JSON.stringify(body, null, 2));
      return sendJSON(res, { updateData: {} });
    }

    if (lifecycle === 'UNINSTALL') {
      console.log('[ST] UNINSTALL:', JSON.stringify(body, null, 2));
      return sendJSON(res, { uninstallData: {} });
    }

    if (lifecycle === 'EVENT') {
      return sendJSON(res, { eventData: {} });
    }

    console.warn('[ST] unsupported lifecycle:', lifecycle);
    return sendJSON(res, { status: 'ignored' });
  } catch (err) {
    console.error('[ST] handler error:', err);
    return sendJSON(res, { error: 'internal_error' }, 500);
  }
};

exports.default = exports.handler;
