export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    console.log('[ST] incoming lifecycle:', body.lifecycle);
    console.log('[ST] full body:', JSON.stringify(body));

    if (body.lifecycle === 'PING' && body.pingData?.challenge) {
      return res.status(200).json({ challenge: body.pingData.challenge });
    }

    if (body.lifecycle === 'CONFIRMATION' && body.confirmationData?.challenge) {
      return res.status(200).json({ challenge: body.confirmationData.challenge });
    }

    if (body.lifecycle === 'CONFIGURATION') {
      return res.status(200).json({
        configurationData: {
          initialize: {
            name: 'Designsup',
            description: 'Webhook SmartApp for aquarium controls',
            id: 'config-1',
            permissions: ['r:devices:*', 'x:devices:*'], // 필요한 권한만
            firstPageId: 'page-1'
          }
        }
      });
    }

    if (body.lifecycle === 'INSTALL') {
      return res.status(200).json({ installData: {} });
    }

    if (body.lifecycle === 'UPDATE') {
      return res.status(200).json({ updateData: {} });
    }

    if (body.lifecycle === 'UNINSTALL') {
      return res.status(200).json({ uninstallData: {} });
    }

    if (body.lifecycle === 'EVENT') {
      return res.status(200).json({ eventData: {} });
    }

    return res.status(400).json({ error: 'Unknown lifecycle' });
  } catch (e) {
    console.error('[ST] handler error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
