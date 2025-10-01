const { getCollection } = require('./_db');

function ok(res, body = {}) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify(body));
}
function bad(res, code = 400, msg = 'bad request') {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = code;
  res.end(JSON.stringify({ error: msg }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Only POST allowed' }));
  }

  let raw = '';
  await new Promise((resolve, reject) => {
    req.on('data', c => (raw += c));
    req.on('end', resolve);
    req.on('error', reject);
  });

  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return bad(res, 400, 'invalid json');
  }

  const { lifecycle } = body || {};
  console.info('[ST] lifecycle:', lifecycle);

  try {
    switch (lifecycle) {
      case 'CONFIRMATION': {
        const url = body?.confirmationData?.confirmationUrl;
        return ok(res, url ? { targetUrl: url } : {});
      }

      case 'CONFIGURATION': {
        const phase = body?.configurationData?.phase;
        console.info('[ST] CONFIGURATION phase:', phase);

        if (phase === 'INITIALIZE') {
          return ok(res, {
            initialize: { id: 'config1', name: 'designsup', firstPageId: 'page1' },
          });
        }

        if (phase === 'PAGE') {
          return ok(res, {
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
          });
        }

        return ok(res, {});
      }

      case 'INSTALL': {
        const installedApp = body?.installData?.installedApp;
        const devices = installedApp?.config?.switches || [];
        const doc = {
          installedAppId: installedApp?.installedAppId,
          locationId: installedApp?.locationId || null,
          devices,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const col = await getCollection('installations');
        await col.updateOne(
          { installedAppId: doc.installedAppId },
          { $set: doc },
          { upsert: true }
        );
        return ok(res, { status: 'installed', devices });
      }

      case 'UPDATE': {
        const installedApp = body?.updateData?.installedApp || body?.installData?.installedApp;
        const devices = installedApp?.config?.switches || [];
        const col = await getCollection('installations');
        await col.updateOne(
          { installedAppId: installedApp?.installedAppId },
          { $set: { devices, updatedAt: new Date() } },
          { upsert: true }
        );
        return ok(res, { status: 'updated' });
      }

      case 'UNINSTALL': {
        const installedAppId =
          body?.uninstallData?.installedApp?.installedAppId ||
          body?.installedApp?.installedAppId;
        const col = await getCollection('installations');
        if (installedAppId) await col.deleteOne({ installedAppId });
        console.info('[ST] UNINSTALL');
        return ok(res, { status: 'uninstalled' });
      }

      case 'EVENT': {
        return ok(res, { status: 'event-received' });
      }

      default:
        return ok(res, {});
    }
  } catch (e) {
    console.error('[ST] handler error', e);
    return bad(res, 500, e.message || 'internal error');
  }
};
