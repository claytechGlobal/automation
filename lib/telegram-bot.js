const fs = require('fs');
const path = require('path');

const CHANNEL = process.env.TELEGRAM_CHANNEL_LINK || 'https://t.me/+FsBptMvmAD0zMGJh';
const SUBSCRIBE = process.env.TELEGRAM_SUBSCRIBE_LINK || 'https://subscribe.1houseglobal.com/countdown';
const BROKER = process.env.TELEGRAM_BROKER_LINK || '';

const STEP1 =
  'Welcome to trade executions & setups. This is an easy 2 step process!\n\n' +
  'Step 1: Subscribe to 1House & download app for free or paid subscription.\n' +
  'Link: ' + SUBSCRIBE + '\n\n' +
  'Upload a screenshot here, then reply DONE.';

function step2Text() {
  let t =
    'Step 2: Sign up with broker, to have correct price points when trading. Be sure to DEPOSIT via credit/debit card or BTC.\n\n';
  if (BROKER) t += 'Broker link: ' + BROKER + '\n\n';
  t += 'Upload a screenshot of your account here, then reply DONE.';
  return t;
}

const DONE_MSG =
  'You are verified.\n\nJoin the channel now:\n' + CHANNEL;

const STATE_FILE =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join('/tmp', 'tg-state.json')
    : path.join(__dirname, '..', '.tg-state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (err) {}
  return {};
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (err) {}
}

function getUser(state, id) {
  const key = String(id);
  if (!state[key]) state[key] = { step: 1, hasPhoto: false };
  return state[key];
}

async function tg(token, method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return r.json();
}

function userLabel(from) {
  const parts = [];
  if (from.username) parts.push('@' + from.username);
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
  if (name) parts.push(name);
  parts.push('id:' + from.id);
  return parts.join(' | ');
}

function largestPhoto(photos) {
  if (!photos || !photos.length) return null;
  return photos[photos.length - 1];
}

async function notifyAdmin(token, adminId, caption, msg) {
  if (!adminId) return;
  const header = caption + '\nFrom: ' + userLabel(msg.from);

  if (msg.photo) {
    const p = largestPhoto(msg.photo);
    await tg(token, 'sendPhoto', {
      chat_id: adminId,
      photo: p.file_id,
      caption: header
    });
    return;
  }

  if (msg.document) {
    await tg(token, 'sendDocument', {
      chat_id: adminId,
      document: msg.document.file_id,
      caption: header
    });
    return;
  }

  await tg(token, 'sendMessage', {
    chat_id: adminId,
    text: header + (msg.text ? '\nText: ' + msg.text : '')
  });
}

async function handleUpdate(token, update) {
  const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const msg = update.message;
  if (!msg || !msg.chat || msg.chat.type !== 'private') return { ok: true };

  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const state = loadState();
  const user = getUser(state, chatId);

  if (text === '/myid') {
    await tg(token, 'sendMessage', {
      chat_id: chatId,
      text: 'Your Telegram ID is:\n' + chatId + '\n\nPut this in Vercel as TELEGRAM_ADMIN_CHAT_ID to receive screenshots.'
    });
    return { ok: true };
  }

  if (text.indexOf('/start') === 0) {
    user.step = 1;
    user.hasPhoto = false;
    saveState(state);
    await tg(token, 'sendMessage', { chat_id: chatId, text: STEP1 });
    return { ok: true };
  }

  const hasImage = !!(msg.photo || (msg.document && msg.document.mime_type && msg.document.mime_type.indexOf('image/') === 0));
  const isDone = text.toUpperCase() === 'DONE';

  if (user.step === 1) {
    if (hasImage) {
      user.hasPhoto = true;
      saveState(state);
      await notifyAdmin(token, adminId, 'STEP 1 SCREENSHOT', msg);
      await tg(token, 'sendMessage', {
        chat_id: chatId,
        text: 'Got your Step 1 screenshot. Now reply DONE to continue.'
      });
      return { ok: true };
    }
    if (isDone) {
      if (!user.hasPhoto) {
        await tg(token, 'sendMessage', {
          chat_id: chatId,
          text: 'Please upload your Step 1 screenshot first, then reply DONE.'
        });
        return { ok: true };
      }
      user.step = 2;
      user.hasPhoto = false;
      saveState(state);
      await notifyAdmin(token, adminId, 'STEP 1 DONE', msg);
      await tg(token, 'sendMessage', { chat_id: chatId, text: step2Text() });
      return { ok: true };
    }
    await tg(token, 'sendMessage', {
      chat_id: chatId,
      text: 'Please upload your Step 1 screenshot, then reply DONE.'
    });
    return { ok: true };
  }

  if (user.step === 2) {
    if (hasImage) {
      user.hasPhoto = true;
      saveState(state);
      await notifyAdmin(token, adminId, 'STEP 2 SCREENSHOT', msg);
      await tg(token, 'sendMessage', {
        chat_id: chatId,
        text: 'Got your Step 2 screenshot. Now reply DONE to get channel access.'
      });
      return { ok: true };
    }
    if (isDone) {
      if (!user.hasPhoto) {
        await tg(token, 'sendMessage', {
          chat_id: chatId,
          text: 'Please upload your Step 2 screenshot first, then reply DONE.'
        });
        return { ok: true };
      }
      user.step = 3;
      user.hasPhoto = false;
      saveState(state);
      await notifyAdmin(token, adminId, 'STEP 2 DONE — ACCESS GIVEN', msg);
      await tg(token, 'sendMessage', { chat_id: chatId, text: DONE_MSG });
      return { ok: true };
    }
    await tg(token, 'sendMessage', {
      chat_id: chatId,
      text: 'Please upload your Step 2 screenshot, then reply DONE.'
    });
    return { ok: true };
  }

  if (user.step >= 3) {
    await tg(token, 'sendMessage', {
      chat_id: chatId,
      text: 'You already finished.\n\nChannel link:\n' + CHANNEL + '\n\nSend /start to begin again.'
    });
  }

  return { ok: true };
}

module.exports = { handleUpdate, tg, CHANNEL };
