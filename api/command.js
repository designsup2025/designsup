const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { ok, error } = require('./_utils');

const INSTALL_FILE = path.join(__dirname, 'install.json');

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

    const { deviceId, command } = body;
    if (!deviceId || !command) {
      return error(res, 'deviceId and command required');
    }

    const installedDevices = loadInstalledDevices();
    const targetDevice = installedDevices.find(d => d.deviceConfig.deviceId === deviceId);
    if (!targetDevice) {
      return error(res, 'device not registered');
    }

    const resp = await fetch(`https://api.smartthings.com/v1/devices/${deviceId}/commands`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        commands: [
          {
            component: 'main',
            capability: 'switch',
            command: command
          }
        ]
      })
    });

    const data = await resp.json();
    return ok(res, { status: 'command_sent', response: data });
  } catch (err) {
    console.error('[ST] command error:', err);
    return error(res, err.message || 'internal error');
  }
};
