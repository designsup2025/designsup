export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {
  if (req.method === "POST" && req.body?.lifecycle === "PING") {
    const ping = req.body.pingData ?? "pong";
    return res.status(200).json({ pingData: ping });
  }

  return res.status(200).json({ ok: true });
}
