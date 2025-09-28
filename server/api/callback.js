export default function handler(req, res) {
  const body = req.body;

  console.log("[ST] full body:", body);

  if (!body || !body.lifecycle) {
    return res.status(400).json({ error: "Invalid request" });
  }

  switch (body.lifecycle) {
    case "CONFIRMATION":
      return res.json({
        confirmationResponse: {
          confirmationKey: body.confirmationRequest.confirmationKey
        }
      });

    case "PING":
      return res.json({ pingData: "pong" });

    default:
      return res.status(200).json({ message: "Unhandled lifecycle" });
  }
}
