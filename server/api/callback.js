function findValueByKeys(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (keys.includes(key) && typeof val === 'string') return val;
    if (val && typeof val === 'object') {
      const found = findValueByKeys(val, keys);
      if (found) return found;
    }
  }
  return undefined;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {/* 그대로 유지 */}
    }

    console.log('[ST] headers:', req.headers);
    console.log('[ST] raw body:', typeof req.body);
    console.log('[ST] parsed body:', body);

    if (!body || !body.lifecycle) {
      console.warn('[ST] missing lifecycle');
      return res.status(400).json({ error: 'Invalid request: missing lifecycle' });
    }

    switch (body.lifecycle) {
      case 'CONFIRMATION': {
        const challenge = findValueByKeys(body, ['challenge', 'confirmationKey']);

        if (challenge) {
          console.log('[ST] confirmation value found:', challenge);
          return res.status(200).json({ confirmationData: { challenge } });
        }

        console.warn('[ST] confirmation not found in body ->', JSON.stringify(body));
        return res.status(400).json({ error: 'No confirmation key/challenge found' });
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
