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
  const digits = phoneRaw.replace(/[^\d]/g, '');
  let phone = phoneRaw;
  if (digits.startsWith('92') && digits.length >= 12) phone = '+' + digits;
  else if (digits.startsWith('0') && digits.length === 11) phone = '+92' + digits.slice(1);
  else if (digits.length === 10 && digits.startsWith('3')) phone = '+92' + digits;
  else if (digits.length === 11 && digits.startsWith('1')) phone = '+' + digits;
  else if (digits.length === 10) phone = '+1' + digits;
  else if (digits.length > 0) phone = '+' + digits;
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
    'First Name': firstName,
    'Last Name': lastName,
    email,
    Email: email,
    phone,
    Phone: phone,
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
