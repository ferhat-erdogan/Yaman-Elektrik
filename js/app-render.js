/* ==== Sepet kontrol ==== */
function qctl(p, n, c){
  const mt = isMt(p);
  const u = mt ? 'mt' : 'adet';
  const val = mt ? fmtQ(n) : String(Math.round(n));
  const len = Math.max(1, String(val).length);
  const mode = mt ? 'decimal' : 'numeric';
  const inp = `<input class="qi" inputmode="${mode}" value="${val}" size="${len}" style="border:0;background:transparent;text-align:center;padding:0;margin:0;font-size:13px;font-weight:700;line-height:1;color:inherit;font-style:normal;font-variant-numeric:tabular-nums;flex:none;height:100%;width:auto;min-width:0;max-width:70px;-moz-appearance:textfield;box-sizing:content-box" onfocus="this.select()" oninput="setQtyLive(${p.id},this.value,this)" onblur="setQty(${p.id},this.value,this)"><span class="mu" style="font-style:normal;font-size:10px;color:#64748b;margin:0;padding:0 0 0 2px;line-height:1;white-space:nowrap;flex:none;display:inline-flex;align-items:center">${u}</span>`;
  const mid = c === 'step'
    ? `<span style="flex:1;display:inline-flex;align-items:center;justify-content:center;min-width:0;height:100%">${inp}</span>`
    : inp;
  return `<div class="${c}" style="display:inline-flex;align-items:center;gap:0"><button onclick="add(${p.id},-1)">−</button>${mid}<button onclick="add(${p.id},1)">+</button></div>`;
}
function setQtyLive(id, v, el){
  const p = P[id];
  let n = parseFloat(String(v).replace(',', '.'));
  if(p && !isMt(p)) n = Math.round(n);
  if(!(n > 0)){ delete cart[id]; delete cartSel[id]; }
  else { cart[id] = Math.min(n, 100000); if(cartSel[id] === undefined) cartSel[id] = true; }
  save(); saveSel(); sum();
  if(el){
    const len = String(el.value || '1').length || 1;
    el.size = Math.max(1, Math.min(8, len));
    // Görsel geri bildirim — "kaydedildi" hissi
    el.classList.add('saved');
    clearTimeout(el._sv);
    el._sv = setTimeout(() => el.classList.remove('saved'), 350);
  }
  if($('cov').classList.contains('show')) updateCartAmounts();
}
function setQty(id, v, el){
  setQtyLive(id, v, el);
  render(); if($('cov').classList.contains('show')) drawCart();
}
function toggleSel(id){
  cartSel[id] = (cartSel[id] === false);
  saveSel(); sum();
  const row = document.querySelector('#cb .ci[data-id="' + id + '"]');
  if(row) row.classList.toggle('off', cartSel[id] === false);
  if($('cov').classList.contains('show')) updateCartAmounts();
}
function removeItem(id){
  delete cart[id]; delete cartSel[id];
  save(); saveSel(); sum(); render();
  if($('cov').classList.contains('show')) drawCart();
}
function updateCartAmounts(){
  const E = Object.entries(cart).filter(([id])=>P[id] && isSel(id));
  document.querySelectorAll('#cb .ci[data-id]').forEach(row => {
    const id = row.dataset.id;
    if(!P[id]) return;
    const n = cart[id] || 0;
    const lt = row.querySelector('.line-tot');
    if(lt) lt.textContent = TL(P[id].satis * n);
  });
  const tot = document.getElementById('cartTot');
  if(tot) tot.querySelector('span:last-child').textContent = TL(total());
  const adm = document.getElementById('cartAdm');
  if(adm && costs){
    const c = E.reduce((t,[i,n])=>t+costs[i]*n,0);
    const spans = adm.querySelectorAll('span');
    if(spans[0]) spans[0].textContent = 'Alış toplamı: ' + TL(c);
    if(spans[1]) spans[1].innerHTML = 'Kâr: <b>' + TL(total()-c) + '</b>';
  }
}
function add(id, d){
  const p = P[id];
  if(p && stokOf(p) <= 0 && !costs){ toast('Bu ürün stokta yok'); return; }
  cart[id] = r2((cart[id]||0)+d);
  if(cart[id] <= 0){ delete cart[id]; delete cartSel[id]; }
  else if(cartSel[id] === undefined) cartSel[id] = true;
  if(d>0 && cart[id]===1) toast('Sepete eklendi');
  save(); saveSel(); sum(); render();
  if($('cov').classList.contains('show')) drawCart();
}
const total = () => Object.entries(cart).reduce((t,[id,n])=>t+((isSel(id) && P[id])?P[id].satis*n:0),0);
function sum(){
  const allN = Object.entries(cart).filter(([id])=>P[id]).length;
  const bd = $('badge'); if(bd){ bd.style.display = allN?'grid':'none'; bd.textContent = allN; }
  $('fbar').classList.toggle('show', allN>0); $('fn').textContent = allN; $('ft').textContent = TL(total());
}
function drawCart(){
  const E = Object.entries(cart).filter(([id])=>P[id]);
  $('cb').innerHTML = E.length ? E.map(([id,n])=>{
    const p = P[id];
    const selected = isSel(id);
    const oos = stokOf(p) <= 0;
    const stokTxt = costs
      ? ` · <span class="stok-txt${stokOf(p) <= 0 ? ' zero' : ''}">Stok: ${fmtQ(stokOf(p))} ${unit(p)}</span>`
      : '';
    return `<div class="ci${selected?'':' off'}${oos?' oos':''}" data-id="${id}">
      <label class="selbox"><input type="checkbox" ${selected?'checked':''} onchange="toggleSel(${id})"></label>
      <div class="im${p.resim?' z':''}" ${p.resim?`onclick="zoom(${id})"`:''}>${img(p)}</div>
      <div class="info"><b>${esc(p.ad)}${oos?'<span class="oos-tag">STOK YOK</span>':''}</b><small>${TL(p.satis)} / ${unit(p)}${stokTxt}</small></div>
      <button class="del" onclick="removeItem(${id})" aria-label="Sepetten çıkar">${TRASH_ICON}</button>
      <div class="ctrl">${qctl(p, n, 'q')}<span class="line-tot">${TL(p.satis*n)}</span></div>
    </div>`;
  }).join('') : `<div class="empty" style="padding:50px 0">${BOX}<div>Sepetin boş</div></div>`;
  if(!E.length){ $('cf').innerHTML=''; return; }
  const selE = E.filter(([id])=>isSel(id));
  const c = costs && selE.reduce((t,[id,n])=>t+costs[id]*n,0);
  let h = `<div class="tot" id="cartTot"><span>Toplam</span><span>${TL(total())}</span></div>`;
  if(costs) h += `<div class="adm" id="cartAdm"><span>Alış toplamı: ${TL(c)}</span><span>Kâr: <b>${TL(total()-c)}</b></span></div>`;
  h += `<button class="btn wa" onclick="shareWA()">${WAI}WhatsApp'ta paylaş</button>`;
  if(PHONE) h += '<button class="btn p" onclick="orderWA()">Siparişi dükkana gönder</button>';
  if(costs) h += '<button class="btn" onclick="adminShareWA()">Sadece Ürün Adları ve Adetleri Paylaş</button>';
  if(costs && ghToken) h += `<div class="stok-btns">
    <button class="btn dus" onclick="stokDus()">− Stoktan düş</button>
    <button class="btn ekle" onclick="stokEkle()">+ Stoğa ekle</button>
  </div>`;
  h += `<button class="btn temizle" onclick="clearCartConfirm()">
    <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
    Sepeti temizle
  </button>`;
  $('cf').innerHTML = h;
}
function cartText(){
  const E = Object.entries(cart).filter(([id]) => P[id] && isSel(id));
  let t = '*Yaman Elektrik* - Sepet\n\n' + E.map(([id,n]) => `${P[id].ad} - ${fmtQ(n)} ${unit(P[id])} × ${TL(P[id].satis)} = ${TL(P[id].satis*n)}`).join('\n') + '\n\n*Toplam: ' + TL(total()) + '*';
  if(!/^(localhost|127\.|192\.168\.)/.test(location.hostname) && /^https?:/.test(location.protocol)) t += '\n' + location.origin + location.pathname;
  return t;
}
const shareWA = () => window.open('https://wa.me/?text=' + encodeURIComponent(cartText()), '_blank');
const orderWA = () => window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(cartText()), '_blank');
function adminShareWA(){
  const E = Object.entries(cart).filter(([id]) => P[id] && isSel(id));
  if(!E.length){ toast('Seçili ürün yok'); return; }
  const t = E.map(([id,n]) => `${P[id].ad} = ${fmtQ(n)} ${isMt(P[id]) ? 'Metre' : 'Adet'}`).join('\n');
  window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
}

/* ==== Sepeti temizle onayı ==== */
function clearCartConfirm(){
  if(!Object.keys(cart).length) return;
  const list = Object.entries(cart).filter(([id])=>P[id]).map(([id,n]) => `${P[id].ad} — ${fmtQ(n)} ${unit(P[id])}`);
  showConfirm({
    title: 'Sepeti temizle',
    msg: 'Sepetteki tüm ürünler kaldırılacak.',
    list,
    okText: 'Temizle',
    okColor: 'err',
    onOk: () => {
      cart = {}; cartSel = {}; save(); saveSel(); sum(); render(); drawCart();
    }
  });
}

/* ==== Stok düş / ekle (toplu, onaylı) ==== */
function stokDus(){
  if(!costs || !ghToken){ toast('Yazma için token gerekli'); return; }
  const E = Object.entries(cart).filter(([id]) => P[id] && isSel(id));
  if(!E.length){ toast('Seçili ürün yok'); return; }
  const yetersiz = [];
  for(const [id, n] of E){
    const mevcut = stokOf(P[id]);
    if(mevcut < n) yetersiz.push(`${P[id].ad} (gereken ${fmtQ(n)}, mevcut ${mevcut})`);
  }
  if(yetersiz.length){
    toast('Stok yetersiz: ' + yetersiz[0]);
    console.error('Stok yetersiz:\n' + yetersiz.join('\n'));
    return;
  }
  const list = E.map(([id, n]) => `${P[id].ad} — ${fmtQ(n)} ${unit(P[id])}`);
  showConfirm({
    title: 'Stoktan düş',
    msg: `${E.length} ürün stoktan düşülecek. Onaylıyor musun?`,
    list,
    okText: 'Düş',
    okColor: 'err',
    onOk: () => {
      for(const [id, n] of E){
        P[id].stokAdet = Math.max(0, stokOf(P[id]) - n);
        pending.stokChanged.add(Number(id));
      }
      pending.products = true;
      updatePublishUI();
      drawCart(); render(); sum();
      toast('Stoktan düşüldü — "Yayınla" ile GitHub\'a gönder');
    }
  });
}
function stokEkle(){
  if(!costs || !ghToken){ toast('Yazma için token gerekli'); return; }
  const E = Object.entries(cart).filter(([id]) => P[id] && isSel(id));
  if(!E.length){ toast('Seçili ürün yok'); return; }
  const list = E.map(([id, n]) => `${P[id].ad} — ${fmtQ(n)} ${unit(P[id])}`);
  showConfirm({
    title: 'Stoğa ekle',
    msg: `${E.length} ürün stoğa eklenecek. Onaylıyor musun?`,
    list,
    okText: 'Ekle',
    okColor: 'ok',
    onOk: () => {
      for(const [id, n] of E){
        P[id].stokAdet = stokOf(P[id]) + n;
        pending.stokChanged.add(Number(id));
      }
      pending.products = true;
      updatePublishUI();
      drawCart(); render(); sum();
      toast('Stoğa eklendi — "Yayınla" ile GitHub\'a gönder');
    }
  });
}

/* ==== Ürün render ==== */
function drawChips(){
  const cs = ['', ...new Set(P.map(p=>p.kat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
  $('chips').innerHTML = cs.map(c=>`<button class="chip ${c===cat?'on':''}" data-c="${esc(c)}">${c?esc(c):'Tümü'}</button>`).join('');
}
function drawSort(){
  $('ddl').textContent = SORTS[sort][0];
  const entries = Object.entries(SORTS).filter(([k]) => !k.startsWith('stok') || !!costs);
  $('ddm').innerHTML = entries.map(([k,v])=>`<button data-s="${k}" class="${k===sort?'sel':''}">${v[0]}${k===sort?'<svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="m5 12 5 5 9-10"/></svg>':''}</button>`).join('');
}
function render(){
  const q = $('q').value.toLowerCase().trim();
  const L = P.filter(p=>(!cat||p.kat===cat)&&p.ad.toLowerCase().includes(q)).sort(SORTS[sort][1]);
  $('cnt').textContent = L.length + ' ürün'; LIST = L;
  $('grid').innerHTML = L.length ? L.slice(0,shown).map(p=>{
    const n = cart[p.id], c = costs && costs[p.id];
    const isDirty = pending.added.some(x => x.id === p.id) || pending.edited.some(x => x.id === p.id) || pending.stokChanged.has(p.id);
    const oos = stokOf(p) <= 0;
    const stokVal = stokOf(p);
    return `<div class="card${isDirty?' dirty':''}"><div class="ph${p.resim?' z':''}" ${p.resim?`onclick="zoom(${p.id})"`:''}>${oos?'<span class="oos-badge">STOK YOK</span>':''}${BOX}${img(p)}${p.kat?`<span class="tag" data-k="${esc(p.kat)}" onclick="event.stopPropagation();pickCat(this.dataset.k)">${esc(p.kat)}</span>`:''}</div>
    <div class="bd"><div class="nm">${esc(p.ad)}</div><div class="pr">${TL(p.satis)}<span class="u"> / ${unit(p)}</span></div>
    ${costs?`<div class="adm">
      <span>Alış: ${TL(c)}</span>
      <span>Kâr: <b>${TL(p.satis-c)}</b>${c?` (%${Math.round((p.satis-c)/c*100)})`:''}</span>
      <span class="stok-line ${stokVal <= 0 ? 'zero' : 'ok'}">Stok: ${fmtQ(stokVal)} ${unit(p)}</span>
    </div>`:''}
    ${(costs&&ghToken)?`<button class="btn ed" onclick="edit(${p.id})">Düzenle</button>`:''}
    ${(oos && !costs)?`<button class="add" disabled style="opacity:.5;cursor:not-allowed;background:var(--bd);color:var(--mut)">Stokta yok</button>`
       :(n?qctl(p,n,'step')
         :`<button class="add" onclick="add(${p.id},1)"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Sepete ekle</button>`)}
    <button class="share-p" onclick="shareProduct(${p.id})">${SHARE_ICON}Ürünü Paylaş</button>
    </div></div>`}).join('') : `<div class="empty">${BOX}<div>Ürün bulunamadı</div></div>`;
  watch();
}
const io = ('IntersectionObserver' in window) ? new IntersectionObserver(es => {
  if(es[0].isIntersecting && shown < LIST.length){ shown += STEP; render(); }
}, {rootMargin:'900px'}) : null;
function watch(){
  if(!io){ if(shown < LIST.length){ shown = LIST.length; render(); } return; }
  io.unobserve($('more'));
  if(shown < LIST.length) io.observe($('more'));
}
function pickCat(k){
  cat = k; shown = STEP; $('q').value = '';
  drawChips(); render();
  const on = $('chips').querySelector('.chip.on'); if(on) on.scrollIntoView({inline:'center', block:'nearest'});
  scrollTo(0, 0); $('q').blur();
}
function zoom(id){
  const p = P[id]; if(!p || !p.resim) return;
  $('lbi').src = p.resim; $('lbn').textContent = p.ad; $('lbp').textContent = TL(p.satis) + ' / ' + unit(p);
  const c = costs ? costs[id] : null;
  const st = costs ? ` · Stok: ${fmtQ(stokOf(p))} ${unit(p)}` : '';
  $('lba').textContent = c === null ? '' : `Alış: ${TL(c)} · Kâr: ${TL(p.satis - c)}` + (c ? ` (%${Math.round((p.satis - c) / c * 100)})` : '') + st;
  openOv('lb'); ovPush('lb');
}
