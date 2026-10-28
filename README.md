# Dashboard Laporan

Dashboard satu halaman untuk laporan Marketing dan Ads, dengan API serverless Vercel untuk sesi admin dan penyimpanan pengaturan bersama.

## Menjalankan di Vercel

1. Deploy folder ini sebagai proyek Vercel. Folder `api/` otomatis menjadi Vercel Functions.
2. Buat database Redis kompatibel Upstash melalui Vercel Marketplace, lalu pastikan environment proyek menyediakan:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Tambahkan environment variables berikut di **Vercel Project Settings → Environment Variables**:
   - `ADMIN_PASSWORD`: kata sandi admin yang kuat; jangan masukkan ke HTML atau commit ke Git.
   - `SESSION_SECRET`: kunci acak minimal 32 karakter. Buat dengan `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
4. Deploy ulang setelah mengatur environment variables.
5. Buka dashboard dan pilih **Admin**. Sesi admin berlaku 8 jam dan memakai cookie `HttpOnly`, `SameSite=Strict`, serta `Secure` di production.

Tidak ada akun admin atau rahasia bawaan. Sebelum konfigurasi disimpan pertama kali, API memakai dua sumber spreadsheet awal di `lib/admin.js`. Perubahan link memerlukan Redis agar tersimpan bersama dan tetap tersedia setelah deployment baru.

## Mengelola sumber

- **Rekap metrik**: spreadsheet dengan bagian metrik sales harian, mingguan, dan bulanan seperti rekap awal.
- **Spreadsheet per orang**: di Admin tambahkan divisi (`Marketing`, `Ads`, atau `Konten`), nama orang, dan link Google Sheets miliknya. Untuk saat ini, sheet Marketing per orang menjadi sumber laporan Marketing; laporan Ads tetap menggunakan spreadsheet rekap umum. Link Konten dapat disimpan untuk digunakan saat laporannya ditambahkan.
- Sheet Marketing per orang harus berisi satu baris per lead, dengan header tanggal lead (`Tanggal Lead`, `Tanggal Masuk`, `Tanggal`, `Lead Date`, atau `Column 1`), sumber/platform (`Sumber Leads`, `Sumber Lead`, `Platform`, atau `Asal Lead`), tanggal follow-up (`FU 1`–`FU 8` atau `Follow Up 1`–`Follow Up 8`), serta kolom tanggal aktivitas `Janji Visit`/`Rencana Visit`, `Visit Terlaksana`/`Tanggal Visit`, dan `Booking`/`Closing`. Kolom aktivitas harus berisi tanggal kejadian, bukan hanya status ya/tidak. Agar detail booking menampilkan nama, sertakan kolom nama lead seperti `Nama Lead`, `Nama Prospek`, atau `Nama Customer`.
- Marketing menampilkan total gabungan serta rincian angka per orang untuk lead, follow-up, janji visit, visit terlaksana, dan booking/closing. Angka disajikan terpisah untuk hari ini, minggu ini, dan bulan ini; tabel juga merinci lead menurut platform per orang dan total.
- Angka booking dapat diklik untuk membuka daftar nama lead, tanggal booking, platform, dan nama marketing. Detail ini bersifat publik karena dashboard tidak mewajibkan login pengunjung; nomor telepon dan domisili tidak ditampilkan.
- Jika belum ada spreadsheet Marketing per orang yang tersimpan, dashboard sementara memakai spreadsheet jenis `Daftar lead` lama. Saat spreadsheet per orang ditambahkan, sumber lama tersebut tidak digabung agar data tidak terhitung ganda.
- Link spreadsheet harus dapat dibaca publik oleh siapa pun yang memiliki link. Data yang bersifat privat memerlukan integrasi autentikasi Google dan tidak didukung oleh ekspor CSV publik ini.
- Sumber rekap dengan tanggal periode yang sama dijumlahkan. Rekap dengan rentang tanggal berbeda tidak dijumlahkan untuk periode tersebut.
- Hitungan dari beberapa daftar lead dijumlahkan dan ditampilkan terpisah dari angka rekap. Jika spreadsheet detail berisi lead yang sama, hitungannya dapat terduplikasi; dashboard tidak melakukan deduplikasi.
- Dashboard menampilkan agregat data dan nama marketing. Nama lead hanya ditampilkan pada detail booking; nomor telepon dan domisili tidak diambil untuk ditampilkan.
- Dashboard Marketing menampilkan jumlah lead, follow-up, janji visit, visit terlaksana, dan booking/closing per orang serta total untuk hari ini, minggu berjalan (Senin sampai hari ini), serta bulan berjalan.
- Halaman utama menampilkan total Marketing dan tabel angka per orang untuk setiap periode; klik angka booking untuk melihat detail booking. Biaya, leads iklan, dan CPL hanya ditampilkan pada bagian Ads.
- Dashboard Ads menggunakan tabel Ads pada spreadsheet rekap untuk periode berjalan. Jika rentang tanggal tabel Ads tidak cocok dengan periode yang sedang berjalan, nilai ditandai belum tersedia daripada menampilkan angka dari periode yang keliru.
- Data dimuat ulang otomatis setiap 5 menit. Pengeluaran CPL dihitung sebagai total pengeluaran iklan dibagi total leads iklan.

## Pengembangan lokal

Vercel Functions dan Redis diperlukan untuk menguji sesi admin dan menyimpan perubahan. Jalankan proyek dengan Vercel CLI (`vercel dev`) setelah mengatur environment variables lokal melalui `.env.local`; jangan commit file environment yang berisi rahasia.
