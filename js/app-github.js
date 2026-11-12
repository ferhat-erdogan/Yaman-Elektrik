/* ==== GitHub API ==== */
async function ghGet(path){
  if(!ghToken) throw new Error('GitHub token yok');
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}?ref=${GITHUB_BRANCH}&t=${Date.now()}`;
  const r = await fetch(url, {
    headers: { Authorization: 'Bearer ' + ghToken, Accept: 'application/vnd.github+json' }
  });
  if(r.status === 404) return { content: null, sha: null };
  if(!r.ok){
    const t = await r.text().catch(() => '');
    throw new Error('GitHub okuma hatası: ' + r.status + (t ? ' — ' + t.slice(0,100) : ''));
  }
  const j = await r.json();
  return { content: b64ToUtf8(j.content || ''), sha: j.sha };
}
async function ghPutBinary(path, b64content, sha, message){
  if(!ghToken) throw new Error('GitHub token yok');
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}`;
  const body = { message: message || ('güncelle: ' + path), content: b64content, branch: GITHUB_BRANCH };
  if(sha) body.sha = sha;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + ghToken, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!r.ok){
    const t = await r.text().catch(() => '');
    throw new Error('GitHub yazma hatası: ' + r.status + (t ? ' — ' + t.slice(0,100) : ''));
  }
  return await r.json();
}
async function ghPutText(path, text, sha, message){
  return ghPutBinary(path, utf8ToB64(text), sha, message);
}
async function ghDelete(path, sha, message){
  if(!ghToken) throw new Error('GitHub token yok');
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}`;
  const r = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + ghToken,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: message || ('sil: ' + path), sha, branch: GITHUB_BRANCH })
  });
  if(!r.ok){
    const t = await r.text().catch(() => '');
    throw new Error('GitHub silme hatası: ' + r.status + (t ? ' — ' + t.slice(0,100) : ''));
  }
  return await r.json();
}

/* ==== costs şifreleme ==== */
async function encryptCosts(arr, pw){
  if(!(window.crypto && crypto.subtle)){
    throw new Error('Ürün kaydetmek için 127.0.0.1 veya HTTPS adresi gerekli (crypto.subtle yok)');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'}, km, {name:'AES-GCM',length:256}, false, ['encrypt']);
  const enc = await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, new TextEncoder().encode(JSON.stringify(arr)));
  return { s: bytesToB64(salt), i: bytesToB64(iv), d: bytesToB64(new Uint8Array(enc)) };
}
async function unlock(pw){
  const o = await (await fetch('costs.json?' + Date.now())).json();
  if(!(window.crypto && crypto.subtle)){
    await new Promise((ok, no) => {
      const sc = document.createElement('script');
      sc.src = 'crypto-fallback.js';
      sc.onload = ok;
      sc.onerror = () => no(new Error('crypto-fallback.js yüklenemedi'));
      document.head.appendChild(sc);
    });
    await new Promise(r => setTimeout(r, 60));
    return JSON.parse(globalThis.__fallbackDecrypt(pw, o));
  }
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(o.s),iterations:200000,hash:'SHA-256'}, km, {name:'AES-GCM',length:256}, false, ['decrypt']);
  const d = await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(o.i)}, key, b64(o.d));
  return JSON.parse(new TextDecoder().decode(d));
}

/* ==== Resim işleme ==== */
function resizeToCanvas(im, maxSide){
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  const sc = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.round(w * sc), ch = Math.round(h * sc);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(im, 0, 0, cw, ch);
  return c;
}
function processImageFromFile(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { try { res(resizeToCanvas(im, 800)); } finally { URL.revokeObjectURL(url); } };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Dosya görsel değil')); };
    im.src = url;
  });
}
