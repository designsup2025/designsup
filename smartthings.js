import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { lifecycle, pingData, confirmationData } = req.body || {};

  try {
    switch (lifecycle) {
      case 'CONFIRMATION': {
        const url = confirmationData?.confirmationUrl;
        if (!url) return res.status(400).send('Missing confirmationUrl');
        // SmartThings가 준 확인 URL을 서버가 직접 GET
        await axios.get(url);
        return res.status(200).send('OK');
      }

      case 'PING': {
        return res.status(200).json({ pingData }); // 그대로 돌려주기
      }

      default:
        return res.status(200).send('OK');
    }
  } catch (e) {
    console.error(e?.response?.status, e?.response?.data || e.message);
    return res.status(500).send('Error');
  }
}
