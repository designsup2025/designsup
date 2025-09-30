const { readJson, ok, bad } = require('./_utils');

async function handleConfirmation(confirmationData) {
  const url = confirmationData?.confirmationUrl;
  if (!url) return;
  try {
    const r = await fetch(url, { method: 'POST' });
    console.log('[ST] confirmationUrl status:', r.status);
  } catch (e) {
    console.error('[ST] confirmation error', e);
  }
}

function initPage() {
  return {
    initialize: {
      id: 'config1',
      name: process.env.ST_CLIENT_NAME || 'Designsup',
      firstPageId: 'page1',
    },
  };
}

function buildConfigPage(pageId) {
  return {
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
              permissions: ['r', 'x'],
            },
          ],
        },
      ],
    },
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return bad(res, 'Only POST allowed', 405);
  }

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    console.error('[ST] invalid json', e);
    return bad(res, 'invalid json', 400);
  }

  const lifecycle = (body.lifecycle || '').toUpperCase();
  console.log('[ST] lifecycle:', lifecycle);

  try {
    switch (lifecycle) {
      case 'CONFIRMATION':
        await handleConfirmation(body.confirmationData);
        return ok(res, {});

      case 'CONFIGURATION': {
        const phase = (body.configurationData?.phase || '').toUpperCase();
        console.log('[ST] CONFIGURATION phase:', phase);

        if (phase === 'INITIALIZE') return ok(res, initPage());
        if (phase === 'PAGE') {
          const pageId = body.configurationData?.pageId || 'page1';
          return ok(res, buildConfigPage(pageId));
        }
        return ok(res, initPage());
      }

      case 'INSTALL':
        console.log('[ST] INSTALL');
        return ok(res, {});

      case 'UPDATE':
        console.log('[ST] UPDATE');
        return ok(res, {});

      case 'EVENT':
        console.log('[ST] EVENT count:', body.events?.length || 0);
        return ok(res, {});

      case 'UNINSTALL':
        console.log('[ST] UNINSTALL');
        return ok(res, {});

      default:
        console.warn('[ST] unsupported lifecycle:', lifecycle);
        return ok(res, {});
    }
  } catch (e) {
    console.error('[ST] handler error', e);
    return bad(res, 'internal error', 500);
  }
};
