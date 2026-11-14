README.md

```markdown
# Yaman Elektrik

Elektrik malzemeleri satışı için **statik, PWA (Progressive Web App)** ürün kataloğu ve sepet sistemi. GitHub Pages üzerinde barındırılır; sunucu, veritabanı veya backend gerektirmez. Tüm veriler GitHub deposundaki `products.json` ve şifreli `costs.json` dosyalarında tutulur.

**Canlı:** https://ferhat-erdogan.github.io/Yaman-Elektrik

---

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji](#teknoloji)
- [Dosya Yapısı](#dosya-yapısı)
- [Kurulum](#kurulum)
- [Yönetici Modu](#yönetici-modu)
- [Yayınlama (Publish)](#yayınlama-publish)
- [Şifre Yönetimi](#şifre-yönetimi)
- [Stok Yönetimi](#stok-yönetimi)
- [URL Parametreleri](#url-parametreleri)
- [Gizli Özellik: #ozet](#gizli-özellik-ozet)
- [PWA Kurulumu](#pwa-kurulumu)
- [Teknik Notlar](#teknik-notlar)
- [Katkıda Bulunma](#katkıda-bulunma)
- [Lisans](#lisans)

---

## Özellikler

### Herkese açık (müşteri)

- **Ürün kataloğu** — Kategori chip'leri, arama, sıralama (son eklenen / ada göre / fiyata göre)
- **Kategori filtresi** — "Kablo", "Ampul", "Sigorta", "Anahtar-Priz" vb.
- **Arama** — Ürün adında anlık filtreleme
- **Sepet** — Adet/metre bazlı, ürün seç/kaldır, canlı toplam
- **Manuel adet girişi** — Sepette ve anasayfada stepper'daki sayıya tıklayıp elle yazma (mt ürünlerde ondalık)
- **Stok durumu** — Stokta olmayan ürünler "STOK YOK" badge'i ile işaretlenir, sepete eklenemez
- **Resim büyütme** — Ürün resmine tıklayınca lightbox açılır
- **WhatsApp paylaşımı** — Sepeti veya tek ürünü görsel olarak paylaş (Canvas ile üretilen görsel)
- **Sipariş gönder** — Sepeti doğrudan dükkâna WhatsApp mesajı olarak yollar
- **Konum** — Google Maps ile dükkân konumu
- **PWA** — Ana ekrana eklenebilir, offline çalışır (service worker cache)
- **Paylaşılabilir URL** — `?kategori=` ve `?search=` parametreleri ile filtreli link paylaşımı

### Yönetici (parola + opsiyonel GitHub token)

- **Şifreli alış fiyatları** — AES-GCM + PBKDF2 (200k iterasyon), `costs.json` içinde şifreli
- **Stok adetleri** — Ürün başına sayısal stok, sadece admin görür
- **Stok sıralaması** — "Stok: düşükten yükseğe" / "yüksekten düşüğe" (admin dropdown'ında)
- **Stok düş/ekle** — Sepette toplu, atomik, onay pencereli
- **Ürün ekle/düzenle/sil** — Bellekte tutulur, "Yayınla" ile GitHub'a gönderilir
- **Ürün resmi yükle** — 800px WebP'e dönüştürülür, GitHub'a binary olarak yüklenir
- **Bekleyen değişiklik takibi** — Publish öncesi ne değişti özetlenir
- **Gizli stok değerleme** — `#ozet` ile kategori bazlı + genel özet

---

## Teknoloji

- **Saf HTML/CSS/JS** — Framework yok, build adımı yok (sadece `build.js` şifre yönetimi için)
- **Vanilla JS** — Modüler script dosyaları (`app-config.js`, `app-state.js` vb.)
- **GitHub API** — `products.json`, `costs.json` ve resimlerin doğrudan repo'ya yazılması
- **GitHub Pages** — Statik barındırma
- **Web Crypto API** — AES-256-GCM şifreleme (fallback: `crypto-fallback.js` bundled @noble/ciphers)
- **Service Worker** — Cache-first (resimler) / network-first (veri) stratejisi
- **Canvas API** — Paylaşım görselleri
- **PWA** — Manifest, apple-touch, theme-color

---

## Dosya Yapısı

```

Yaman-Elektrik/
├── index.html              # Ana sayfa (tüm modaller burada)
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker
├── products.json           # Ürün listesi (herkese açık, resimler + fiyatlar + stok adedi)
├── costs.json              # Şifreli alış fiyatları (AES-GCM)
├── build.js                # Node CLI: şifre değiştirme / ilk oluşturma
├── crypto-fallback.js      # Web Crypto olmayan tarayıcılar için fallback (bundled @noble/ciphers)
├── css/
│   └── style.css           # Tüm stiller
├── js/
│   ├── app-config.js       # Sabitler, yardımcılar, SORTS, URL params
│   ├── app-state.js        # Global state, pending (bekleyen değişiklikler), cart
│   ├── app-github.js       # GitHub API, şifreleme, resim işleme
│   ├── app-render.js       # Grid render, sepet, stok düş/ekle
│   ├── app-admin.js        # Admin login, ürün düzenleme, publish
│   ├── app-share.js        # Canvas paylaşım görselleri, WhatsApp
│   └── app-ui.js           # Modaller, olay dinleyicileri, init, #ozet
├── icons/                  # PWA ikonları
└── img/                    # Ürün resimleri (kategori klasörlerinde)
├── kablo/
├── ampul/
├── sigorta/
└── ...

```

---

## Kurulum

### 1. Repo'yu klonla

```bash
git clone https://github.com/ferhat-erdogan/Yaman-Elektrik.git
cd Yaman-Elektrik
```

2. GitHub Pages'i aç

Repo → Settings → Pages → Source: Deploy from a branch → Branch: main → / (root).

3. Yerel geliştirme

Sunucu gerekmez ama crypto.subtle için HTTPS veya localhost zorunlu:

```bash
# Node varsa:
npx serve .

# veya Python:
python -m http.server 8000

# Tarayıcıda:
# http://localhost:8000
```

4. İlk şifre

Repo'da costs.json yoksa veya sıfırdan başlanıyorsa:

```bash
node build.js
```

· Parola en az 8 karakter olmalı
· products.json'daki ürün sayısı kadar sıfır dizi oluşturulur
· Sonra admin panelinden alış fiyatlarını girersin

---

Yönetici Modu

Giriş

Sağ üstteki 🔒 butonuna bas → parola gir.

İki seviye yetki var:

Yetki Parola Parola + Token
Alış fiyatlarını gör ✅ ✅
Stok adetlerini gör ✅ ✅
Stok sıralaması ✅ ✅
Stok düş/ekle ❌ ✅
Ürün düzenle ❌ ✅
Yeni ürün ekle ❌ ✅
Yayınla ❌ ✅

GitHub Token (yazma işlemleri için)

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Generate new token
3. Repository access: Only select repositories → Yaman-Elektrik
4. Permissions → Repository permissions → Contents: Read and write
5. Oluştur → token'ı kopyala (bir daha gösterilmez)
6. Sitede giriş ekranında GitHub Token alanına yapıştır

Token formatı: github_pat_... veya ghp_...

Çıkış

Aynı 🔒 butonuna bas → çıkış yapar. Bekleyen değişiklik varsa uyarı verir, kaybolmasın diye.

---

Yayınlama (Publish)

Admin panelinde yaptığın değişiklikler önce bellekte tutulur, GitHub'a hemen gitmez:

1. Ürün düzenle / stok düş / stok ekle → pending (bekleyen) durumuna geçer
2. Üstteki kırmızı bant "N bekleyen değişiklik" gösterir
3. Yayınla butonuna bas → onay ekranı açılır → onayla
4. GitHub'a sırayla gönderilir:
   · Yeni resimler
   · Silinecek resimler
   · products.json
   · costs.json (yeniden şifrelenir)
5. Tamamlandığında toast gösterilir

Pending özeti

· +N — Eklenen ürün
· ~N — Düzenlenen ürün
· -N — Silinen ürün
· Stok: N — Stok değişikliği sayısı
· Yeni resim: N / Silinecek resim: N

Yayın sırasında

· Progress bar + adım metni görünür
· Yayınla butonu kilitlenir
· Hata olursa toast ile bildirilir, pending korunur (tekrar denenebilir)

---

Şifre Yönetimi

İlk oluşturma

```bash
node build.js
```

· costs.json yoksa: parola sorar, ürün sayısı kadar sıfırla oluşturur
· products.json yoksa uyarır ama devam eder

Şifre değiştirme

```bash
node build.js
```

· costs.json varsa: eski parola + yeni parola sorar
· Eski parola doğrulanır, veri çözülür
· Yeni parola ile yeniden şifrelenir
· Not: Sadece yerel dosyayı değiştirir → git add costs.json && git commit && git push gerekli

Şifreleme detayları

· Algoritma: AES-256-GCM
· Anahtar türetme: PBKDF2-HMAC-SHA256, 200.000 iterasyon, 16-byte salt
· IV: Her şifrelemede rastgele 12 byte
· Auth tag: Otomatik (GCM)
· Base64 ile JSON'a yazılır: { "s": salt, "i": iv, "d": veri+tag }

costs.json çözülünce alış fiyatları dizisi ([15, 22, 5, ...]) döner. products.json'daki ürün sırasıyla birebir eşleşir (id'ler üzerinden).

⚠️ Önemli: Ürün silinirse costs.json da o indeks kadar kaydırılır (kod otomatik yapar). Dışarıdan costs.json'u elle düzenleme — ürün sırasını bozarsın.

---

Stok Yönetimi

Stok adedi products.json içindeki stokAdet alanındadır. Herkese açık dosyada durur ama UI'da sadece admin görür.

ℹ️ Gizlilik: products.json GitHub'da public olduğu için kaynağa bakan biri stok adetlerini görebilir. Bu bilinçli bir tercihtir — UI'da gizli, dosyada açık.

Stok kuralları

· stokAdet = 0 → normal kullanıcı sepete ekleyemez, "STOK YOK" badge'i görünür
· stokAdet > 0 → normal davranış
· Admin, stok 0 olsa bile sepete ekleyebilir (stok düş/ekle testi için)
· Sipariş geldiğinde stok otomatik düşmez — admin manuel düşürür

Stok düş/ekle (admin, sepette)

· Sepette toplu buton: − Stoktan düş / + Stoğa ekle
· Onay penceresi: kaç ürün, kaç adet gösterilir
· Atomik: Stok düş işleminde bir ürün bile yetersizse hiçbiri düşmez, hata toast'ı çıkar
· Ekle işleminde limit yok
· İşlem pending olur → "Yayınla" gerekli

Stok düzenleme (admin, ürün formunda)

Ürün ekle/düzenle modalında − 5 + şeklinde sayısal input. Enter veya Tab gerekmez, her tuş canlı.

Migration

Eski products.json'da stok: "var" | "yok" alanı varsa, ilk yüklemede otomatik olarak:

· "var" → stokAdet: 1
· "yok" → stokAdet: 0

olarak dönüştürülür (bellekte). İlk "Yayınla"da products.json'a yeni format yazılır.

---

URL Parametreleri

Filtrelenmiş linkler paylaşılabilir:

Kategori

```
https://ferhat-erdogan.github.io/Yaman-Elektrik?kategori=Ampul
```

→ Açılınca Ampul kategorisi seçili gelir.

Arama

```
https://ferhat-erdogan.github.io/Yaman-Elektrik?search=Ovivo
```

→ Açılınca arama kutusunda Ovivo yazar, o ürünler listelenir.

Kategori + Arama (AND)

```
https://ferhat-erdogan.github.io/Yaman-Elektrik?kategori=Ampul&search=Cata
```

→ Ampul kategorisinde, adında cata geçen ürünler.

Notlar

· URL, kullanıcı kategori/arama değiştirdikçe otomatik güncellenir (history.replaceState)
· Paylaş butonu mevcut URL'i paylaşır → alıcı aynı filtreli görünümü görür
· Kategori silinmişse param yok sayılır, ana sayfa açılır
· "Tümü" chip'ine tıklayınca URL'den kategori parametresi kalkar
· Arama kutusunu boşaltınca URL'den search parametresi kalkar

---

Gizli Özellik: #ozet

Sadece admin girişliyken çalışan stok değerleme aracı.

Kullanım

1. Parola ile giriş yap (token gerekmez)
2. Arama kutusuna #ozet yaz
3. Modal açılır, arama kutusu otomatik temizlenir

İçerik

Kategori bazlı kartlar (satış değeri en yüksekten küçüğe):

```
┌─ Kablo ────────────── 12 ürün · 320 mt ─┐
│  Alış    6.400,00 ₺                     │
│  Satış   8.900,00 ₺                     │
│  Kâr     2.500,00 ₺              %39.1  │
└─────────────────────────────────────────┘
```

Genel özet (en altta):

```
Alış Değeri      11.600,00 ₺
Satış Değeri     16.700,00 ₺
Tahmini Kâr       5.100,00 ₺
Kâr Marjı              %44.0

89 ürün · 407 adet/mt · 4 ürün stok yok · 2 ürün alış eksik
```

Hesaplama

Alan Formül
Alış Değeri Σ stokAdet[i] × alis[i]
Satış Değeri Σ stokAdet[i] × satis[i]
Tahmini Kâr Satış − Alış
Kâr Marjı Kâr / Alış × 100

Notlar

· Alış fiyatı 0 olan ürünler hesaba 0 olarak katılır, altta "N ürün alış eksik" uyarısı çıkar
· Stok 0 ürünler değere 0 katkı yapar
· Kategori sırası: satış değerine göre büyükten küçüğe
· Escape ile kapanır
· Normal kullanıcı #ozet yazsa hiçbir şey olmaz (normal arama davranır)

---

PWA Kurulumu

Site, tarayıcıdan "Ana ekrana ekle" ile yüklenebilir:

· Chrome (Android): Menü → "Ana ekrana ekle" veya "Uygulamayı yükle"
· Safari (iOS): Paylaş → "Ana Ekrana Ekle"
· Chrome/Edge (Masaüstü): Adres çubuğunun sağındaki "Yükle" ikonu

Kurulduktan sonra:

· Offline çalışır (son ziyaret edilen ürünler)
· Ana ekrandan doğrudan açılır
· Bildirim çubuğunda "Yaman Elektrik" başlığıyla görünür

Service Worker cache stratejisi

· HTML, CSS, JS, JSON: Network-first (internet varsa hep güncel, yoksa cache)
· Resimler (/img/): Stale-while-revalidate (cache'ten hemen göster, arkada güncelle)
· api.php, POST istekleri: SW devreye girmez
· Maksimum resim cache: 400 adet (sonrası FIFO)

---

Teknik Notlar

crypto.subtle zorunluluğu

· HTTPS veya localhost üzerinden çalışır
· LAN IP'si (http://192.168.x.x:8000) üzerinden açılırsa crypto.subtle yok → yazma işlemleri hata verir
· Sadece okuma için fallback (crypto-fallback.js) devreye girer, unlock() çalışır
· Publish için HTTPS şart

Bekleyen değişikliklerin kaybı

· Sayfa yenilenirse pending kaybolur (beforeunload uyarısı vardır ama mobilde her zaman çalışmaz)
· Önemli değişiklikten sonra hemen Yayınla yap, tarayıcıyı kapatma
· Yayınla butonu sadece parola + token girişliyken görünür

Yayın atomikliği

· Yayın sırasında kısmi hata olabilir (ör. resim gitti, products.json gitmedi)
· Bir sonraki publish'te kalan dosyalar gönderilir
· Alternatif: GitHub Git Trees API ile tek commit (şu an yok)

products.json sıra bağımlılığı

· costs.json ürün sırasıyla id üzerinden eşleşir
· Ürün silindiğinde costs.json de kaydırılır (kod otomatik yapar)
· Manuel products.json düzenleme → alış fiyatları yanlış ürüne düşer

Eski tarayıcı desteği

· Modern tarayıcılar (Chrome 90+, Safari 14+, Firefox 90+)
· IntersectionObserver, crypto.subtle, URLSearchParams kullanılır
· IE desteklenmez

---

Katkıda Bulunma

Bu proje tek bir işletme için kişisel bir katalogdur. Fork'layıp kendine uyarlayabilirsin:

1. js/app-config.js → GITHUB_OWNER, GITHUB_REPO, PHONE, SHARE_NAME, LOC_QUERY güncelle
2. manifest.webmanifest → name, short_name, ikonlar
3. icons/ → kendi ikonlarını koy
4. products.json → kendi ürünlerini ekle
5. node build.js ile yeni şifre oluştur

---

Lisans

Özel kullanım. Ticari kullanım için iletişime geç.

---

İletişim

Yaman Elektrik

· 📍 Çarşı Mahallesi 1818 Sokak No:45/C Şehzadeler / Manisa
· 📞 Ferhat Erdoğan — 0534 638 15 42
· 📞 Murat Erdoğan — 0534 715 13 45

---

<p align="center">
  <sub>© Yaman Elektrik · Ferhat Erdoğan</sub>
</p>
```

---
