const { URL } = require('url');

function readJson(req) {
  return new Promise((resolve, reject) => {
    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (!ct.startsWith('application/json')) {
      return reject(new Error(`Unsupported content-type: ${ct}`));
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        const obj = raw ? JSON.parse(raw) : {};
        resolve({ obj, raw });
      } catch (e) {
        e.raw = raw;
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, obj, code = 200) {
  const json = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(json) });
  res.end(json);
}

function initializePayload() {
  return {
    initialize: {
      id: 'config1',
      name: 'designsup',
      firstPageId: 'page1',
    },
  };
}

function pagePayload() {
  return {
    page: {
      pageId: 'page1',
      name: 'Setup Page',
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
  try {
    if (req.method !== 'POST') {
      return sendJSON(res, { error: 'Only POST allowed' }, 405);
    }

    const { obj: body, raw } = await readJson(req).catch((err) => {
      console.error('[ST] JSON parse error:', err.message, 'raw preview:', String(err.raw || '').slice(0, 200));
      throw new Error('invalid json');
    });

    const lifecycle = body.lifecycle;
    console.log('[ST] lifecycle:', lifecycle);

    if (lifecycle === 'CONFIRMATION') {
      const url = body?.confirmationData?.confirmationUrl;
      console.log('[ST] confirmation url:', url);
      return sendJSON(res, { targetUrl: url || '' });
    }

    if (lifecycle === 'CONFIGURATION') {
      const phase = body?.configurationData?.phase || 'INITIALIZE';
      console.log('[ST] CONFIGURATION phase:', phase);

      if (phase === 'INITIALIZE') {
        return sendJSON(res, initializePayload());
      }

      if (phase === 'PAGE') {
        const pageId = body?.configurationData?.pageId || 'page1';
        console.log('[ST] CONFIGURATION pageId:', pageId);
        return sendJSON(res, pagePayload());
      }

      return sendJSON(res, initializePayload());
    }

    if (lifecycle === 'INSTALL') {
      const installedAppId = body?.installData?.installedApp?.installedAppId;
      const devices = body?.installData?.installedApp?.config?.switches || [];
      console.log('[ST] INSTALL', installedAppId, 'devices:', devices.length);
      return sendJSON(res, { status: 'installed', devices });
    }

    if (lifecycle === 'UNINSTALL') {
      const installedAppId = body?.uninstallData?.installedApp?.installedAppId;
      console.log('[ST] UNINSTALL', installedAppId);
      return sendJSON(res, { status: 'uninstalled' });
    }

    console.warn('[ST] unknown lifecycle, raw:', raw?.slice(0, 200));
    return sendJSON(res, { error: 'unknown lifecycle' }, 400);
  } catch (e) {
    console.error('[ST] handler error:', e);
    return sendJSON(res, { error: e.message || 'internal error' }, 500);
  }
};
