/* ==== Sepet kontrol ==== */
function qctl(p, n, c){
  const mid = isMt(p)
    ? `<input class="qi" inputmode="decimal" value="${fmtQ(n)}" onfocus="this.select()" oninput="setQtyLive(${p.id},this.value)" onchange="setQty(${p.id},this.value)"><em class="mu">mt</em>`
    : `<span>${n} adet</span>`;
  return `<div class="${c}"><button onclick="add(${p.id},-1)">−</button>${mid}<button onclick="add(${p.id},1)">+</button></div>`;
}
function setQtyLive(id, v){
  const n = parseFloat(String(v).replace(',', '.'));
  if(!(n > 0)){ delete cart[id]; delete cartSel[id]; }
  else { cart[id] = Math.min(r2(n), 100000); if(cartSel[id] === undefined) cartSel[id] = true; }
  save(); saveSel(); sum();
  if($('cov').classList.contains('show')) updateCartAmounts();
}
function setQty(id, v){
  setQtyLive(id, v);
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
    return `<div class="ci${selected?'':' off'}" data-id="${id}">
      <label class="selbox"><input type="checkbox" ${selected?'checked':''} onchange="toggleSel(${id})"></label>
      <div class="im${p.resim?' z':''}" ${p.resim?`onclick="zoom(${id})"`:''}>${img(p)}</div>
      <div class="info"><b>${esc(p.ad)}</b><small>${TL(p.satis)} / ${unit(p)}</small></div>
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
  h += '<button class="lnk" onclick="cart={};cartSel={};save();saveSel();sum();render();drawCart()">Sepeti temizle</button>';
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

/* ==== Ürün render ==== */
function drawChips(){
  const cs = ['', ...new Set(P.map(p=>p.kat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
  $('chips').innerHTML = cs.map(c=>`<button class="chip ${c===cat?'on':''}" data-c="${esc(c)}">${c?esc(c):'Tümü'}</button>`).join('');
}
function drawSort(){
  $('ddl').textContent = SORTS[sort][0];
  $('ddm').innerHTML = Object.entries(SORTS).map(([k,v])=>`<button data-s="${k}" class="${k===sort?'sel':''}">${v[0]}${k===sort?'<svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="m5 12 5 5 9-10"/></svg>':''}</button>`).join('');
}
function render(){
  const q = $('q').value.toLowerCase().trim();
  const L = P.filter(p=>(!cat||p.kat===cat)&&p.ad.toLowerCase().includes(q)).sort(SORTS[sort][1]);
  $('cnt').textContent = L.length + ' ürün'; LIST = L;
  $('grid').innerHTML = L.length ? L.slice(0,shown).map(p=>{
    const n = cart[p.id], c = costs && costs[p.id];
    const isDirty = pending.added.some(x => x.id === p.id) || pending.edited.some(x => x.id === p.id);
    return `<div class="card${isDirty?' dirty':''}"><div class="ph${p.resim?' z':''}" ${p.resim?`onclick="zoom(${p.id})"`:''}>${BOX}${img(p)}${p.kat?`<span class="tag" data-k="${esc(p.kat)}" onclick="event.stopPropagation();pickCat(this.dataset.k)">${esc(p.kat)}</span>`:''}</div>
    <div class="bd"><div class="nm">${esc(p.ad)}</div><div class="pr">${TL(p.satis)}<span class="u"> / ${unit(p)}</span></div>
    ${costs?`<div class="adm"><span>Alış: ${TL(c)}</span><span>Kâr: <b>${TL(p.satis-c)}</b>${c?` (%${Math.round((p.satis-c)/c*100)})`:''}</span></div>`:''}
    ${(costs&&ghToken)?`<button class="btn ed" onclick="edit(${p.id})">Düzenle</button>`:''}
    ${n?qctl(p,n,'step')
       :`<button class="add" onclick="add(${p.id},1)"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Sepete ekle</button>`}
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
  $('lba').textContent = c === null ? '' : `Alış: ${TL(c)} · Kâr: ${TL(p.satis - c)}` + (c ? ` (%${Math.round((p.satis - c) / c * 100)})` : '');
  openOv('lb'); ovPush('lb');
}
