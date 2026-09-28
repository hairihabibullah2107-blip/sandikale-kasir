import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import {
  Upload,
  Trash2,
  Printer,
  PlusCircle,
  X,
  Sparkles,
  Calculator,
  Layers,
  Tag
} from 'lucide-react';

interface CustomSablonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomSablonModal: React.FC<CustomSablonModalProps> = ({
  isOpen,
  onClose
}) => {
  const { products, addToCart, t, settings, showToast } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedBahanId, setSelectedBahanId] = useState<string>(() => {
    const defaultBahan = products.find(p => p.category === 'Bahan Polos');
    return defaultBahan ? defaultBahan.id : '';
  });

  const [sidesCount, setSidesCount] = useState<number>(1);
  const [sideSpecs, setSideSpecs] = useState<{ [key: number]: string }>({
    0: 'j-2', // Default DTF A4
    1: 'j-3', // Default Logo Saku
    2: 'j-3'
  });

  const [quantity, setQuantity] = useState<number>(1);
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const bahanProducts = products.filter(p => p.category === 'Bahan Polos');
  const sablonServices = products.filter(p => p.category === 'Jasa Sablon');

  const selectedBahan = products.find(p => p.id === selectedBahanId);
  const bahanPrice = selectedBahan ? selectedBahan.price : 0;
  const bahanCost = selectedBahan ? selectedBahan.costPrice : 0;

  // Calculate sablon price
  let sablonTotalPerPcs = 0;
  let sablonCostPerPcs = 0;
  const sideDescriptions: string[] = [];

  const sideLabels = ['Sisi Depan', 'Sisi Belakang', 'Sisi Lengan / Saku'];

  for (let i = 0; i < sidesCount; i++) {
    const serviceId = sideSpecs[i];
    const service = sablonServices.find(s => s.id === serviceId);
    if (service) {
      sablonTotalPerPcs += service.price;
      sablonCostPerPcs += service.costPrice;
      sideDescriptions.push(`${sideLabels[i]}: ${service.name}`);
    }
  }

  const unitBasePrice = bahanPrice + sablonTotalPerPcs;
  const unitDiscount = Math.max(0, customDiscount);
  const unitFinalPrice = Math.max(0, unitBasePrice - unitDiscount);
  const grandTotal = unitFinalPrice * quantity;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran gambar maksimal 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        setMockupImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddToCart = () => {
    const bahanName = selectedBahan ? selectedBahan.name : 'Kaos Custom';
    const itemName = `Custom: ${bahanName} (${sidesCount} Sisi)`;

    // Create custom product wrapper
    const customProduct: Product = {
      id: `custom-sbl-${Date.now()}`,
      sku: 'CUSTOM-SABBLON',
      name: itemName,
      category: 'Jasa Sablon',
      price: unitFinalPrice,
      costPrice: bahanCost + sablonCostPerPcs,
      stock: 9999,
      minStock: 0,
      image: mockupImage || (selectedBahan ? selectedBahan.image : ''),
      unit: 'pcs',
      notes: notes
    };

    addToCart(customProduct, {
      bahanName: bahanName,
      sidesCount: sidesCount,
      sideSpecs: sideDescriptions,
      discountAmount: unitDiscount,
      mockupImage: mockupImage || undefined,
      customerNotes: `${customerName ? 'Pelanggan: ' + customerName : ''} ${notes}`
    });

    onClose();
  };

  const handlePrintSPK = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Gagal membuka jendela cetak. Periksa popup blocker browser.', 'error');
      return;
    }

    const bahanTitle = selectedBahan ? selectedBahan.name : 'Kaos Custom';
    const spkId = `SPK-${Date.now().toString().slice(-6)}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Surat Perintah Kerja (SPK) - ${spkId}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; color: #0f172a; max-width: 800px; margin: auto; }
          .header { text-align: center; border-bottom: 3px solid #b91c1c; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; letter-spacing: 1px; color: #b91c1c; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 13px; }
          .meta-item b { color: #334155; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px; }
          .mockup-frame { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 15px; text-align: center; min-height: 250px; display: flex; align-items: center; justify-content: center; background: #fafafa; }
          .mockup-frame img { max-width: 100%; max-height: 400px; object-fit: contain; }
          .sign-area { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 12px; }
          .sign-box { width: 180px; }
          .sign-line { border-bottom: 1px solid #000; margin-top: 60px; }
          @media print { .no-print { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${settings.storeName}</h1>
          <div class="subtitle">SURAT PERINTAH KERJA (SPK) PRODUKSI SABLON • ${settings.tagline}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><b>No. SPK Produksi</b><span>${spkId}</span></div>
          <div class="meta-item"><b>Tanggal Masuk</b><span>${new Date().toLocaleString('id-ID')}</span></div>
          <div class="meta-item"><b>Nama Pemesan / WA</b><span>${customerName || 'Umum'} / ${customerPhone || '-'}</span></div>
          <div class="meta-item"><b>Jumlah Pesanan</b><span style="font-weight: bold; font-size: 16px; color: #b91c1c;">${quantity} pcs</span></div>
          <div class="meta-item" style="grid-column: span 2;"><b>Media / Bahan Kaos</b><span>${bahanTitle}</span></div>
          <div class="meta-item" style="grid-column: span 2;"><b>Spesifikasi Sablon (${sidesCount} Sisi)</b>
            <ul style="margin: 4px 0 0 16px; padding: 0;">
              ${sideDescriptions.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
          ${notes ? `<div class="meta-item" style="grid-column: span 2;"><b>Catatan Khusus Sablon</b><span>${notes}</span></div>` : ''}
        </div>

        <h3 style="font-size: 14px; text-transform: uppercase; color: #475569; margin-bottom: 8px;">Mockup Desain / Penempatan Sablon:</h3>
        <div class="mockup-frame">
          ${mockupImage ? `<img src="${mockupImage}" alt="Mockup SPK" />` : '<span style="color: #94a3b8; font-style: italic;">Tidak ada lampiran mockup file fisik. Ikuti spesifikasi teks di atas.</span>'}
        </div>

        <div class="sign-area">
          <div class="sign-box">
            <span>Dibuat oleh (Kasir):</span>
            <div class="sign-line"></div>
          </div>
          <div class="sign-box">
            <span>Disetujui Pelanggan:</span>
            <div class="sign-line"></div>
          </div>
          <div class="sign-box">
            <span>Diterima Divisi Cetak:</span>
            <div class="sign-line"></div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="background: #b91c1c; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; cursor: pointer;">Cetak Lembar SPK</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {t.customTitle}
              </h2>
              <p className="text-xs text-slate-400">
                Hitung otomatis biaya sablon, bahan kaos, diskon grosir, dan cetak SPK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Pemesan / Komunitas
                </label>
                <input
                  type="text"
                  placeholder="Cth: Komunitas Vespa Matic"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Pelanggan
                </label>
                <input
                  type="tel"
                  placeholder="0812xxxxxxx"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Media / Kaos Base Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.bahanMedia}
              </label>
              <select
                value={selectedBahanId}
                onChange={e => setSelectedBahanId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-red-500 transition"
              >
                {bahanProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Rp {p.price.toLocaleString('id-ID')} ({p.stock} pcs tersedia)
                  </option>
                ))}
              </select>
            </div>

            {/* Print Sides Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.sideCount}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSidesCount(num)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      sidesCount === num
                        ? 'bg-red-600/20 border-red-500 text-red-400'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {num === 1 ? t.side1 : num === 2 ? t.side2 : t.side3}
                  </button>
                ))}
              </div>
            </div>

            {/* Per-Side Print Technique Selectors */}
            <div className="space-y-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs font-semibold text-slate-300 block mb-1">
                Pilih Ukuran Sablon per Sisi:
              </span>
              {Array.from({ length: sidesCount }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-red-400 font-mono w-28 shrink-0 font-medium">
                    {sideLabels[idx]}:
                  </span>
                  <select
                    value={sideSpecs[idx] || sablonServices[0]?.id}
                    onChange={e =>
                      setSideSpecs(prev => ({ ...prev, [idx]: e.target.value }))
                    }
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500 transition"
                  >
                    {sablonServices.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (+Rp {s.price.toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Quantity & Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jumlah Pesanan (pcs)
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white font-bold focus:outline-none focus:border-red-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.specialDiscount}
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={customDiscount || ''}
                  onChange={e => setCustomDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-emerald-400 font-bold focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Production Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Catatan Desain & Posisi Sablon
              </label>
              <textarea
                rows={2}
                placeholder="Cth: Logo dada kiri 8cm, belakang DTF A3 jarak 6cm dari kerah leher..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition resize-none"
              />
            </div>
          </div>

          {/* Right Column: Mockup Upload & Price Summary (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Mockup Preview Area */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.customMockupLabel}
              </label>
              <div className="border-2 border-dashed border-slate-700 rounded-2xl p-3 bg-slate-950/40 relative min-h-[190px] flex flex-col items-center justify-center text-center group overflow-hidden">
                {mockupImage ? (
                  <div className="relative w-full h-44 flex items-center justify-center">
                    <img
                      src={mockupImage}
                      alt="Mockup Desain"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setMockupImage(null)}
                      className="absolute top-1 right-1 p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition shadow"
                      title="Hapus Mockup"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer p-4 w-full h-full">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-red-400 group-hover:bg-slate-700 transition mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-slate-300">
                      Klik untuk upload Mockup Desain
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      JPG, PNG, WebP (Maks 5MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Price Breakdown Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Harga Kaos Satuan:</span>
                <span className="text-slate-200">Rp {bahanPrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Biaya Sablon ({sidesCount} sisi):</span>
                <span className="text-slate-200">+Rp {sablonTotalPerPcs.toLocaleString('id-ID')}</span>
              </div>
              {unitDiscount > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Diskon Khusus:</span>
                  <span>-Rp {unitDiscount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-2 flex justify-between items-baseline">
                <span className="text-xs font-semibold text-slate-300">
                  Harga Satuan:
                </span>
                <span className="text-sm font-bold text-white">
                  Rp {unitFinalPrice.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="border-t border-slate-800/80 pt-2 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-bold text-white block">
                    TOTAL AKHIR:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({quantity} pcs x Rp {unitFinalPrice.toLocaleString('id-ID')})
                  </span>
                </div>
                <span className="text-xl font-extrabold text-red-500 font-mono">
                  Rp {grandTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintSPK}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>{t.printSPKDirect}</span>
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition shadow-lg shadow-red-950/40"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t.addToCartCustom}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
