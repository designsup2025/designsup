'use strict';

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (e) { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  const body = JSON.stringify(obj || {});
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

function log(...args) {
  console.log(...args);
}

function configurationInitialize() {
  return {
    initialize: {
      id: 'config1',
      name: 'designsup',
      firstPageId: 'page1',
    },
  };
}

function configurationPage() {
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
    const body = await readJson(req);

    const lifecycle = body.lifecycle;
    log('[ST] lifecycle:', lifecycle);

    if (lifecycle === 'CONFIRMATION') {
      const url = body?.confirmationData?.confirmationUrl;
      return send(res, 200, { targetUrl: url || 'OK' });
    }

    if (lifecycle === 'CONFIGURATION') {
      const phase = body?.configurationData?.phase;
      log('[ST] CONFIGURATION phase:', phase);

      if (phase === 'INITIALIZE') {
        return send(res, 200, configurationInitialize());
      }

      if (phase === 'PAGE') {
        const pageId = body?.configurationData?.pageId;
        if (pageId === 'page1') {
          return send(res, 200, configurationPage());
        }
        return send(res, 200, configurationPage()); // 기본 동일 페이지 반환
      }

      return send(res, 200, configurationInitialize());
    }

    if (lifecycle === 'INSTALL') {
      const installedAppId = body?.installData?.installedApp?.installedAppId;
      const selected = body?.installData?.installedApp?.config?.switches || [];
      log('[ST] INSTALL installedAppId:', installedAppId, 'devices:', selected.length);

      return send(res, 200, { status: 'installed', devices: selected });
    }

    if (lifecycle === 'UPDATE') {
      const installedAppId = body?.updateData?.installedApp?.installedAppId;
      const selected = body?.updateData?.installedApp?.config?.switches || [];
      log('[ST] UPDATE installedAppId:', installedAppId, 'devices:', selected.length);
      return send(res, 200, { status: 'updated', devices: selected });
    }

    if (lifecycle === 'UNINSTALL') {
      const installedAppId = body?.uninstallData?.installedApp?.installedAppId;
      log('[ST] UNINSTALL', installedAppId);
      return send(res, 200, { status: 'uninstalled' });
    }

    if (lifecycle === 'EVENT') {
      log('[ST] EVENT', JSON.stringify(body?.eventData || {}));
      return send(res, 200, { status: 'event-ack' });
    }

    log('[ST] unknown lifecycle:', lifecycle);
    return send(res, 400, { error: 'unknown lifecycle' });

  } catch (e) {
    console.error('[ST] handler error', e);
    return send(res, 500, { error: e.message || 'internal error' });
  }
};
