/* ==== State ==== */
let P = [];
let costs = null;
let ghToken = '';
let cart = {};
let cartSel = {};
let cat = '';
let sort = 'new';
let PW = '';
let shown = STEP;
let LIST = [];

const isSel = id => cartSel[id] !== false;

try { cart = JSON.parse(localStorage.getItem('cart') || '{}'); } catch(e){}
try { cartSel = JSON.parse(localStorage.getItem('cartSel') || '{}'); } catch(e){ cartSel = {}; }
const save = () => { try { localStorage.setItem('cart', JSON.stringify(cart)); } catch(e){} };
const saveSel = () => { try { localStorage.setItem('cartSel', JSON.stringify(cartSel)); } catch(e){} };
const img = p => p.resim ? `<img loading="lazy" src="${esc(p.resim)}" alt="" onerror="this.remove()">` : '';

/* ==== Pending (bekleyen değişiklikler) ==== */
const pending = {
  products: false,
  costs: false,
  images: new Map(),
  deletedImages: new Set(),
  added: [],
  edited: [],
  deleted: []
};
function hasPending(){
  return pending.products || pending.costs || pending.images.size > 0 || pending.deletedImages.size > 0;
}
function pendingCount(){
  return pending.added.length + pending.edited.length + pending.deleted.length;
}
function buildCommitMessage(){
  const a = pending.added.length, e = pending.edited.length, d = pending.deleted.length;
  const parts = [];
  if(a) parts.push('+' + a);
  if(e) parts.push('~' + e);
  if(d) parts.push('-' + d);
  const title = (parts.join(' ') || '0') + ' ürün';
  let body = '';
  if(a) body += 'Eklenen:\n' + pending.added.map(x => '- ' + x.ad).join('\n') + '\n';
  if(e) body += (body ? '\n' : '') + 'Düzenlenen:\n' + pending.edited.map(x => '- ' + x.ad).join('\n') + '\n';
  if(d) body += (body ? '\n' : '') + 'Silinen:\n' + pending.deleted.map(x => '- ' + x.ad).join('\n');
  return body ? title + '\n\n' + body : title;
}
function updatePublishUI(){
  const btn = $('publishBtn');
  if(!btn) return;
  const isAdmin = !!costs;
  const hasToken = !!ghToken;
  btn.style.display = (isAdmin && hasToken) ? '' : 'none';
  const n = pendingCount();
  const has = hasPending();
  btn.disabled = !has;
  const badge = $('pendingBadge');
  if(badge){
    if(has){ badge.style.display = 'grid'; badge.textContent = n > 0 ? n : '!'; }
    else { badge.style.display = 'none'; }
  }
  const bar = $('adminbar');
  bar.style.display = isAdmin ? 'block' : 'none';
  if(isAdmin){
    bar.classList.toggle('pending', has);
    if(has){
      bar.innerHTML = `<b>${n}</b> bekleyen değişiklik · <b>Yayınla</b> butonuna bas → GitHub'a gönderilsin`;
    } else {
      bar.innerHTML = ghToken
        ? 'Yönetici modu · <b>yazma yetkili</b> (alış fiyatları + ürün düzenleme)'
        : 'Yönetici modu · <b>sadece okuma</b> (alış fiyatları görünür, düzenleme kapalı)';
    }
  }
}
