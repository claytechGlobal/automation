const fs = require('fs');
const path = require('path');
const { handleUpdate, tg } = require('../lib/telegram-bot');

function loadEnv() {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t[0] === '#') continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'")) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  loadEnv();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('Missing TELEGRAM_BOT_TOKEN in .env');
    process.exit(1);
  }

  console.log('Removing webhook for local polling...');
  await tg(token, 'deleteWebhook', { drop_pending_updates: false });

  const me = await tg(token, 'getMe');
  if (!me.ok) {
    console.error('Bad token', me);
    process.exit(1);
  }
  console.log('Bot @' + me.result.username + ' is running locally.');
  console.log('Open Telegram, search that bot, press Start.');
  console.log('Admin screenshots go to TELEGRAM_ADMIN_CHAT_ID=' + (process.env.TELEGRAM_ADMIN_CHAT_ID || '(not set — send /myid to the bot)'));
  console.log('Ctrl+C to stop. After testing, run the setup URL on Vercel again.');

  let offset = 0;
  while (true) {
    const data = await tg(token, 'getUpdates', {
      offset,
      timeout: 30,
      allowed_updates: ['message']
    });
    if (!data.ok) {
      console.error(data);
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    for (const update of data.result) {
      offset = update.update_id + 1;
      try {
        await handleUpdate(token, update);
        const from = update.message && update.message.from;
        console.log('Handled update', update.update_id, from ? from.id : '');
      } catch (err) {
        console.error(err);
      }
    }
  }
}

main();
