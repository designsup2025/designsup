'use strict';

const { getCollection } = require('./_db');

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj ?? {}));
}
const ok  = (res, obj) => send(res, 200, obj);
const bad = (res, msg, code = 400) => send(res, code, { error: msg });

async function readJson(req) {
  const chunks = [];
  return await new Promise((resolve, reject) => {
    req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      try {
        let raw = Buffer.concat(chunks).toString('utf8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
        raw = raw.trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return bad(res, 'Only POST allowed', 405);

  let body;
  try { body = await readJson(req); }
  catch (e) { console.error('[ST] invalid json body', e); return bad(res, 'invalid json', 400); }

  const lifecycle = (body?.lifecycle || '').toUpperCase();
  console.log('[ST] lifecycle:', lifecycle);

  try {
    switch (lifecycle) {
      case 'CONFIRMATION': {
        const url = body?.confirmationData?.confirmationUrl;
        console.log('[ST] CONFIRMATION url:', url);
        return ok(res, { targetUrl: url || null });
      }

      case 'CONFIGURATION': {
        const phase = (body?.configurationData?.phase || '').toUpperCase();
        console.log('[ST] CONFIGURATION phase:', phase);

        if (phase === 'INITIALIZE') {
          return ok(res, {
            initialize: { id: 'config1', name: 'designsup', firstPageId: 'page1' },
          });
        }
        if (phase === 'PAGE') {
          const pageId = body?.configurationData?.pageId || 'page1';
          return ok(res, {
            page: {
              pageId,
              name: 'Setup Page',
              complete: true,
              sections: [{
                name: 'Select Devices',
                settings: [{
                  id: 'switches',
                  name: 'Choose switches',
                  description: 'Tap to select',
                  type: 'DEVICE',
                  required: true,
                  multiple: true,
                  capabilities: ['switch'],
                  permissions: ['r','x'],
                }],
              }],
            },
          });
        }
        return bad(res, 'unsupported configuration phase');
      }

      case 'INSTALL': {
        console.log('[ST] INSTALL');
        const installedApp = body?.installData?.installedApp;
        const installedAppId = installedApp?.installedAppId;
        const locationId     = installedApp?.locationId;
        const config         = installedApp?.config || {};
        const devices = (config.switches || [])
          .map(v => v?.deviceConfig?.deviceId)
          .filter(Boolean);

        if (!installedAppId) return bad(res, 'missing installedAppId', 400);

        const coll = await getCollection('installations');
        const now = new Date();
        await coll.updateOne(
          { installedAppId },
          {
            $set: {
              installedAppId,
              locationId: locationId || null,
              devices,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true }
        );

        return ok(res, { status: 'installed', devices: config.switches || [] });
      }

      case 'UPDATE': {
        console.log('[ST] UPDATE');
        return ok(res, { status: 'updated' });
      }

      case 'EVENT': {
        const events = body?.eventData?.events || [];
        console.log('[ST] EVENT count:', events.length);
        return ok(res, { status: 'event-received', count: events.length });
      }

      case 'UNINSTALL': {
        console.log('[ST] UNINSTALL');
        const installedAppId = body?.uninstallData?.installedApp?.installedAppId;
        if (installedAppId) {
          const coll = await getCollection('installations');
          await coll.deleteOne({ installedAppId });
        }
        return ok(res, { status: 'uninstalled' });
      }

      default:
        console.warn('[ST] unsupported lifecycle:', lifecycle);
        return bad(res, 'unsupported lifecycle', 400);
    }
  } catch (e) {
    console.error('[ST] handler error', e);
    return bad(res, 'internal error', 500);
  }
};
