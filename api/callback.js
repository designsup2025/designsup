'use strict';

const { readJson, ok, bad } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return bad(res, 'Only POST allowed', 405);

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    console.error('[ST] invalid json body', e);
    return bad(res, 'invalid json', 400);
  }

  const lifecycle = (body?.lifecycle || '').toUpperCase();
  console.log('[ST] lifecycle:', lifecycle);

  try {
    switch (lifecycle) {
      case 'CONFIRMATION': {
        const url = body?.confirmationData?.confirmationUrl;
        console.log('[ST] CONFIRMATION url:', url);
        return ok(res, {});
      }

      case 'CONFIGURATION': {
        const phase = (body?.configurationData?.phase || '').toUpperCase();
        console.log('[ST] CONFIGURATION phase:', phase);

        if (phase === 'INITIALIZE') {
          return ok(res, {
            initialize: {
              id: 'config1',
              name: process.env.ST_CLIENT_NAME || 'designsup',
              firstPageId: 'page1',
            },
          });
        }

        if (phase === 'PAGE') {
          const pageId = body?.configurationData?.pageId || 'page1';
          return ok(res, {
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
                      description: 'Tap to select',
                      type: 'DEVICE',
                      required: true,
                      multiple: true,
                      capabilities: ['switch'],
                      permissions: ['r','x'],
                    },
                  ],
                },
              ],
            },
          });
        }

        return bad(res, 'unsupported configuration phase');
      }

      case 'INSTALL': {
        console.log('[ST] INSTALL');
        // TODO: body.installData.installedApp.config 에서 선택된 디바이스 ID 읽어 저장
        return ok(res, {});
      }

      case 'UPDATE': {
        console.log('[ST] UPDATE');
        return ok(res, {});
      }

      case 'EVENT': {
        console.log('[ST] EVENT count:', body?.events?.length || 0);
        return ok(res, {});
      }

      case 'UNINSTALL': {
        console.log('[ST] UNINSTALL');
        return ok(res, {});
      }

      default:
        console.warn('[ST] unsupported lifecycle:', lifecycle);
        return bad(res, 'unsupported lifecycle');
    }
  } catch (e) {
    console.error('[ST] handler error', e);
    return bad(res, 'internal error', 500);
  }
};
