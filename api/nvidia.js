export const config = {
  maxDuration: 30,
};
 
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
 
  const NVIDIA_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_KEY) return res.status(500).json({ error: 'NVIDIA_API_KEY non configurata' });
 
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${NVIDIA_KEY}`
  };
 
  try {
    // Prima chiamata
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body)
    });
 
    // Se risposta diretta (200) — modelli standard
    if (response.status === 200) {
      const data = await response.json();
      return res.status(200).json(data);
    }
 
    // Se risposta asincrona (202) — modelli come Qwen 3.5
    if (response.status === 202) {
      const data = await response.json();
      const requestId = data?.id || response.headers.get('NVCF-REQID');
      if (!requestId) return res.status(500).json({ error: 'No request ID for async poll' });
 
      // Polling fino a 25 secondi
      const deadline = Date.now() + 25000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 1500));
        const poll = await fetch(
          `https://integrate.api.nvidia.com/v1/status/${requestId}`,
          { headers }
        );
        if (poll.status === 200) {
          const result = await poll.json();
          return res.status(200).json(result);
        }
        if (poll.status !== 202) {
          const err = await poll.json().catch(() => ({}));
          return res.status(poll.status).json(err);
        }
      }
      return res.status(504).json({ error: 'Timeout polling NVIDIA' });
    }
 
    // Altri errori
    const err = await response.json().catch(() => ({}));
    return res.status(response.status).json(err);
 
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
