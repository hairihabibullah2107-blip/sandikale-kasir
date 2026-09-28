import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory } from '../types';
import {
  Boxes,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit,
  History,
  CheckCircle,
  X,
  Upload
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    restockProduct,
    stockLogs,
    t,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'logs'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockNote, setRestockNote] = useState<string>('');

  // New product form state
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<ProductCategory>('Bahan Polos');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newCostPrice, setNewCostPrice] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(10);
  const [newMinStock, setNewMinStock] = useState<number>(10);
  const [newUnit, setNewUnit] = useState('pcs');
  const [newImage, setNewImage] = useState('');

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenRestock = (prod: Product) => {
    setSelectedProductForRestock(prod);
    setRestockQty(20);
    setRestockNote('Penerimaan stok dari supplier');
    setIsRestockModalOpen(true);
  };

  const handleConfirmRestock = () => {
    if (!selectedProductForRestock) return;
    if (restockQty <= 0) {
      showToast('Jumlah restok harus lebih dari 0', 'error');
      return;
    }
    restockProduct(selectedProductForRestock.id, restockQty, restockNote);
    setIsRestockModalOpen(false);
    setSelectedProductForRestock(null);
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Nama produk wajib diisi!', 'error');
      return;
    }

    addProduct({
      sku: newSku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      name: newName.trim(),
      category: newCat,
      price: Math.max(0, newPrice),
      costPrice: Math.max(0, newCostPrice),
      stock: Math.max(0, newStock),
      minStock: Math.max(0, newMinStock),
      unit: newUnit || 'pcs',
      image: newImage || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80',
      isRawMaterial: newCat === 'Bahan Polos'
    });

    setIsAddModalOpen(false);
    // Reset form
    setNewName('');
    setNewSku('');
    setNewPrice(0);
    setNewCostPrice(0);
    setNewStock(10);
    setNewImage('');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setNewImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 p-4 sm:p-6 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-red-500" />
            <span>{t.inventoryTitle}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {t.inventorySubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-red-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addProductBtn}</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'products'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daftar Stok Produk ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'logs'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Log Mutasi Stok ({stockLogs.length})</span>
          </button>
        </div>

        {activeTab === 'products' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari SKU atau nama..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-red-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="Bahan Polos">Bahan Polos</option>
              <option value="Jasa Sablon">Jasa Sablon</option>
              <option value="Merchandise">Merchandise</option>
              <option value="Ready Stock">Ready Stock</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        {activeTab === 'products' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="p-3.5">{t.tableProduct}</th>
                  <th className="p-3.5">{t.tableCategory}</th>
                  <th className="p-3.5">{t.tablePrice}</th>
                  <th className="p-3.5">{t.tableCost}</th>
                  <th className="p-3.5">{t.tableStock}</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">{t.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map(p => {
                  const isLow = p.stock <= p.minStock && p.stock > 0;
                  const isOut = p.stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-850/40 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-800 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div>
                            <span className="font-bold text-slate-200 block text-xs">
                              {p.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {p.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {p.category}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold font-mono text-white">
                        Rp {p.price.toLocaleString('id-ID')}
                      </td>

                      <td className="p-3.5 font-mono text-slate-400">
                        Rp {p.costPrice.toLocaleString('id-ID')}
                      </td>

                      <td className="p-3.5 font-bold font-mono text-white">
                        {p.stock} {p.unit}
                      </td>

                      <td className="p-3.5">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/60 border border-red-500/40 text-red-400">
                            Habis
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
                            Kritis (&lt;{p.minStock})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                            Aman
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRestock(p)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                            title="Restok Tambah Barang"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Restok</span>
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="p-3.5">Waktu</th>
                  <th className="p-3.5">Produk</th>
                  <th className="p-3.5">Perubahan</th>
                  <th className="p-3.5">Stok Akhir</th>
                  <th className="p-3.5">Tipe & Catatan</th>
                  <th className="p-3.5">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {stockLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Belum ada catatan log mutasi stok tercatat.
                    </td>
                  </tr>
                ) : (
                  stockLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-850/40">
                      <td className="p-3.5 text-slate-400">
                        {new Date(log.date).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 font-bold text-white font-sans">
                        {log.productName}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold inline-flex items-center gap-0.5 ${
                            log.changeQty > 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {log.changeQty > 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300 font-bold">
                        {log.newStock} pcs
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className="text-slate-300">{log.note || log.type}</span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-sans">
                        {log.operator}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock Modal */}
      {isRestockModalOpen && selectedProductForRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Catat Restok Masuk</h3>
                <p className="text-xs text-slate-400">{selectedProductForRestock.name}</p>
              </div>
              <button
                onClick={() => setIsRestockModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jumlah Tambahan Stok (pcs)
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={e => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan / Supplier
                </label>
                <input
                  type="text"
                  placeholder="Cth: Supplier Kaos Combed Bandung"
                  value={restockNote}
                  onChange={e => setRestockNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <button
              onClick={handleConfirmRestock}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs transition shadow-lg shadow-red-950/40"
            >
              Simpan Tambahan Stok
            </button>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Tambah Produk Baru</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Produk / Bahan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Kaos Polo Pique CVC Hitam"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={newCat}
                    onChange={e => setNewCat(e.target.value as ProductCategory)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Bahan Polos">Bahan Polos</option>
                    <option value="Jasa Sablon">Jasa Sablon</option>
                    <option value="Merchandise">Merchandise</option>
                    <option value="Ready Stock">Ready Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    SKU / Kode
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated"
                    value={newSku}
                    onChange={e => setNewSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPrice || ''}
                    onChange={e => setNewPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Harga Modal / HPP (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newCostPrice || ''}
                    onChange={e => setNewCostPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newStock}
                    onChange={e => setNewStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Foto Produk (1:1 Square)
                </label>
                <div className="flex items-center gap-3">
                  {newImage && (
                    <img
                      src={newImage}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs transition shadow-lg shadow-red-950/40"
              >
                Simpan Produk ke Katalog
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
