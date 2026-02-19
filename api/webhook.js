// api/webhook.js

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Set this in Vercel Dashboard
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  // 1. HANDLE VERIFICATION (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        // Vercel handles res.send(challenge) correctly, but 
        // res.end() ensures raw plain text is sent back.
        return res.status(200).send(challenge);
      } else {
        return res.status(403).end();
      }
    }
  }

  // 2. HANDLE MESSAGES (POST)
  if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'page') {
      body.entry.forEach((entry) => {
        const webhook_event = entry.messaging[0];
        console.log(webhook_event);
        // Process message logic here
      });
      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.status(404).end();
    }
  }

  // Fallback for other methods
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
