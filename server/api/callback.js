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
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

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

    const lifecycle = body.lifecycle;

    if (lifecycle === 'CONFIRMATION') {
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

    if (lifecycle === 'PING') {
      return res.status(200).json({ pingData: 'pong' });
    }

    if (lifecycle === 'INSTALL') {
      console.log('[ST] INSTALL:', JSON.stringify(body.installData || {}, null, 2));
      return res.status(200).json({});
    }

    if (lifecycle === 'UPDATE') {
      console.log('[ST] UPDATE:', JSON.stringify(body.updateData || {}, null, 2));
      return res.status(200).json({});
    }

    if (lifecycle === 'EVENT') {
      try {
        const events = body.eventData?.events || [];
        for (const evt of events) {
          console.log('[ST] EVENT:', JSON.stringify(evt, null, 2));
        }
      } catch (e) {
        console.error('[ST] EVENT parse error:', e);
      }
      return res.status(200).json({});
    }

    // 5) UNINSTALL (앱 제거)
    if (lifecycle === 'UNINSTALL') {
      console.log('[ST] UNINSTALL:', JSON.stringify(body.uninstallData || {}, null, 2));
      return res.status(200).json({});
    }

    console.log('[ST] Unhandled lifecycle:', lifecycle);
    return res.status(200).json({ message: `Unhandled lifecycle: ${lifecycle}` });
  } catch (err) {
    console.error('[ST] handler error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
}
