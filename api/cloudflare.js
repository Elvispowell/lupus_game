export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const CF_API_TOKEN = process.env.CF_API_TOKEN;
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return res.status(500).json({ error: 'CF_ACCOUNT_ID o CF_API_TOKEN non configurati' });
  }

  try {
    const { model, messages, max_tokens } = req.body;
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${model}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CF_API_TOKEN}`
        },
        body: JSON.stringify({ messages, max_tokens: max_tokens || 180 })
      }
    );
    const data = await response.json();
    const text = data?.result?.response || '';
    return res.status(response.status).json({
      choices: [{ message: { content: text } }]
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
