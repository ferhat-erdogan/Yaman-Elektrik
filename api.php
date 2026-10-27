<?php
// Sadece yerelde (php -S) çalışır. Her yazma isteği parola ister:
// parola, costs.json'ı çözebiliyorsa doğrudur (ayrıca bir yerde saklanmaz).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
chdir(__DIR__);
if (isset($_GET['ping'])) { echo json_encode(['php' => true]); exit; }

function fail($m, $c = 400) { http_response_code($c); echo json_encode(['error' => $m], JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST gerekli', 405);
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) fail('Geçersiz istek');
$pw = (string)($in['pw'] ?? '');

// --- parola doğrulama ---
if (is_file('costs.json')) {
  $o = json_decode(file_get_contents('costs.json'), true);
  $raw = base64_decode($o['d']);
  $key = hash_pbkdf2('sha256', $pw, base64_decode($o['s']), 200000, 32, true);
  $ok = openssl_decrypt(substr($raw, 0, -16), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, base64_decode($o['i']), substr($raw, -16)) !== false;
  if (!$ok) { sleep(1); fail('Parola yanlış', 403); }
} elseif (strlen($pw) < 8) {
  fail('İlk kurulum: parola en az 8 karakter olmalı', 403);
}

function slug($s) {
  $s = strtr((string)$s, ['İ'=>'i','I'=>'i','ı'=>'i','Ç'=>'c','ç'=>'c','Ğ'=>'g','ğ'=>'g','Ö'=>'o','ö'=>'o','Ş'=>'s','ş'=>'s','Ü'=>'u','ü'=>'u']);
  $s = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($s)), '-');
  return substr($s, 0, 60) ?: 'urun';
}
// Linkteki resmi img/<kategori>/<urun-adi>.webp olarak indirir, yerel yolu döndürür
function fetch_image($url, $kat, $ad) {
  $ctx = stream_context_create(['http' => ['timeout' => 20, 'follow_location' => 1, 'max_redirects' => 5,
    'header' => "User-Agent: Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36\r\nAccept: image/*,*/*;q=0.8\r\n"]]);
  $max = 10 * 1024 * 1024;
  $data = @file_get_contents($url, false, $ctx, 0, $max + 1);
  if ($data === false || $data === '') fail('Resim indirilemedi, linki kontrol et');
  if (strlen($data) > $max) fail('Resim 10 MB\'tan büyük');
  $info = @getimagesizefromstring($data);
  if (!$info) fail('Bu link bir resim değil');
  $dir = 'img/' . slug($kat ?: 'diger');
  if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail('img klasörü oluşturulamadı', 500);
  $base = $dir . '/' . slug($ad);
  if (function_exists('imagecreatefromstring') && ($im = @imagecreatefromstring($data))) {
    $w = imagesx($im); $h = imagesy($im);
    if (max($w, $h) > 800) {                       // en fazla 800px
      $r = 800 / max($w, $h);
      if ($n = imagescale($im, (int)round($w * $r), (int)round($h * $r))) { imagedestroy($im); $im = $n; }
    }
    if (function_exists('imagewebp')) {
      imagepalettetotruecolor($im); imagealphablending($im, true); imagesavealpha($im, true);
      $path = $base . '.webp'; $ok = imagewebp($im, $path, 82);
    } else {
      $w = imagesx($im); $h = imagesy($im); $bg = imagecreatetruecolor($w, $h);
      imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255)); imagecopy($bg, $im, 0, 0, 0, 0, $w, $h);
      $path = $base . '.jpg'; $ok = imagejpeg($bg, $path, 85); imagedestroy($bg);
    }
    imagedestroy($im);
    if ($ok) return $path;
  }
  $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'][$info[2]] ?? null;
  if (!$ext) fail('Desteklenmeyen resim türü');
  file_put_contents($base . '.' . $ext, $data);   // GD yoksa olduğu gibi kaydet
  return $base . '.' . $ext;
}

// img/<kategori>/<ad>.<uzanti> biçimindeki yerel resmi, başka ürün kullanmıyorsa siler
function drop_image($p, $items) {
  if (!preg_match('#^img/[a-z0-9-]+/[a-z0-9-]+\.(webp|jpg|png|gif)$#', (string)$p)) return;
  foreach ($items as $it) if ($it['resim'] === $p) return;
  $f = __DIR__ . '/' . $p;
  if (is_file($f)) @unlink($f);
  @rmdir(dirname($f));   // klasör boşaldıysa kaldır
}

$num = fn($s) => (float)str_replace(',', '.', (string)$s);
$clean = fn($s) => trim(str_replace([';', "\r", "\n"], [',', ' ', ' '], (string)$s));

// --- CSV oku ---
$items = [];
if (is_file('urunler.csv')) {
  foreach (preg_split('/\r?\n/', file_get_contents('urunler.csv')) as $l) {
    if (trim($l) === '' || ltrim($l)[0] === '#') continue;
    $f = array_map('trim', explode(';', $l));
    $items[] = ['ad' => $f[0] ?? '', 'alis' => $num($f[1] ?? 0), 'satis' => $num($f[2] ?? 0), 'resim' => $f[3] ?? '', 'kat' => $f[4] ?? ''];
  }
}

// --- işlem ---
$act = $in['action'] ?? '';
$drop = null;
if ($act === 'save') {
  $it = $in['item'] ?? [];
  $row = ['ad' => $clean($it['ad'] ?? ''), 'alis' => $num($it['alis'] ?? 0), 'satis' => $num($it['satis'] ?? 0),
          'resim' => $clean($it['resim'] ?? ''), 'kat' => $clean($it['kat'] ?? '')];
  if ($row['ad'] === '') fail('Ürün adı gerekli');
  if ($row['satis'] <= 0) fail('Perakende fiyatı gerekli');
  if ($row['kat'] === '') fail('Kategori seçmek zorunlu');
  if (preg_match('#^https?://#i', $row['resim'])) $row['resim'] = fetch_image($row['resim'], $row['kat'], $row['ad']);
  $id = $it['id'] ?? null;
  if ($id === null) $items[] = $row;
  elseif (isset($items[(int)$id])) { $old = $items[(int)$id]['resim']; $items[(int)$id] = $row; if ($old !== $row['resim']) $drop = $old; }
  else fail('Ürün bulunamadı', 404);
} elseif ($act === 'delete') {
  $id = (int)($in['id'] ?? -1);
  if (!isset($items[$id])) fail('Ürün bulunamadı', 404);
  $drop = $items[$id]['resim'];
  array_splice($items, $id, 1);
} else {
  fail('Bilinmeyen işlem');
}

// --- dosyaları yaz ---
$csv = "# ad;alis;satis;resim_linki;kategori\n";
$pub = []; $costs = [];
foreach ($items as $i => $p) {
  $csv .= implode(';', [$clean($p['ad']), $p['alis'], $p['satis'], $clean($p['resim']), $clean($p['kat'])]) . "\n";
  $pub[] = ['id' => $i, 'ad' => $p['ad'], 'satis' => $p['satis'], 'resim' => $p['resim'], 'kat' => $p['kat']];
  $costs[] = $p['alis'];
}
$salt = random_bytes(16); $iv = random_bytes(12); $tag = '';
$key = hash_pbkdf2('sha256', $pw, $salt, 200000, 32, true);
$ct = openssl_encrypt(json_encode($costs), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, '', 16);
if ($ct === false) fail('Şifreleme başarısız (php openssl eksik olabilir)', 500);
file_put_contents('urunler.csv', $csv, LOCK_EX);
file_put_contents('products.json', json_encode($pub, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
file_put_contents('costs.json', json_encode(['s' => base64_encode($salt), 'i' => base64_encode($iv), 'd' => base64_encode($ct . $tag)]), LOCK_EX);
if ($drop) drop_image($drop, $items);
echo json_encode(['ok' => true, 'count' => count($items)]);

