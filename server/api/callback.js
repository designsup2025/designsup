export const config = { runtime: 'nodejs18.x' }; // (명시 optional)

export default async function handler(req, res) {
  if (req.method === 'POST' && req.body && req.body.lifecycle === 'PING') {
    const ping = req.body.pingData ?? req.body.pingData?.challenge ?? 'pong';
    return res.status(200).json({ pingData: ping });
  }

  return res.status(200).json({ ok: true });
}
