/* ==== Sabitler ==== */
const GITHUB_OWNER = 'ferhat-erdogan';
const GITHUB_REPO  = 'Yaman-Elektrik';
const GITHUB_BRANCH = 'main';

const PHONE = "905346381542";
const ADMIN_PW_KEY = 'yaman_admin_pw';
const GH_TOKEN_KEY = 'yaman_gh_token';
const COSTS_CACHE_KEY = 'yaman_costs';
const SHARE_NAME = '*Yaman Elektrik*\n\n*Ferhat Erdoğan*  05346381542\n\n*Murat Erdoğan*  05347151345';
const LOC_QUERY = 'Çarşı Mahallesi 1818 Sokak No:45/C Şehzadeler Manisa';

const STEP = 24;
const MT_CATS = ['kablo','led','boru','bara'];

/* ==== Yardımcı ==== */
const TL = n => n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' ₺';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BOX = '<svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>';
const SHARE_ICON = '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const WAI = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5z"/></svg>';

/* ==== Stok yardımcısı — migration dahil ==== */
// p.stokAdet varsa onu, yoksa eski "stok: var/yok" alanından türet (var→1, yok→0)
const stokOf = p => p && typeof p.stokAdet === 'number'
  ? p.stokAdet
  : (p && p.stok === 'yok' ? 0 : 1);

const SORTS = {
  new:['Son eklenen',(a,b)=>b.id-a.id],
  az:['Ada göre (A-Z)',(a,b)=>a.ad.localeCompare(b.ad,'tr')],
  lo:['Fiyat: düşükten yükseğe',(a,b)=>a.satis-b.satis],
  hi:['Fiyat: yüksekten düşüğe',(a,b)=>b.satis-a.satis],
  // Yalnızca admin dropdown'unda görünür (drawSort filtreler)
  stokAz:['Stok: düşükten yükseğe',(a,b)=>stokOf(a)-stokOf(b)],
  stokCok:['Stok: yüksekten düşüğe',(a,b)=>stokOf(b)-stokOf(a)]
};

const isMt = p => !!p && MT_CATS.includes((p.kat || '').trim().toLowerCase());
const unit = p => isMt(p) ? 'mt' : 'adet';
const r2 = x => Math.round(x * 100) / 100;
const fmtQ = n => n.toLocaleString('tr-TR', {maximumFractionDigits: 2});

/* ==== Slug ==== */
function slug(s){
  s = String(s || '')
    .replace(/İ/g,'i').replace(/I/g,'i').replace(/ı/g,'i')
    .replace(/Ç/g,'c').replace(/ç/g,'c')
    .replace(/Ğ/g,'g').replace(/ğ/g,'g')
    .replace(/Ö/g,'o').replace(/ö/g,'o')
    .replace(/Ş/g,'s').replace(/ş/g,'s')
    .replace(/Ü/g,'u').replace(/ü/g,'u')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
  return (s.substring(0,60) || 'urun');
}

/* ==== Base64 ==== */
function utf8ToB64(str){
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for(let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToUtf8(s){
  const bin = atob(String(s).replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function bytesToB64(bytes){
  bytes = new Uint8Array(bytes);
  let bin = '';
  for(let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

/* ==== Toast ==== */
function toast(m){
  const t = $('toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ==== Overlay yönetimi ==== */
function openOv(id){
  const o = $(id);
  o.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => o.classList.add('in')));
}
function closeOv(id){
  const o = $(id);
  o.classList.remove('in');
  setTimeout(() => o.classList.remove('show'), 220);
}

let ovStack = [];
let ovIgnoreNext = false;
function ovPush(id){
  ovStack.push(id);
  try { history.pushState({ ov: id }, ''); } catch(_){}
}
function ovClose(id){
  closeOv(id);
  const idx = ovStack.lastIndexOf(id);
  if(idx >= 0){
    ovStack.splice(idx, 1);
    ovIgnoreNext = true;
    try { history.back(); } catch(_){ ovIgnoreNext = false; }
  }
}
window.addEventListener('popstate', () => {
  if(ovIgnoreNext){ ovIgnoreNext = false; return; }
  if(ovStack.length === 0) return;
  const id = ovStack.pop();
  closeOv(id);
});
