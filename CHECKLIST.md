# Checklist pengembangan SmartGridTwin

Pemain mengelola jaringan listrik dari satu PLTA di sungai dengan air terjun. Mereka memperoleh koin dari listrik yang tersalurkan, merawat komponen, menambah kapasitas, dan menentukan cara melayani pelanggan ketika pasokan berubah.

## Peta 3D dan kamera

- [x] Buat dunia semi-realistis dengan sungai, air terjun, PLTA, kota, kawasan pelanggan, dan lokasi pembangkit baru.
- [x] Animasikan aliran sungai dan buih air terjun melalui shader WebGL. Batasi pembaruan idle hingga 24 fps pada peta lebar dan 18 fps pada peta sempit. Hentikan animasi saat sungai di luar kamera, peta di luar layar, tab disembunyikan, atau preferensi pengurangan gerak aktif.
- [x] Sediakan geser, putar horizontal, miring vertikal, zoom, fokus objek, dan tampilan awal. Tersedia kontrol mouse, trackpad, keyboard, serta sentuhan.
- [x] Tampilkan interior saat pembangkit dipilih. Komponen dapat dikenali bentuknya dan dipilih langsung atau melalui panel.
- [x] Tata panel detail untuk desktop, HP potret, dan HP lanskap agar peta dan tindakan utama tetap mudah dijangkau.

## Simulasi listrik dan pelanggan

- [x] Mulai dengan satu PLTA dan satu kota. Jalankan waktu saat sesi aktif dengan jeda dan pilihan kecepatan 1×, 2×, dan 4×.
- [x] Tampilkan alarm besar pertama dengan jeda otomatis, lalu biarkan pemain melanjutkan.
- [x] Tampilkan kapasitas, pasokan tersedia, permintaan, distribusi aktual, dan pendapatan dalam istilah yang mudah dipahami.
- [x] Naikkan konsumsi otomatis hingga kapasitas rancangan tiap zona. Datangkan tawaran acak dari pabrik, data center, dan pelanggan besar lain.
- [x] Tampilkan proyeksi pasokan setelah menerima pelanggan. Izinkan pemain menerima atau menolak tawaran.
- [x] Sediakan prioritas distribusi, pengurangan jatah, pemutusan, dan pemulihan layanan per pelanggan.

## Perawatan, ekspansi, dan pemulihan

- [x] Tampilkan gejala dan kondisi komponen. Sediakan servis seperti isi oli, perbaikan, dan penggantian.
- [x] Terapkan tiga level komponen dan pembangkit, biaya koin, waktu pengerjaan, serta dampak yang dapat dilihat pemain.
- [x] Tambahkan PLTS, PLTB, dan PLTN dengan model 3D, komponen, dan perilaku produksi masing-masing.
- [x] Berikan peringatan sebelum kondisi kritis berkembang menjadi insiden. Pembangkit yang hancur harus dibangun ulang.
- [x] Sediakan pinjaman pemulihan jika tidak ada pembangkit beroperasi dan koin tidak cukup untuk membangun ulang. Bayar utang dari pendapatan setelah operasi pulih.

## Progres dan batas perangkat

- [x] Simpan koin, waktu, pelanggan, kondisi komponen, pekerjaan, utang, dan progres setiap wilayah di penyimpanan browser.
- [x] Saat peta penuh, izinkan pemain tetap merawat dan meng-upgrade jaringan. Buka Lembah Arunika, Pesisir Bayu, dan Dataran Bara secara bertahap, dengan kondisi dan progres tersendiri.
- [x] Batasi setiap wilayah pada enam lokasi pembangkit dan delapan zona pelanggan. Kurangi detail visual pada kanvas sempit dan gunakan satu interior aktif.
- [x] Uji peta penuh saat simulasi berjalan, kamera digerakkan, dan interior dibuka di browser internal. Interval frame persentil ke-95 dalam uji 90 frame sekitar 17 ms pada viewport desktop dan HP potret dengan WebGL.
- [x] Verifikasi alur alarm PLTA, servis, penerimaan pelanggan, perubahan distribusi, pembangunan PLTS, simpan dan muat ulang, pemulihan dengan pinjaman, serta perpindahan wilayah.
- [ ] Ukur performa dan uji gestur pada HP fisik saat perangkat tersedia. Pengujian saat ini menggunakan ukuran layar HP di browser internal desktop.

## Promo beranda

- [x] Jadikan promo SmartGridTwin satu-satunya konten beranda, dengan pratinjau dunia 3D dan tombol menuju permainan.
- [x] Verifikasi gambar, tombol, dan pengalihan ke `/play/` di browser internal.
- [x] Tambahkan tautan ke tutorial bergambar pada beranda dan menu simulator.
- [x] Sediakan pencarian isi bab dan tautan publik yang bisa disalin dari tutorial.
