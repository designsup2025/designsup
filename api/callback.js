const fs = require('fs');
const path = require('path');
const { ok, error } = require('./_utils');

const INSTALL_FILE = path.join(__dirname, 'install.json');

function saveInstalledDevices(devices) {
  try {
    fs.writeFileSync(INSTALL_FILE, JSON.stringify({ devices }, null, 2));
    console.log('[ST] Devices saved:', devices);
  } catch (err) {
    console.error('[ST] Failed to save devices:', err);
  }
}

function loadInstalledDevices() {
  try {
    if (fs.existsSync(INSTALL_FILE)) {
      const data = fs.readFileSync(INSTALL_FILE);
      return JSON.parse(data).devices || [];
    }
  } catch (err) {
    console.error('[ST] Failed to load devices:', err);
  }
  return [];
}

module.exports = async (req, res) => {
  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    await new Promise(resolve => req.on('end', resolve));
    body = JSON.parse(body);

    console.log('[ST] lifecycle:', body.lifecycle);

    switch (body.lifecycle) {
      case 'CONFIRMATION': {
        return ok(res, { targetUrl: body.confirmationData.confirmationUrl });
      }

      case 'CONFIGURATION': {
        const phase = body.configurationData.phase;
        console.log('[ST] CONFIGURATION phase:', phase);

        if (phase === 'INITIALIZE') {
          return ok(res, {
            initialize: {
              id: 'config1',
              name: 'designsup',
              firstPageId: 'page1'
            }
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
                      permissions: ['r', 'x']
                    }
                  ]
                }
              ]
            }
          });
        }
        break;
      }

      case 'INSTALL': {
        console.log('[ST] INSTALL');
        const installedApp = body.installData.installedApp;
        const devices = installedApp?.config?.switches || [];
        saveInstalledDevices(devices);
        return ok(res, { status: 'installed', devices });
      }

      case 'EVENT': {
        console.log('[ST] EVENT');
        const events = body.eventData?.events || [];
        console.log('[ST] events:', events);
        return ok(res, { status: 'event_received' });
      }

      case 'UNINSTALL': {
        console.log('[ST] UNINSTALL');
        saveInstalledDevices([]); // 제거 시 기기 초기화
        return ok(res, { status: 'uninstalled' });
      }

      default:
        console.log('[ST] unsupported lifecycle:', body.lifecycle);
        return error(res, 'unsupported lifecycle');
    }
  } catch (err) {
    console.error('[ST] handler error:', err);
    return error(res, err.message || 'internal error');
  }
};
