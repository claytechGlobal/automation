module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const setupKey = process.env.TELEGRAM_SETUP_KEY;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';

  if (!token) {
    res.status(500).json({ ok: false, error: 'Add TELEGRAM_BOT_TOKEN in Vercel first' });
    return;
  }

  const key = (req.query && req.query.key) || (req.body && req.body.key);
  if (!setupKey || key !== setupKey) {
    res.status(401).json({ ok: false, error: 'wrong_key' });
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const webhookUrl = `${proto}://${host}/api/telegram`;

  const payload = {
    url: webhookUrl,
    allowed_updates: ['chat_member', 'my_chat_member', 'message'],
    drop_pending_updates: true
  };
  if (secret) payload.secret_token = secret;

  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await r.json();

  const infoR = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const info = await infoR.json();

  res.status(200).json({ ok: true, setWebhook: data, webhookInfo: info, webhookUrl });
};
