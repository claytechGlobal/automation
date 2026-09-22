const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const CHANNEL = 'https://t.me/+FsBptMvmAD0zMGJh';

async function joinHref() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return CHANNEL;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await r.json();
    if (data.ok && data.result && data.result.username) {
      return `https://t.me/${data.result.username}?start=join`;
    }
  } catch (err) {}
  return CHANNEL;
}

async function main() {
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const href = await joinHref();
  html = html.split(CHANNEL).join(href);
  fs.writeFileSync(path.join(dist, 'index.html'), html);

  function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      const from = path.join(src, name);
      const to = path.join(dest, name);
      if (fs.statSync(from).isDirectory()) copyDir(from, to);
      else fs.copyFileSync(from, to);
    }
  }

  const publicDir = path.join(root, 'public');
  if (fs.existsSync(publicDir)) copyDir(publicDir, dist);

  console.log('Join button -> ' + href);
  console.log('Build complete -> dist/');
}

main();
