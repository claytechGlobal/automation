const CHANNEL = 'https://t.me/+FsBptMvmAD0zMGJh';

const WELCOME =
  'Welcome to trade executions & setups. This is an easy 2 step process!\n\n' +
  'Step 1: Subscribe to 1House & download app for free or paid subscription. upload screenshot & reply DONE\n\n' +
  'Step 2: Sign up with broker, to have correct price points when trading. Be sure to DEPOSIT via credit/debit card or BTC. Upload screenshot of account & reply DONE\n\n' +
  'Join the channel: ' + CHANNEL;

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body && typeof body === 'object' ? body : {};
}

async function tg(token, method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return r.json();
}

async function sendWelcome(token, chatId) {
  return tg(token, 'sendMessage', { chat_id: chatId, text: WELCOME });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ ok: false, error: 'missing_token' });
    return;
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers['x-telegram-bot-api-secret-token'];
    if (got !== secret) {
      res.status(401).json({ ok: false });
      return;
    }
  }

  const update = parseBody(req);
  const msg = update.message;
  if (msg && msg.chat && msg.chat.type === 'private' && msg.text && msg.text.indexOf('/start') === 0) {
    await sendWelcome(token, msg.chat.id);
    res.status(200).json({ ok: true });
    return;
  }

  const memberUpdate = update.chat_member;
  if (!memberUpdate) {
    res.status(200).json({ ok: true });
    return;
  }

  const chatIdEnv = process.env.TELEGRAM_CHAT_ID;
  if (chatIdEnv && String(memberUpdate.chat.id) !== String(chatIdEnv)) {
    res.status(200).json({ ok: true });
    return;
  }

  const oldStatus = memberUpdate.old_chat_member && memberUpdate.old_chat_member.status;
  const newMember = memberUpdate.new_chat_member;
  const newStatus = newMember && newMember.status;
  const user = newMember && newMember.user;

  const joined =
    (newStatus === 'member' || newStatus === 'restricted') &&
    oldStatus !== 'member' &&
    oldStatus !== 'administrator' &&
    oldStatus !== 'creator' &&
    oldStatus !== 'restricted' &&
    user &&
    !user.is_bot;

  if (joined) {
    await sendWelcome(token, user.id);
  }

  res.status(200).json({ ok: true });
};
