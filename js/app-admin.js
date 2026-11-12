/* ==== Bellekte kaydet / sil ==== */
function queueSave(item, imageCanvas){
  if(!item.ad.trim()) throw new Error('Ürün adı gerekli');
  if(!(item.satis > 0)) throw new Error('Perakende fiyatı gerekli');
  if(!item.kat.trim()) throw new Error('Kategori zorunlu');

  let resimYolu = item.resim || '';
  const eskiResim = (item.id !== null && item.id !== undefined) ? (P[item.id] && P[item.id].resim) : '';

  if(imageCanvas){
    const path = `img/${slug(item.kat)}/${slug(item.ad)}.webp`;
    pending.images.set(path, imageCanvas);
    resimYolu = path;
    if(eskiResim && eskiResim.startsWith('img/') && eskiResim !== path){
      pending.deletedImages.add(eskiResim);
    }
  }

  if(item.id === null || item.id === undefined){
    const id = P.length;
    P.push({ id, ad: item.ad, satis: item.satis, resim: resimYolu, kat: item.kat });
    costs.push(item.alis);
    pending.added.push({ id, ad: item.ad });
  } else {
    const oldId = Number(item.id);
    P[oldId] = { id: oldId, ad: item.ad, satis: item.satis, resim: resimYolu, kat: item.kat };
    costs[oldId] = item.alis;
    const aidx = pending.added.findIndex(x => x.id === oldId);
    if(aidx >= 0){
      pending.added[aidx].ad = item.ad;
    } else {
      const eidx = pending.edited.findIndex(x => x.id === oldId);
      if(eidx >= 0){ pending.edited[eidx].ad = item.ad; }
      else { pending.edited.push({ id: oldId, ad: item.ad }); }
    }
  }
  pending.products = true;
  pending.costs = true;
  updatePublishUI();
}
function queueDelete(id){
  id = Number(id);
  const urun = P[id];
  if(!urun) return;
  const silinenResim = urun.resim || '';
  const silinenAd = urun.ad;

  P.splice(id, 1);
  costs.splice(id, 1);
  P = P.map((p, i) => ({ ...p, id: i }));

  if(silinenResim.startsWith('img/')){
    pending.deletedImages.add(silinenResim);
    if(pending.images.has(silinenResim)) pending.images.delete(silinenResim);
  }
  const aidx = pending.added.findIndex(x => x.ad === silinenAd);
  if(aidx >= 0){
    pending.added.splice(aidx, 1);
    pending.deletedImages.delete(silinenResim);
    pending.products = true; pending.costs = true;
    updatePublishUI();
    return;
  }
  const eidx = pending.edited.findIndex(x => x.ad === silinenAd);
  if(eidx >= 0) pending.edited.splice(eidx, 1);
  pending.deleted.push({ ad: silinenAd });
  pending.products = true; pending.costs = true;
  updatePublishUI();
}

/* ==== YAYINLA ==== */
async function publish(){
  if(!ghToken) throw new Error('GitHub token yok');
  if(!costs) throw new Error('Parola ile giriş yap');
  if(!hasPending()) return;

  const overlay = $('publishOverlay');
  const bar = overlay.querySelector('.bar');
  const status = $('publishStatus');
  const publishBtn = $('publishBtn');
  overlay.classList.add('show');
  publishBtn.disabled = true;

  const imgCount = pending.images.size;
  const delCount = pending.deletedImages.size;
  const totalSteps = imgCount + delCount + 2;
  let doneSteps = 0;
  const setProgress = (msg) => {
    doneSteps++;
    const pct = Math.min(100, Math.round(doneSteps / totalSteps * 100));
    bar.style.width = pct + '%';
    status.textContent = msg;
  };

  try {
    let i = 0;
    for(const [path, canvas] of pending.images){
      i++;
      setProgress(`Resim yükleniyor… (${i}/${imgCount}) — ${path.split('/').pop()}`);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.82));
      if(!blob) throw new Error('WebP oluşturulamadı: ' + path);
      const buf = new Uint8Array(await blob.arrayBuffer());
      const b64data = bytesToB64(buf);
      let sha = null;
      try { const g = await ghGet(path); sha = g.sha; } catch(_){}
      await ghPutBinary(path, b64data, sha, 'resim: ' + path);
    }
    let j = 0;
    for(const path of pending.deletedImages){
      j++;
      const hala = P.some(p => p.resim === path);
      if(hala){
        doneSteps++;
        bar.style.width = Math.round(doneSteps / totalSteps * 100) + '%';
        continue;
      }
      setProgress(`Eski resim siliniyor… (${j}/${delCount}) — ${path.split('/').pop()}`);
      try { const fr = await ghGet(path); if(fr.sha) await ghDelete(path, fr.sha, 'resim silindi: ' + path); } catch(_){}
    }

    const commitMsg = buildCommitMessage();

    setProgress('products.json yazılıyor…');
    {
      const gp = await ghGet('products.json');
      await ghPutText('products.json', JSON.stringify(P), gp.sha, commitMsg);
    }
    setProgress('costs.json şifreleniyor…');
    {
      const enc = await encryptCosts(costs, PW);
      const gc = await ghGet('costs.json');
      await ghPutText('costs.json', JSON.stringify(enc), gc.sha, commitMsg);
    }
    setProgress('Tamamlandı ✅');
    bar.style.width = '100%';

    pending.products = false; pending.costs = false;
    pending.images.clear(); pending.deletedImages.clear();
    pending.added.length = 0; pending.edited.length = 0; pending.deleted.length = 0;
    updatePublishUI(); render();
    try { sessionStorage.setItem(COSTS_CACHE_KEY, JSON.stringify(costs)); } catch(_){}
    setTimeout(() => {
      overlay.classList.remove('show');
      bar.style.width = '0';
      status.textContent = 'Hazırlanıyor…';
    }, 700);
    toast('Değişiklikler yayınlandı');
  } catch(e){
    overlay.classList.remove('show');
    bar.style.width = '0';
    publishBtn.disabled = false;
    console.error(e);
    toast('Yayınlama hatası: ' + (e.message || '').slice(0, 60));
  }
}

/* ==== Yönetici ==== */
function setAdmin(on){
  $('lock').classList.toggle('on', on);
  $('lockt').textContent = on ? 'Çıkış' : 'Giriş';
  $('newb').style.display = (on && ghToken) ? '' : 'none';
  updatePublishUI();
  render();
}
async function doLogin(){
  const pw = $('pw').value;
  const tk = $('gh_token').value.trim();
  if(!pw){ $('err').textContent = 'Parola gerekli'; return; }
  $('lok').disabled = true; $('lok').textContent = 'Doğrulanıyor…';
  $('err').textContent = ''; $('pw').classList.remove('bad');
  try {
    costs = await unlock(pw); PW = pw;
    if(tk){
      if(!/^(github_pat_|ghp_)/.test(tk)) throw new Error('Token github_pat_ veya ghp_ ile başlamalı');
      ghToken = tk;
      try { sessionStorage.setItem(GH_TOKEN_KEY, tk); } catch(_){}
    }
    try { sessionStorage.setItem(ADMIN_PW_KEY, pw); } catch(_){}
    try { sessionStorage.setItem(COSTS_CACHE_KEY, JSON.stringify(costs)); } catch(_){}
    closeOv('lov'); setAdmin(true);
    toast(ghToken ? 'Yönetici modu (yazma yetkili)' : 'Yönetici modu (sadece okuma)');
  } catch(e){
    const msg = (e && e.name === 'OperationError') ? 'Parola yanlış, tekrar dene.' : (e && e.message) || 'Giriş yapılamadı';
    $('err').textContent = msg;
    if(e && e.name === 'OperationError') $('pw').classList.add('bad');
  }
  $('lok').disabled = false; $('lok').textContent = 'Giriş yap';
}

/* ==== Ürün düzenleme ==== */
let editId = null, delArm = false;
function edit(id){
  if(!ghToken){ toast('Düzenleme için GitHub token gerekli'); return; }
  editId = id; delArm = false;
  const p = (id === null) ? {ad:'',satis:'',resim:'',kat:''} : P[id];
  $('etitle').textContent = (id === null) ? 'Yeni ürün' : 'Ürünü düzenle';
  $('f_ad').value = p.ad || '';
  $('f_alis').value = (id === null) ? '' : (costs ? costs[id] : '');
  $('f_satis').value = p.satis || '';
  $('f_resim_file').value = '';

  const prev = $('f_resim_prev');
  if(p.resim){
    prev.classList.remove('empty');
    prev.innerHTML = `<img src="${esc(p.resim)}" alt="" onerror="this.style.display='none'">
      <div class="prev-info"><b>Mevcut resim</b><small>${esc(p.resim)}</small></div>`;
  } else {
    prev.classList.add('empty');
    prev.innerHTML = `<div class="prev-info"><small>Henüz resim yok — aşağıdan seç</small></div>`;
  }
  $('f_kat').value = p.kat || '';
  $('edel').style.display = (id === null) ? 'none' : '';
  $('edel').textContent = 'Sil';
  $('edel').classList.remove('arm');
  $('eerr').textContent = '';
  drawKch();
  openOv('eov');
}
function drawKch(){
  $('f_kat').classList.remove('bad');
  const v = $('f_kat').value.trim().toLowerCase();
  const cs = [...new Set(P.map(x => x.kat).filter(Boolean))].sort((a,b) => a.localeCompare(b,'tr'));
  $('kch').innerHTML = cs.length
    ? cs.map(k => `<button type="button" class="chip ${k.toLowerCase()===v?'on':''}" data-k="${esc(k)}">${esc(k)}</button>`).join('')
    : '<small>Henüz kategori yok, yukarıya yazarak oluştur.</small>';
}

/* ==== Admin event'leri ==== */
$('kch').onclick = e => { const b = e.target.closest('.chip'); if(!b) return; $('f_kat').value = b.dataset.k; drawKch(); };
$('f_kat').oninput = drawKch;
$('newb').onclick = () => edit(null);

$('esave').onclick = async () => {
  const item = {
    id: editId,
    ad: $('f_ad').value.trim(),
    alis: parseFloat(String($('f_alis').value).replace(',', '.')) || 0,
    satis: parseFloat(String($('f_satis').value).replace(',', '.')) || 0,
    resim: (editId !== null && P[editId]) ? (P[editId].resim || '') : '',
    kat: $('f_kat').value.trim()
  };
  if(!item.ad){ $('eerr').textContent = 'Ürün adı gerekli.'; return; }
  if(!item.kat){ $('eerr').textContent = 'Kategori seçmek zorunlu.'; $('f_kat').classList.add('bad'); return; }
  if(!(item.satis > 0)){ $('eerr').textContent = 'Perakende fiyatı gerekli.'; return; }

  const file = $('f_resim_file').files[0];
  $('esave').disabled = $('edel').disabled = true;
  $('eerr').textContent = '';
  $('esave').textContent = 'İşleniyor…';
  try {
    let canvas = null;
    if(file) canvas = await processImageFromFile(file);
    queueSave(item, canvas);
    closeOv('eov');
    drawChips(); render(); sum();
    toast('Belleğe kaydedildi — "Yayınla" ile gönder');
  } catch(e){
    console.error(e);
    $('eerr').textContent = e.message || 'Kaydetme başarısız';
  }
  $('esave').disabled = $('edel').disabled = false;
  $('esave').textContent = 'Belleğe Kaydet';
};
$('edel').onclick = async () => {
  if(!delArm){ delArm = true; $('edel').textContent = 'Emin misin? Sil'; $('edel').classList.add('arm'); return; }
  try {
    queueDelete(editId);
    cart = {}; cartSel = {}; save(); saveSel();
    closeOv('eov');
    drawChips(); render(); sum();
    toast('Bellekten silindi — "Yayınla" ile gönder');
  } catch(e){ $('eerr').textContent = e.message; }
};
$('ec').onclick = () => closeOv('eov');
$('eov').onclick = e => { if(e.target.id === 'eov') closeOv('eov'); };
