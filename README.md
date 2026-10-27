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
- **Daftar lead**: spreadsheet detail dengan kolom tanggal, `Nama Sales`, dan `Sumber Leads`.
- Sesi admin dapat menambah atau mengurangi anggota Marketing; daftar nama ini menentukan pengelompokan leads di grafik. Nama sumber detail harus sama dengan nama anggota untuk masuk ke grafik anggota; nama yang belum cocok tetap masuk ke total pada kelompok “Lainnya”.
- Link spreadsheet harus dapat dibaca publik oleh siapa pun yang memiliki link. Data yang bersifat privat memerlukan integrasi autentikasi Google dan tidak didukung oleh ekspor CSV publik ini.
- Sumber rekap dengan tanggal periode yang sama dijumlahkan. Rekap dengan rentang tanggal berbeda tidak dijumlahkan untuk periode tersebut.
- Hitungan dari beberapa daftar lead dijumlahkan dan ditampilkan terpisah dari angka rekap. Jika spreadsheet detail berisi lead yang sama, hitungannya dapat terduplikasi; dashboard tidak melakukan deduplikasi.
- Dashboard hanya menampilkan agregat sumber lead, bukan nama, nomor telepon, atau domisili.
- Dashboard Marketing menampilkan jumlah lead menurut tanggal masuk, jumlah tindak lanjut menurut tanggal `FU 1`–`FU 8`, anggota, dan sumber lead untuk hari ini, minggu berjalan (Senin sampai hari ini), serta bulan berjalan.
- Halaman utama menampilkan tabel Marketing per anggota: jumlah lead, jumlah follow-up, serta setiap sumber lead beserta jumlahnya. Biaya, leads iklan, dan CPL hanya ditampilkan pada bagian Ads.
- Dashboard Ads menggunakan tabel Ads pada spreadsheet rekap untuk periode berjalan. Jika rentang tanggal tabel Ads tidak cocok dengan periode yang sedang berjalan, nilai ditandai belum tersedia daripada menampilkan angka dari periode yang keliru.
- Data dimuat ulang otomatis setiap 5 menit. Pengeluaran CPL dihitung sebagai total pengeluaran iklan dibagi total leads iklan.

## Pengembangan lokal

Vercel Functions dan Redis diperlukan untuk menguji sesi admin dan menyimpan perubahan. Jalankan proyek dengan Vercel CLI (`vercel dev`) setelah mengatur environment variables lokal melalui `.env.local`; jangan commit file environment yang berisi rahasia.
