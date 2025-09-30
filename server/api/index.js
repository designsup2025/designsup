export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const path = url.pathname.replace(/^\/api/, ''); // '/api' 프리픽스 제거

    const CLIENT_ID = 154750f6-8d11-47de-bb75-8c8f00c15904;
    const CLIENT_SECRET = 154750f6-8d11-47de-bb75-8c8f00c15904;
    const BASE_URL = https://designsup.vercel.app;

    const AUTH_URL  = 'https://auth-global.api.smartthings.com/oauth/authorize';
    const TOKEN_URL = 'https://auth-global.api.smartthings.com/oauth/token';
    const API_BASE  = 'https://api.smartthings.com/v1';

    if (path === '/' || path === '') {
      res.statusCode = 200;
      return res.end('OK');
    }

    if (path === '/login') {
      const appRedirect = url.searchParams.get('redirect') || 'designsup://oauth2redirect';
      const state = encodeURIComponent(appRedirect);

      const authorize = new URL(AUTH_URL);
      authorize.searchParams.set('response_type', 'code');
      authorize.searchParams.set('client_id', CLIENT_ID);
      authorize.searchParams.set('redirect_uri', `${BASE_URL}/api/callback`);
      authorize.searchParams.set('scope', 'r:devices:* x:devices:* r:locations:*');
      authorize.searchParams.set('state', state);

      res.statusCode = 302;
      res.setHeader('Location', authorize.toString());
      return res.end();
    }

    if (path === '/callback') {
      const code = url.searchParams.get('code');
      const state = decodeURIComponent(url.searchParams.get('state') || 'designsup://oauth2redirect');

      if (!code) {
        res.statusCode = 400;
        return res.end('Missing code');
      }

      const tokenResp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri: `${BASE_URL}/api/callback`,
        }),
      });

      const token = await tokenResp.json();

      if (!token.access_token) {
        res.statusCode = 400;
        return res.end(`Token error: ${JSON.stringify(token)}`);
      }

      const deepLink = new URL(state);
      deepLink.searchParams.set('access_token', token.access_token);
      deepLink.searchParams.set('refresh_token', token.refresh_token || '');

      res.statusCode = 302;
      res.setHeader('Location', deepLink.toString());
      return res.end();
    }

    if (path === '/me/devices') {
      const token = url.searchParams.get('token');
      if (!token) {
        res.statusCode = 400;
        return res.end('token query required');
      }
      const r = await fetch(`${API_BASE}/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await r.json();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.statusCode = 200;
      return res.end(JSON.stringify(json));
    }

    res.statusCode = 404;
    return res.end('Not Found');
  } catch (e) {
    res.statusCode = 500;
    return res.end(String(e));
  }
}
