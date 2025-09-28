export default function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    console.log('[ST] headers:', req.headers);
    console.log('[ST] full body:', body);

    if (!body || !body.lifecycle) {
      return res.status(400).json({ error: 'Invalid request: missing lifecycle' });
    }

    switch (body.lifecycle) {
      case 'CONFIRMATION': {
        // Webhook SmartApp: confirmationData.challenge
        const challenge = body?.confirmationData?.challenge;

        const confirmationKey =
          body?.confirmationRequest?.confirmationKey ||
          body?.confirmationData?.confirmationKey;

        if (challenge) {
          console.log('[ST] Responding with challenge');
          return res.status(200).json({ confirmationData: { challenge } });
        }
        if (confirmationKey) {
          console.log('[ST] Responding with confirmationKey');
          return res.status(200).json({ confirmationResponse: { confirmationKey } });
        }

        console.warn('[ST] confirmation not found in body');
        return res.status(400).json({ error: 'No confirmationData.challenge or confirmationKey found' });
      }

      case 'PING':
        return res.status(200).json({ pingData: 'pong' });

      default:
        console.log('[ST] Unhandled lifecycle:', body.lifecycle);
        return res.status(200).json({ message: 'Unhandled lifecycle' });
    }
  } catch (err) {
    console.error('[ST] handler error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
}
