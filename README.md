# SANDIKALE KASIR

Aplikasi POS dan inventaris SANDIKALE berbasis React + Vite.

## Cloudflare Pages

Project Vite berada di folder `sandikale kasir/`.

Gunakan konfigurasi berikut saat membuat project Cloudflare Pages dari repository GitHub ini:

- **Production branch:** `main`
- **Framework preset:** Vite
- **Root directory:** `sandikale kasir`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node.js:** versi LTS

Vite sudah dikonfigurasi dengan `base: '/'` karena Cloudflare Pages menyajikan aplikasi dari root domain.

Setelah repository terhubung ke Cloudflare Pages, push ke branch `main` akan memicu deployment otomatis.
