module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const url = process.env.GHL_WEBHOOK_URL;
  if (!url) {
    res.status(500).json({ ok: false, error: 'missing_webhook' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ ok: false });
    return;
  }

  const email = String(body.email || '').trim();
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    res.status(400).json({ ok: false, error: 'invalid_email' });
    return;
  }

  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const phoneRaw = String(body.phone || '').trim();
  const phoneDigits = phoneRaw.replace(/[^\d+]/g, '');
  const type = body.type || 'lead';
  const source = body.source || 'website';
  const fullName = String(body.fullName || '').trim();
  const tradingExperience = String(body.tradingExperience || '').trim();
  const tradingCapital = String(body.tradingCapital || '').trim();
  const commitment = String(body.commitment || '').trim();

  const payload = {
    type,
    source,
    fullName,
    firstName,
    lastName,
    first_name: firstName,
    last_name: lastName,
    email,
    Email: email,
    phone: phoneDigits || phoneRaw,
    Phone: phoneDigits || phoneRaw,
    tradingExperience,
    tradingCapital,
    commitment
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    res.status(502).json({ ok: false });
    return;
  }

  res.status(200).json({ ok: true });
};
