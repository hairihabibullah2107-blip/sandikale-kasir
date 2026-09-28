export type Language = 'id' | 'en';

export type UserRole = 'admin' | 'kasir' | 'produksi';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  pin: string;
}

export type ProductCategory = 
  | 'Bahan Polos' 
  | 'Jasa Sablon' 
  | 'Ready Stock' 
  | 'Merchandise' 
  | 'Aksesoris';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  costPrice: number; // Harga Modal (HPP)
  stock: number;
  minStock: number; // Minimum stock alert threshold
  image: string;
  unit: string; // pcs, meter, lembar
  isRawMaterial?: boolean; // bahan baku
  notes?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  qty: number;
  notes?: string;
  customDetails?: {
    bahanName?: string;
    sidesCount?: number;
    sideSpecs?: string[];
    discountAmount?: number;
    mockupImage?: string;
    customerNotes?: string;
  };
}

export type PaymentMethod = 
  | 'Cash' 
  | 'QRIS' 
  | 'Transfer BCA' 
  | 'Transfer Mandiri' 
  | 'Transfer BRI' 
  | 'Transfer BNI' 
  | 'GoPay' 
  | 'OVO' 
  | 'DANA';

export type PaymentStatus = 'Lunas' | 'DP' | 'Belum Bayar';

export type ProductionStatus = 
  | 'Antrean Desain' 
  | 'Proses Cetak' 
  | 'Finishing' 
  | 'Siap Ambil' 
  | 'Selesai';

export interface Order {
  id: string; // e.g. TRX-20260928-001
  date: string; // ISO string
  displayDate: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  dpAmount: number;
  remainingAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  productionStatus: ProductionStatus;
  cashierName: string;
  cashierId: string;
  isOfflineSync?: boolean;
  tamperChecksum?: string; // SHA-256 anti-duplication hash
  encryptedDataHash?: string;
  notes?: string;
  mockupUrl?: string;
  historyTimeline?: {
    time: string;
    status: ProductionStatus | PaymentStatus;
    note: string;
    by: string;
  }[];
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  changeQty: number; // positive = restock, negative = sale
  previousStock: number;
  newStock: number;
  type: 'sale' | 'restock' | 'adjustment' | 'return';
  referenceId?: string; // e.g. Order ID
  date: string;
  operator: string;
  note?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  instagram: string;
  taxRate: number; // percentage, e.g. 0%
  receiptFooter: string;
  defaultPaperSize: '58mm' | '80mm';
  autoPrintReceipt: boolean;
  encryptionActive: boolean;
  encryptionKeyHint: string;
  offlineAutoSync: boolean;
  qrisMerchantName: string;
  qrisNmid: string;
  bankAccounts: {
    bank: string;
    accountNo: string;
    holderName: string;
  }[];
}
