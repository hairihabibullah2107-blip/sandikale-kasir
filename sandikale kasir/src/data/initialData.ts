import { Product, Order, User, StoreSettings } from '../types';

export const INITIAL_USERS: User[] = [
  { id: 'u-1', username: 'admin', name: 'HAIRI (owner )', role: 'admin', pin: 'hairi21' },
  { id: 'u-2', username: 'kasir', name: 'Dewi Kasir', role: 'kasir', pin: '1234' },
  { id: 'u-3', username: 'produksi', name: 'Kang Sablon', role: 'produksi', pin: '1234' },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Bahan Polos (Media Kaos)
  {
    id: 'p-1',
    sku: 'KOS-30S-BLK',
    name: 'Kaos Cotton Combed 30s Hitam Reaktif',
    category: 'Bahan Polos',
    price: 38000,
    costPrice: 28000,
    stock: 85,
    minStock: 20,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80',
    unit: 'pcs',
    isRawMaterial: true,
    notes: 'Kualitas premium 100% Cotton Combed reaktif'
  },
  {
    id: 'p-2',
    sku: 'KOS-30S-WHT',
    name: 'Kaos Cotton Combed 30s Putih Bersih',
    category: 'Bahan Polos',
    price: 38000,
    costPrice: 28000,
    stock: 64,
    minStock: 20,
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300&auto=format&fit=crop&q=80',
    unit: 'pcs',
    isRawMaterial: true,
    notes: 'Kain putih anti tembus pandang'
  },
  {
    id: 'p-3',
    sku: 'KOS-24S-OVR',
    name: 'Kaos Oversize Heavyweight 24s Sage Green',
    category: 'Bahan Polos',
    price: 48000,
    costPrice: 35000,
    stock: 12, // Critical stock!
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=300&auto=format&fit=crop&q=80',
    unit: 'pcs',
    isRawMaterial: true,
    notes: 'Potongan boxy/oversize trend streetwear'
  },
  {
    id: 'p-4',
    sku: 'HOD-FLC-BLK',
    name: 'Hoodie Jumper Cotton Fleece Tebal Hitam',
    category: 'Bahan Polos',
    price: 95000,
    costPrice: 72000,
    stock: 25,
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&auto=format&fit=crop&q=80',
    unit: 'pcs',
    isRawMaterial: true
  },
  {
    id: 'p-5',
    sku: 'MEDIA-SELF',
    name: 'Bawa Media Kaos Sendiri (Hanya Jasa)',
    category: 'Bahan Polos',
    price: 0,
    costPrice: 0,
    stock: 9999,
    minStock: 0,
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&auto=format&fit=crop&q=80',
    unit: 'pcs',
    notes: 'Pelanggan membawa kaos sendiri'
  },

  // Jasa Sablon (DTF & Polyflex)
  {
    id: 'j-1',
    sku: 'SBL-DTF-A3',
    name: 'Cetak Sablon DTF High-Density A3 (30x42cm)',
    category: 'Jasa Sablon',
    price: 25000,
    costPrice: 12000,
    stock: 350,
    minStock: 50,
    image: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=300&auto=format&fit=crop&q=80',
    unit: 'sisi',
    notes: 'Tinta elastis anti retak tahan cuci'
  },
  {
    id: 'j-2',
    sku: 'SBL-DTF-A4',
    name: 'Cetak Sablon DTF High-Density A4 (21x30cm)',
    category: 'Jasa Sablon',
    price: 15000,
    costPrice: 7000,
    stock: 420,
    minStock: 50,
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=300&auto=format&fit=crop&q=80',
    unit: 'sisi'
  },
  {
    id: 'j-3',
    sku: 'SBL-DTF-LOGO',
    name: 'Cetak Sablon Logo Dada / Saku (10x10cm)',
    category: 'Jasa Sablon',
    price: 6000,
    costPrice: 2500,
    stock: 800,
    minStock: 100,
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&auto=format&fit=crop&q=80',
    unit: 'titik'
  },
  {
    id: 'j-4',
    sku: 'SBL-POLY-GLOW',
    name: 'Cetak Polyflex Glow In The Dark A4',
    category: 'Jasa Sablon',
    price: 32000,
    costPrice: 18000,
    stock: 45,
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=300&auto=format&fit=crop&q=80',
    unit: 'sisi'
  },

  // Merchandise & Aksesoris
  {
    id: 'm-1',
    sku: 'MRC-MUG-COAT',
    name: 'Mug Custom Sublim Keramik Super White',
    category: 'Merchandise',
    price: 18000,
    costPrice: 9500,
    stock: 58,
    minStock: 20,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80',
    unit: 'pcs'
  },
  {
    id: 'm-2',
    sku: 'MRC-TOTE-CAN',
    name: 'Totebag Canvas Drill Resleting Custom',
    category: 'Merchandise',
    price: 28000,
    costPrice: 16000,
    stock: 40,
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
    unit: 'pcs'
  },
  {
    id: 'm-3',
    sku: 'MRC-GANCI-AKR',
    name: 'Gantungan Kunci Akrilik 2 Sisi UV Flatbed',
    category: 'Merchandise',
    price: 6500,
    costPrice: 2800,
    stock: 140,
    minStock: 30,
    image: 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=300&auto=format&fit=crop&q=80',
    unit: 'pcs'
  },
  {
    id: 'm-4',
    sku: 'MRC-TOPI-TRK',
    name: 'Topi Jaring Trucker + Sablon DTF Logo',
    category: 'Merchandise',
    price: 25000,
    costPrice: 13000,
    stock: 3, // Very low stock!
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&auto=format&fit=crop&q=80',
    unit: 'pcs'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'TRX-20260928-001',
    date: '2026-09-28T09:15:00.000Z',
    displayDate: '28/09/2026 09:15',
    customerName: 'Budi Santoso (Komunitas CBR)',
    customerPhone: '081234567890',
    items: [
      {
        id: 'ci-1',
        productId: 'p-1',
        name: 'Kaos Cotton Combed 30s Hitam Reaktif',
        price: 38000,
        costPrice: 28000,
        qty: 24,
      },
      {
        id: 'ci-2',
        productId: 'j-1',
        name: 'Cetak Sablon DTF High-Density A3 (30x42cm)',
        price: 25000,
        costPrice: 12000,
        qty: 24,
        notes: 'Depan logo komunitas + Belakang typography besar'
      }
    ],
    subtotal: 1512000,
    discount: 50000,
    tax: 0,
    total: 1462000,
    paidAmount: 800000,
    dpAmount: 800000,
    remainingAmount: 662000,
    changeAmount: 0,
    paymentMethod: 'Transfer BCA',
    paymentStatus: 'DP',
    productionStatus: 'Proses Cetak',
    cashierName: 'HAIRI (owner )',
    cashierId: 'u-1',
    tamperChecksum: 'e28fa03b4478129ccbb2893df1',
    notes: 'Wajib selesai sebelum hari Sabtu untuk touring',
    historyTimeline: [
      { time: '28/09/2026 09:15', status: 'DP', note: 'DP Transfer BCA diterima Rp 800.000', by: 'HAIRI (owner )' },
      { time: '28/09/2026 10:30', status: 'Antrean Desain', note: 'File mockup dikonfirmasi pelanggan', by: 'Kang Sablon' },
      { time: '28/09/2026 11:45', status: 'Proses Cetak', note: 'Pencetakan DTF 24 lembar sedang berjalan', by: 'Kang Sablon' }
    ]
  },
  {
    id: 'TRX-20260928-002',
    date: '2026-09-28T10:40:00.000Z',
    displayDate: '28/09/2026 10:40',
    customerName: 'Kafe Kopi Senja (Mbak Laras)',
    customerPhone: '085712345678',
    items: [
      {
        id: 'ci-3',
        productId: 'm-1',
        name: 'Mug Custom Sublim Keramik Super White',
        price: 18000,
        costPrice: 9500,
        qty: 15,
      }
    ],
    subtotal: 270000,
    discount: 0,
    tax: 0,
    total: 270000,
    paidAmount: 270000,
    dpAmount: 270000,
    remainingAmount: 0,
    changeAmount: 0,
    paymentMethod: 'QRIS',
    paymentStatus: 'Lunas',
    productionStatus: 'Siap Ambil',
    cashierName: 'Dewi Kasir',
    cashierId: 'u-2',
    tamperChecksum: 'a718c399bdf2001189ac3f18',
    notes: 'Packaging bubble wrap rapi'
  }
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'SANDIKALE-PROJECT',
  tagline: 'Sablon DTF, Kaos Komunitas & Merchandise',
  address: 'Jl. Raya Sesaot-Narmada, Lombok Barat, NTB',
  phone: '082266412844',
  instagram: '_sandikale',
  taxRate: 0,
  receiptFooter: 'Terima kasih atas kunjungan & kepercayaan Anda! Semoga berkah & sukses selalu.',
  defaultPaperSize: '58mm',
  autoPrintReceipt: true,
  encryptionActive: true,
  encryptionKeyHint: 'AES-256 GCM CloudVault Protected',
  offlineAutoSync: true,
  qrisMerchantName: 'SANDIKALE PROJECT INDONESIA',
  qrisNmid: 'ID1020304050607',
  bankAccounts: [
    { bank: 'BCA', accountNo: '8910-2345-67', holderName: 'SANDIKALE PROJECT' },
    { bank: 'Mandiri', accountNo: '161-00-9876543-2', holderName: 'SANDIKALE PROJECT' },
    { bank: 'BRI', accountNo: '0289-01-001234-53-8', holderName: 'SANDIKALE PROJECT' },
    { bank: 'BNI', accountNo: '0987-654-321', holderName: 'SANDIKALE PROJECT' },
  ]
};
