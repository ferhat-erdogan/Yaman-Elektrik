<?php
// php -S 127.0.0.1:4444 router.php  -> gizli dosyaları tarayıcıya kapatır
$p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#(urunler\.csv|build\.js|router\.php)$#i', $p) || preg_match('#/\.#', $p)) {
  http_response_code(403); echo 'Yasak'; return true;
}
return false;

