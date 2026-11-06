# 🚀 Proje Başlangıç Rehberi

Bu rehber, hiç kodlama veya proje kurulumu tecrübesi olmayan kişiler için en basit ve anlaşılır haliyle hazırlanmıştır. Lütfen adımları sırayla, atlamadan takip edin.

---

## 🔧 1. Olmazsa Olmaz Programlar (Ön Gereksinimler)

Projeyi bilgisayarınızda çalıştırabilmeniz için ilk olarak şu programları kurmanız gerekiyor:

1. **Bun (Çalıştırma Ortamı)**: Projemizin kalbidir.
   - **Mac/Linux kullanıyorsanız** terminali açıp şunu yapıştırın:
     `curl -fsSL https://bun.sh/install | bash`
   - **Windows kullanıyorsanız** PowerShell'i yönetici olarak açıp şunu yapıştırın:
     `powershell -c "irm bun.sh/install.ps1 | iex"`
   
2. **PostgreSQL (Veritabanı)**: Verilerin kaydedileceği yer.
   - Bilgisayarınıza [PostgreSQL](https://www.postgresql.org/download/) indirip kurun ("İleri, İleri" diyerek kurabilirsiniz).
   - Kurulum sırasında sizden bir şifre isteyecektir. Bu şifreyi **`postgres`** olarak ayarlarsanız kurulumda hiçbir dosya değiştirmenize gerek kalmaz.

3. **Git**: Kod klasörünü bilgisayara indirebilmek için.
   - [git-scm.com](https://git-scm.com) adresinden indirip kolayca kurabilirsiniz.

4. **VS Code**: Kodlara bakmak için kullanacağımız editör. (Önerilen)

---

## 📦 2. Adım Adım Kurulum

### Adım 1: Projeyi Bilgisayarınıza İndirin
cd <projenin-klasor-ismi>

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

### Adım 4: Veritabanını Kurun
Veritabanımızdaki tabloların otomatik oluşması için terminale şu sırayla yazın (Önce PostgreSQL'in bilgisayarınızda çalışıyor olduğundan emin olun!):
```bash
cd packages/database
bun run prisma migrate dev
bun run prisma generate
cd ../..
```

---

## 🎬 3. Projeyi Çalıştırma

Kurulum tamamen bitti! Artık projeyi başlatabiliriz. Ana proje klasöründe terminale şunu yazın:

```bash
bun run dev
```

Ekranda birkaç yazı belirecek ve yeşil yazılar göreceksiniz.
- **Siteye Girmek İçin:** Tarayıcınızda `http://localhost:5173` adresine gidin.
- (Eğer her şey tamamsa karşınıza giriş ekranı çıkacaktır.)

---

## Mastra AI Agent

1. https://openrouter.ai/keys adresinden ücretsiz bir anahtar alın.
2. Anahtarı `config/apps/mastra/.env` dosyasındaki `OPENROUTER_API_KEY=` satırına yazın.
3. `bun run dev` ile başlatın.
4. http://localhost:5173 adresinde `admin@example.com` / `password` ile giriş yapıp **AI Asistan** sayfasını açın.

---

## 🚨 4. Hata Çözüm Rehberi (Kurtarıcı Adımlar)

Eğer projenizi çalıştırırken veya kurarken bir şeyler ters giderse **paniğe kapılmayın**. En çok karşılaşılan sorunları nasıl çözeceğiniz aşağıda:

### 💡 "bun install" yaparken hata aldım / Paketler hatalı yüklendi!
Paketler yüklenirken bir şebeke problemi veya uyumsuzluk olmuş olabilir. En etkili çözüm "**Kapatıp Tekrar Açmak / Silip Yüklemek**"tir :)
Projenin ana klasöründeyken terminalde şunları yazarak temizleyip baştan yükleyin:

**Mac/Linux için:**
```bash
rm -rf node_modules
rm bun.lockb
bun install
```

**Windows (PowerShell) için:**
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item -Force bun.lockb
bun install
```
*(Bu komutlar eski bozuk kurulumu silerek `bun install` ile en temiz haliyle tekrar yükler.)*

### 💡 "Database Connection" (Veritabanı Bağlantı) Hatası
- PostgreSQL veritabanını kurduğunuzdan ve arka planda açık olduğundan emin olun.
- Şifrenizi kurulumda `postgres` yapmadıysanız, `config/apps/api/.env` dosyasına girip oradaki `postgresql://postgres:postgres@localhost...` yazan kısımdaki ikinci `postgres`'i koyduğunuz kendi şifrenizle değiştirin.

### 💡 "Port 5173 / 3000 is already in use" (Port dolu) Hatası
Arka planda projeyi zaten çalıştırmışsınız veya başka bir program bu kanalları kullanıyor olabilir. Terminal'i tamamen kapatıp yeni bir terminal açarak tekrar deneyin.
