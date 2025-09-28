function findValueByKeys(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (keys.includes(k) && typeof v === 'string') return v;
    if (v && typeof v === 'object') {
      const found = findValueByKeys(v, keys);
      if (found) return found;
    }
  }
  return undefined;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }

    console.log('[ST] headers:', req.headers);
    console.log('[ST] parsed body:', body);

    if (!body || !body.lifecycle) {
      console.warn('[ST] missing lifecycle');
      return res.status(400).json({ error: 'Invalid request: missing lifecycle' });
    }

    if (body.lifecycle === 'CONFIRMATION') {
      const challenge = findValueByKeys(body, ['challenge', 'confirmationKey']);
      if (challenge) {
        console.log('[ST] challenge found:', challenge);
        return res.status(200).json({ confirmationData: { challenge } });
      }

      const confirmationUrl = findValueByKeys(body, ['confirmationUrl', 'confirmationURL']);
      if (confirmationUrl) {
        console.log('[ST] confirmationUrl found:', confirmationUrl);
        try {
          const r = await fetch(confirmationUrl, { method: 'GET' });
          console.log('[ST] confirmationUrl status:', r.status);
          return res.status(200).json({ ok: true });
        } catch (e) {
          console.error('[ST] confirmationUrl fetch error:', e);
          return res.status(500).json({ error: 'confirmationUrl fetch failed' });
        }
      }

      console.warn('[ST] confirmation not found in body ->', JSON.stringify(body));
      return res.status(400).json({ error: 'No confirmation key/url found' });
    }

    if (body.lifecycle === 'PING') {
      return res.status(200).json({ pingData: 'pong' });
    }

    // 나중에 CONFIGURATION/INSTALL/UPDATE/EVENT 등 추가
    console.log('[ST] Unhandled lifecycle:', body.lifecycle);
    return res.status(200).json({ message: 'Unhandled lifecycle' });

  } catch (err) {
    console.error('[ST] handler error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
}
