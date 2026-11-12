/* ==== Lightbox ==== */
$('lb').onclick = () => ovClose('lb');

/* ==== Yönetici giriş ==== */
$('lock').onclick = () => {
  if(costs){
    if(hasPending() && !confirm('Bekleyen değişiklikler var, çıkarsan kaybolur. Devam edilsin mi?')) return;
    costs = null; PW = ''; ghToken = '';
    try { sessionStorage.removeItem(ADMIN_PW_KEY); } catch(_){}
    try { sessionStorage.removeItem(GH_TOKEN_KEY); } catch(_){}
    try { sessionStorage.removeItem(COSTS_CACHE_KEY); } catch(_){}
    pending.products = pending.costs = false;
    pending.images.clear(); pending.deletedImages.clear();
    pending.added.length = 0; pending.edited.length = 0; pending.deleted.length = 0;
    setAdmin(false); toast('Çıkış yapıldı'); return;
  }
  $('pw').value = ''; $('gh_token').value = ''; $('err').textContent = '';
  $('pw').classList.remove('bad');
  openOv('lov'); setTimeout(()=>$('pw').focus(), 250);
};
$('lok').onclick = doLogin;
$('pw').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); $('gh_token').focus(); } };
$('gh_token').onkeydown = e => { if(e.key === 'Enter') doLogin(); };
$('lc').onclick = () => closeOv('lov');
$('lov').onclick = e => { if(e.target.id === 'lov') closeOv('lov'); };

/* ==== Sepet paneli ==== */
const openCart = () => { drawCart(); openOv('cov'); ovPush('cov'); };
$('fopen').onclick = openCart;
$('cx').onclick = () => ovClose('cov');
$('cov').onclick = e => { if(e.target.id === 'cov') ovClose('cov'); };
document.onkeydown = e => { if(e.key === 'Escape'){
  if($('lb').classList.contains('show')){ ovClose('lb'); return; }
  if($('cov').classList.contains('show')){ ovClose('cov'); return; }
  closeOv('lov'); closeOv('eov'); $('dd').classList.remove('open');
} };

/* ==== Yayınla ==== */
$('publishBtn').onclick = publish;

/* ==== Sayfadan çıkış uyarısı ==== */
window.addEventListener('beforeunload', (e) => {
  if(hasPending()){ e.preventDefault(); e.returnValue = ''; return ''; }
});

/* ==== PWA ==== */
let DP = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); DP = e; $('inst').style.display = ''; });
addEventListener('appinstalled', () => { DP = null; $('inst').style.display = 'none'; toast('Uygulama yüklendi'); });
$('inst').onclick = async () => { if(!DP) return; DP.prompt(); await DP.userChoice; DP = null; $('inst').style.display = 'none'; };

/* ==== Scroll + yukarı çık ==== */
addEventListener('scroll', () => $('top').classList.toggle('show', scrollY > 500), {passive:true});
$('top').onclick = () => scrollTo({top:0, behavior:'instant'});

/* ==== Arama, chip, sıralama ==== */
$('q').oninput = () => { shown = STEP; render(); };
$('chips').onclick = e => { const b = e.target.closest('.chip'); if(!b) return; pickCat(b.dataset.c); };
$('ddb').onclick = e => { e.stopPropagation(); $('dd').classList.toggle('open'); };
$('ddm').onclick = e => { const b=e.target.closest('button'); if(!b) return; sort=b.dataset.s; shown=STEP; drawSort(); $('dd').classList.remove('open'); render(); };
document.addEventListener('click', () => $('dd').classList.remove('open'));

/* ==== Başlat ==== */
async function init(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  try { P = await (await fetch('products.json?' + Date.now())).json(); } catch(e){ P = []; }
  drawChips(); drawSort(); render(); sum();
  updatePublishUI();

  let savedPw = null, savedTk = null, cached = null;
  try { savedPw = sessionStorage.getItem(ADMIN_PW_KEY); } catch(_){}
  try { savedTk = sessionStorage.getItem(GH_TOKEN_KEY); } catch(_){}
  try { cached = sessionStorage.getItem(COSTS_CACHE_KEY); } catch(_){}

  if(savedPw){
    if(savedTk) ghToken = savedTk;
    if(cached){
      try { costs = JSON.parse(cached); PW = savedPw; setAdmin(true); return; } catch(_){}
    }
    try {
      costs = await unlock(savedPw); PW = savedPw;
      try { sessionStorage.setItem(COSTS_CACHE_KEY, JSON.stringify(costs)); } catch(_){}
      setAdmin(true);
    } catch(_){
      try { sessionStorage.removeItem(ADMIN_PW_KEY); } catch(__){}
      try { sessionStorage.removeItem(COSTS_CACHE_KEY); } catch(__){}
    }
  }
}
init();
