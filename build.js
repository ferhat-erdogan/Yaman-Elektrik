// Kullanım:
//   node build.js      -> mevcut costs.json varsa şifre değiştirir
//   node build.js      -> costs.json yoksa sıfırdan oluşturur
// urunler.csv'ye dokunmaz. Sadece costs.json ile ilgilenir.
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, r));
const b64 = s => Buffer.from(s, 'base64');

async function main(){
  console.log('\n=== Yaman Elektrik — costs.json şifre yönetimi ===\n');

  let productCount = 0;
  if(fs.existsSync('products.json')){
    try { productCount = JSON.parse(fs.readFileSync('products.json','utf8')).length; } catch(_){}
  }
  const hasCosts = fs.existsSync('costs.json');

  if(!hasCosts){
    console.log('costs.json bulunamadı → sıfırdan oluşturulacak.');
    if(!productCount){
      console.log('UYARI: products.json da yok veya boş. Önce ürünleri ekle.');
    }
    const pw = await ask('Yeni şifre (en az 8 karakter): ');
    if(pw.length < 8){ console.log('Parola en az 8 karakter olmalı!'); rl.close(); return; }
    const confirm = await ask('Yeni şifre (tekrar): ');
    if(pw !== confirm){ console.log('Şifreler eşleşmiyor!'); rl.close(); return; }

    const obj = {
      alis: new Array(productCount).fill(0),
      iskonto: new Array(productCount).fill(0)
    };
    writeCosts(pw, obj);
    console.log(`\n✅ costs.json oluşturuldu (${productCount} ürün, hepsi 0 alış, 0 iskonto).`);
    console.log('   Ürün alış fiyatlarını ve iskontoları admin panelinden girebilirsin.');
    rl.close(); return;
  }

  // ==== Mevcut costs.json → şifre değiştir ====
  console.log(`Mevcut costs.json var (${productCount} ürün).\n`);
  const oldPw = await ask('Eski şifre: ');

  let obj;
  try {
    obj = readAndDecrypt(oldPw);
  } catch(e){
    console.log('\n❌ ' + e.message);
    rl.close(); process.exit(1);
  }
  const alisCount = (obj.alis || []).length;
  console.log(`✅ Şifre doğru. ${alisCount} alış fiyatı çözüldü.`);

  const newPw = await ask('\nYeni şifre (en az 8 karakter): ');
  if(newPw.length < 8){ console.log('Parola en az 8 karakter olmalı!'); rl.close(); return; }
  const confirm = await ask('Yeni şifre (tekrar): ');
  if(newPw !== confirm){ console.log('Şifreler eşleşmiyor!'); rl.close(); return; }

  writeCosts(newPw, obj);
  console.log('\n✅ Şifre değiştirildi.');
  console.log('   Şimdi:');
  console.log('   git add costs.json');
  console.log('   git commit -m "şifre güncellendi"');
  console.log('   git push');
  rl.close();
}

function readAndDecrypt(pw){
  const data = JSON.parse(fs.readFileSync('costs.json','utf8'));
  const key = crypto.pbkdf2Sync(pw, b64(data.s), 200000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, b64(data.i));
  const enc = b64(data.d);
  decipher.setAuthTag(enc.slice(-16));
  try {
    const plain = Buffer.concat([decipher.update(enc.slice(0, -16)), decipher.final()]).toString('utf8');
    let arr = JSON.parse(plain);
    // Eski format (dizi) → obje'ye yükselt
    if(Array.isArray(arr)){
      arr = { alis: arr, iskonto: arr.map(()=>0) };
    }
    if(!arr || !Array.isArray(arr.alis)) arr = { alis: [], iskonto: [] };
    if(!Array.isArray(arr.iskonto)) arr.iskonto = arr.alis.map(()=>0);
    return arr;
  } catch(_){
    throw new Error('Eski şifre yanlış!');
  }
}

function writeCosts(pw, obj){
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pw, salt, 200000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const out = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  fs.writeFileSync('costs.json', JSON.stringify({
    s: salt.toString('base64'),
    i: iv.toString('base64'),
    d: out.toString('base64')
  }));
}

main().catch(e => { console.error('Hata:', e.message); process.exit(1); });
