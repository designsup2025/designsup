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
        const key =
          body?.confirmationRequest?.confirmationKey ||
          body?.confirmationData?.confirmationKey ||
          body?.verificationRequest?.verificationKey; // 일부 문서/환경에서 이런 이름도 씁니다

        if (!key) {
          console.warn('[ST] confirmation key not found in body:', body);
          return res.status(400).json({ error: 'confirmationKey not found' });
        }

        return res.status(200).json({
          confirmationResponse: { confirmationKey: key },
        });
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
