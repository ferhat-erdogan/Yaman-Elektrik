// Kullanım: node build.js
// urunler.csv (GİZLİ, push edilmez) -> products.json (herkese açık) + costs.json (şifreli alış fiyatları)
const fs = require('fs'), crypto = require('crypto'), readline = require('readline');
const num = s => parseFloat(String(s || '').replace(',', '.')) || 0;

const rows = fs.readFileSync('urunler.csv', 'utf8').split(/\r?\n/)
  .filter(l => l.trim() && !l.trim().startsWith('#'));
const items = rows.map((l, i) => {
  const [ad, alis, satis, resim, kat] = l.split(';').map(x => x.trim());
  return { id: i, ad, alis: num(alis), satis: num(satis), resim: resim || '', kat: kat || '' };
});

fs.writeFileSync('products.json', JSON.stringify(items.map(({ alis, ...p }) => p)));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Yönetici parolası: ', pw => {
  rl.close();
  if (pw.length < 8) { console.log('Parola en az 8 karakter olmalı!'); process.exit(1); }
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pw, salt, 200000, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([
    c.update(JSON.stringify(items.map(i => i.alis)), 'utf8'), c.final(), c.getAuthTag()
  ]);
  fs.writeFileSync('costs.json', JSON.stringify({
    s: salt.toString('base64'), i: iv.toString('base64'), d: enc.toString('base64')
  }));
  console.log(items.length + ' ürün hazır. Şimdi: git add . && git commit -m fiyat && git push');
});

