/* ==== Canvas yardımcıları ==== */
function loadImage(src){
  return new Promise(res => {
    if(!src) return res(null);
    const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
  });
}
function drawImageContainBlur(ctx, im, x, y, w, h){
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.filter = 'blur(28px) brightness(0.55)';
  const scB = Math.max(w/iw, h/ih);
  ctx.drawImage(im, x + (w - iw*scB)/2, y + (h - ih*scB)/2, iw*scB, ih*scB);
  ctx.restore();
  const scC = Math.min(w/iw, h/ih);
  ctx.drawImage(im, x + (w - iw*scC)/2, y + (h - ih*scC)/2, iw*scC, ih*scC);
}
function wrapText(ctx, text, x, y, maxW, lineH){
  const words = String(text).split(' ');
  let line = '', curY = y;
  for(const word of words){
    const test = line ? line + ' ' + word : word;
    if(ctx.measureText(test).width > maxW && line){ ctx.fillText(line, x, curY); line = word; curY += lineH; }
    else line = test;
  }
  if(line) ctx.fillText(line, x, curY);
  return curY;
}
function roundRectPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y); ctx.closePath();
}
function drawSpacedText(ctx, text, x, y, spacing){
  let cx = x;
  for(const ch of text){ ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
}
function downloadFile(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
}

/* ==== Ürün paylaş görseli ==== */
async function shareProduct(id){
  const p = P[id]; if(!p) return;
  toast('Görsel hazırlanıyor…');
  try {
    const W = 1080, H = 1080, PAD = 70;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0e1a'); bg.addColorStop(0.55, '#0f172a'); bg.addColorStop(1, '#1a2332');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W/2, -200, 0, W/2, -200, W);
    glow.addColorStop(0, 'rgba(245,158,11,0.16)'); glow.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    const IMG_W = W - PAD*2, IMG_H = 560, IMG_Y = PAD + 20, R = 28;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    roundRectPath(ctx, PAD, IMG_Y, IMG_W, IMG_H, R);
    ctx.fillStyle = '#111827'; ctx.fill();
    ctx.restore();

    const im = await loadImage(p.resim);
    if(im){
      ctx.save(); roundRectPath(ctx, PAD, IMG_Y, IMG_W, IMG_H, R); ctx.clip();
      drawImageContainBlur(ctx, im, PAD, IMG_Y, IMG_W, IMG_H);
      ctx.restore();
    }
    roundRectPath(ctx, PAD, IMG_Y, IMG_W, IMG_H, R);
    ctx.strokeStyle = 'rgba(245,158,11,0.55)'; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 42px system-ui, -apple-system, "Segoe UI", sans-serif';
    const TX = PAD + 10, TW = W - PAD*2 - 20;
    const ny = IMG_Y + IMG_H + 55;
    const nameEnd = wrapText(ctx, p.ad, TX, ny, TW, 50);

    const py = nameEnd + 60;
    const priceGrad = ctx.createLinearGradient(TX, py, TX + 700, py + 80);
    priceGrad.addColorStop(0, '#fbbf24'); priceGrad.addColorStop(0.5, '#f59e0b'); priceGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = priceGrad;
    ctx.font = '800 84px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(TL(p.satis) + ' / ' + unit(p), TX, py);

    const BAND_H = 130, BAND_Y = H - BAND_H;
    ctx.fillStyle = 'rgba(245,158,11,0.65)'; ctx.fillRect(PAD, BAND_Y, W - PAD*2, 2);
    ctx.textBaseline = 'middle'; ctx.fillStyle = '#fbbf24';
    ctx.font = '700 34px system-ui, -apple-system, "Segoe UI", sans-serif';
    drawSpacedText(ctx, 'YAMAN ELEKTRİK', TX, BAND_Y + BAND_H/2, 10);

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if(!blob){ toast('Görsel oluşturulamadı'); return; }
    const file = new File([blob], 'yaman-urun.png', { type: 'image/png' });
    const shareText = location.origin + location.pathname;

    if(navigator.canShare && navigator.canShare({ files: [file] })){
      try { await navigator.share({ files: [file], text: shareText }); return; }
      catch(err){ if(err.name === 'AbortError') return; }
    }
    downloadFile(blob, 'yaman-urun.png');
    toast('Görsel indirildi');
    setTimeout(() => window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank'), 350);
  } catch(e){ console.error(e); toast('Paylaşım başarısız'); }
}

/* ==== Paylaş & Konum butonları ==== */
$('shar').onclick = () => {
  const text = SHARE_NAME + '\n\n' + location.href;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
};
$('loc').onclick = () => window.open('https://maps.google.com/?q=' + encodeURIComponent(LOC_QUERY), '_blank');
