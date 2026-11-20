# 🚀 Mastra AI Proje Rehberi

Bu proje, [Mastra.ai](https://mastra.ai) ile yapay zekâ özellikleri geliştirmeyi öğrenmek için hazırlanmış bir deneme projesidir. Amaç bir uygulamadan çok, projeyi **kurup çalıştırabildiğimizi göstermektir**.

İçinde iki özellik var:

- **AI Asistan:** Web arayüzünde sohbet edilen yapay zekâ asistanı.
- **Doküman Analizi:** API'ye bir PDF veya DOCX yüklenir; yapay zekâ projenin amacını, gereksinimlerini ve yapılacak işleri çıkarıp geri döner.

Bu rehber, hiç kodlama veya proje kurulumu tecrübesi olmayan kişiler için en basit ve anlaşılır haliyle hazırlanmıştır. Lütfen adımları sırayla, atlamadan takip edin.

---

## 🧩 Proje nasıl çalışıyor?

```
Tarayıcı (web :5173) ──► API (:3000) ──► Mastra (:4111) ──► OpenRouter (yapay zekâ modeli)
                           │                  └─ mastra.db (sohbet geçmişi, doküman vektörleri)
                           └─ PostgreSQL (kullanıcılar, yetkiler, dosya kayıtları)
```

| Klasör | Ne işe yarar |
|---|---|
| `apps/web` | Web arayüzü (React), `5173` portunda çalışır |
| `apps/api` | API (Elysia + Bun), `3000` portunda çalışır: giriş, yetki, dosyalar, AI uçları |
| `apps/mastra` | Mastra AI sunucusu, `4111` portunda çalışır: agent'lar, embedding, vektör deposu |
| `packages/database` | Veritabanı şeması, migration'lar ve örnek veriler |
| `config/apps/*` | Her uygulamanın `.env` ayar dosyaları |

---

## 🔧 1. Olmazsa Olmaz Programlar (Ön Gereksinimler)

Projeyi bilgisayarınızda çalıştırabilmeniz için ilk olarak şu programları kurmanız gerekiyor:

1. **Bun (Çalıştırma Ortamı)**: Projemizin kalbidir (1.3 veya üstü).
   - **Mac/Linux kullanıyorsanız** terminali açıp şunu yapıştırın:
     `curl -fsSL https://bun.sh/install | bash`
   - **Windows kullanıyorsanız** PowerShell'i yönetici olarak açıp şunu yapıştırın:
     `powershell -c "irm bun.sh/install.ps1 | iex"`

2. **Node.js (22.13 veya üstü)**: Mastra AI sunucusu bununla çalışır. [nodejs.org](https://nodejs.org) adresinden indirip kurun. Kurulu sürümü `node --version` ile görebilirsiniz.

3. **PostgreSQL (Veritabanı)**: Verilerin kaydedileceği yer.
   - Bilgisayarınıza [PostgreSQL](https://www.postgresql.org/download/) indirip kurun ("İleri, İleri" diyerek kurabilirsiniz).
   - Kurulum sırasında sizden bir şifre isteyecektir. Seçtiğiniz şifreyi not edin, kurulum adımlarında `.env` dosyasına yazacaksınız.

4. **Git**: Kod klasörünü bilgisayara indirebilmek için.
   - [git-scm.com](https://git-scm.com) adresinden indirip kolayca kurabilirsiniz.

5. **VS Code**: Kodlara bakmak için kullanacağımız editör. (Önerilen)

6. **OpenRouter anahtarı** (ücretsiz): AI özellikleri için gerekir. Nasıl alınacağı aşağıdaki **AI Asistan** bölümünde.

---

## 📦 2. Adım Adım Kurulum

### Adım 1: Projeyi Bilgisayarınıza İndirin
```bash
git clone https://github.com/ahmetsayran/mastra-ai.git
cd mastra-ai
```

### Adım 2: Gerekli Paketleri Yükleyin
Projemizin çalışması için internetteki bazı paketlere ihtiyacı var. Bunları tek bir komutla çekiyoruz:
```bash
bun install
```
*(Bu işlem internet hızınıza bağlı olarak 1-2 dakika sürebilir, bitmesini bekleyin.)*

### Adım 3: Ayar Dosyalarını Hazırlayın
Projeyi, kendi bilgisayarımızda çalışacak şekilde yapılandırmamız lazım. Terminale sırasıyla bunları yapıştırın:
```bash
cp config/apps/api/.env.example config/apps/api/.env
cp config/apps/web/.env.example config/apps/web/.env
cp config/apps/mastra/.env.example config/apps/mastra/.env
```
*(Windows'ta "cp çalışmıyor" hatası alırsanız, klasörün içine girip `.env.example` adlı dosyanın bir kopyasını oluşturup adını `.env` yapabilirsiniz.)*

Kopyaladıktan sonra şunlara dikkat edin:
- **`config/apps/mastra/.env`**: `OPENROUTER_API_KEY=` satırına anahtarınızı yazın (aşağıdaki **AI Asistan** bölümüne bakın).
- **`config/apps/api/.env`**: `DATABASE_URL` satırındaki `postgres:...@` kısmında, ikinci iki nokta ile `@` arasına PostgreSQL kurulumunda belirlediğiniz şifreyi yazın.
- **`config/apps/api/.env`**: `BETTER_AUTH_SECRET=` satırına uzun, rastgele bir metin yazın. Bilgisayarınızda denerken boş kalsa da çalışır, ama gerçek bir sunucuda mutlaka güçlü bir değer olmalıdır.
- **Redis gerekmez.** `REDIS_URL` satırı kapalı (başında `#`) gelir, öyle bırakın. Redis kurulu değilken bu satırı açarsanız giriş yaptıktan hemen sonra oturum düşer.

### Adım 4: Veritabanını Kurun
Tabloların oluşması ve örnek verilerin eklenmesi için terminale şu sırayla yazın (Önce PostgreSQL'in bilgisayarınızda çalışıyor olduğundan emin olun!):
```bash
cd packages/database
bun run prisma migrate dev
bun run seed
cd ../..
```
- `migrate dev` tabloları kurar.
- `seed` demo giriş hesabını (`admin@example.com`), bir test şirketini, ülke/şehir verilerini ve sahte kullanıcıları ekler (yaklaşık yarım dakika sürer). Sadece ilk kurulumda çalıştırmanız yeterli.

---

## 🎬 3. Projeyi Çalıştırma

Kurulum tamamen bitti! Artık projeyi başlatabiliriz. Ana proje klasöründe terminale şunu yazın:

```bash
bun run dev
```

Ekranda birkaç yazı belirecek ve yeşil yazılar göreceksiniz. Üç parça birlikte açılır:

| Adres | Ne |
|---|---|
| `http://localhost:5173` | **Siteye girmek için burası.** Karşınıza giriş ekranı çıkar. |
| `http://localhost:3000/swagger` | API'nin deneme sayfası (Swagger) |
| `http://localhost:4111` | Mastra Studio (yapay zekâ sunucusunun paneli) |

**Giriş bilgisi (demo):** `admin@example.com` / `password`

---

## 🤖 4. AI Asistan

1. https://openrouter.ai/keys adresinden ücretsiz bir anahtar alın.
2. Anahtarı `config/apps/mastra/.env` dosyasındaki `OPENROUTER_API_KEY=` satırına yazın.
3. `bun run dev` ile başlatın (zaten açıksa kapatıp tekrar açın).
4. http://localhost:5173 adresinde giriş yapıp **AI Asistan** sayfasını açın.

> **Ücretsiz hesabın sınırı:** OpenRouter ücretsiz modeller için günde yaklaşık 50 istek hakkı verir. Sohbet, doküman analizi ve doküman parçalarının vektöre çevrilmesi bu hakkı **birlikte** harcar. Hak dolunca `Rate limit exceeded` hatası görünür; ertesi gün sıfırlanır.

---

## 📄 5. Doküman Analizi

Bir PDF veya DOCX dokümanını API'ye yükleyin, yapay zekâ size şunları geri versin:

| Alan | Anlamı |
|---|---|
| `projectPurpose` | Projenin amacı (metin) |
| `requirements` | Projenin gereksinimleri (liste) |
| `actionItems` | Yapılması gereken işler (liste) |

Cevap **sadece** bu üç alandan oluşur:

```json
{ "projectPurpose": "metin", "requirements": ["metin"], "actionItems": ["metin"] }
```

### Nasıl çalışır?
```
Dosya yüklenir → metin çıkarılır → dosya kaydedilir → (çok uzunsa en ilgili parçalar seçilir) → yapay zekâ analiz eder → 3 alanlı cevap
```

### Nasıl kullanılır?
Önce giriş yapıp oturumu bir dosyaya kaydedin, sonra dokümanı gönderin (`dokuman.pdf` yerine kendi dosyanızı yazın):

```bash
curl -c cookie.txt -X POST http://localhost:3000/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

curl -b cookie.txt -F "file=@dokuman.pdf" http://localhost:3000/document-analysis
```

Ya da tarayıcıdan `http://localhost:3000/swagger` adresindeki **Document Analysis** bölümünü kullanabilirsiniz.

### Kurallar ve hatalar
- Sadece **PDF** ve **DOCX**, en fazla **50 MB**.
- Giriş yapmış ve dosya yükleme yetkisi olan bir kullanıcı gerekir (demo admin'de vardır).

| Cevap | Anlamı |
|---|---|
| `400` | Dosya PDF/DOCX değil, 50 MB'tan büyük veya içinden metin okunamadı |
| `401` | Giriş yapılmamış |
| `502` | Yapay zekâ cevap vermedi (ör. günlük ücretsiz limit doldu veya `OPENROUTER_API_KEY` yok) |

### Dosyalar nereye kaydedilir?
Yüklenen doküman projenin **Dosya Kütüphanesi**ne (`http://localhost:5173/file-library`, tür: *PROJECT DOCUMENT*) ve diskte `storage/projects/documents/` klasörüne kaydedilir. Analiz başarısız olursa kayıt geri silinir, tekrar denemede kopya oluşmaz. `storage/` klasörü Git'e eklenmez.

### Uzun dokümanlar (RAG)
Doküman yaklaşık **100 bin karakteri** (yaklaşık 50 sayfa) geçerse tamamı yapay zekâya gönderilmez:
1. Metin 8000 karakterlik parçalara bölünür.
2. Parçalar vektöre çevrilir (OpenRouter'ın ücretsiz `nvidia/nemotron-3.5-embed-8b:free` modeli) ve Mastra'nın veritabanında (`mastra.db`) dokümana özel bir indekste saklanır.
3. "Amaç", "gereksinimler" ve "yapılacak işler" sorularına en çok benzeyen parçalar bulunur ve sadece onlar analiz edilir.

Her parça bir OpenRouter isteği harcar. Ücretsiz embedding servisi bazen yavaştır (parça başına 20-30 saniyeye kadar), bu yüzden uzun bir dokümanın analizi birkaç dakika sürebilir. Ücretsiz günlük hakka sığması için yaklaşık **300 bin karaktere** (yaklaşık 150 sayfa) kadar doküman analiz edilebilir; daha büyüğü için OpenRouter'a kredi yüklemek gerekir.

---

## 🚨 6. Hata Çözüm Rehberi (Kurtarıcı Adımlar)

Eğer projenizi çalıştırırken veya kurarken bir şeyler ters giderse **paniğe kapılmayın**. En çok karşılaşılan sorunları nasıl çözeceğiniz aşağıda:

### 💡 "bun install" yaparken hata aldım / Paketler hatalı yüklendi!
Paketler yüklenirken bir şebeke problemi veya uyumsuzluk olmuş olabilir. En etkili çözüm "**Kapatıp Tekrar Açmak / Silip Yüklemek**"tir :)
Projenin ana klasöründeyken terminalde şunları yazarak temizleyip baştan yükleyin:

**Mac/Linux için:**
```bash
rm -rf node_modules
rm bun.lock
bun install
```

**Windows (PowerShell) için:**
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item -Force bun.lock
bun install
```
*(Bu komutlar eski bozuk kurulumu silerek `bun install` ile en temiz haliyle tekrar yükler.)*

### 💡 "Database Connection" (Veritabanı Bağlantı) Hatası
- PostgreSQL veritabanını kurduğunuzdan ve arka planda açık olduğundan emin olun.
- `config/apps/api/.env` dosyasındaki `DATABASE_URL` içinde PostgreSQL kurulumunda belirlediğiniz şifrenin yazdığından emin olun.

### 💡 Giriş ekranında `admin@example.com` ile giriş yapamıyorum
Örnek veriler eklenmemiş olabilir. Şunu çalıştırın:
```bash
cd packages/database
bun run seed
```

### 💡 Giriş yapıyorum ama hemen çıkış yapılıyor / oturum düşüyor
`config/apps/api/.env` dosyasında `REDIS_URL` satırı açık ama bilgisayarınızda Redis yok. Satırın başına `#` koyup `bun run dev`'i yeniden başlatın.

### 💡 AI cevap vermiyor / `502` / `Rate limit exceeded`
- `config/apps/mastra/.env` içindeki `OPENROUTER_API_KEY=` doluysa ve hata `Rate limit exceeded` ise ücretsiz günlük hakkınız dolmuştur. Ertesi gün sıfırlanır.
- Anahtar boşsa **AI Asistan** bölümündeki adımları yapın ve projeyi yeniden başlatın.

### 💡 Mastra (4111) açılmıyor
Node.js sürümünüz eski olabilir. `node --version` komutuyla bakın, 22.13 veya üstü olmalı.

### 💡 "Port 5173 / 3000 is already in use" (Port dolu) Hatası
Arka planda projeyi zaten çalıştırmışsınız veya başka bir program bu kanalları kullanıyor olabilir. Terminal'i tamamen kapatıp yeni bir terminal açarak tekrar deneyin.
