import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, PaymentMethod } from '../types';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { formatVerificationCode } from '../utils/crypto';
import {
  Receipt,
  Search,
  Printer,
  Smartphone,
  ShieldCheck,
  X,
  Trash2,
  AlertTriangle,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { downloadTransactionsPDF } from '../utils/pdfGenerator';
import { downloadTransactionsExcel } from '../utils/excelGenerator';

interface TransactionsViewProps {
  onOpenReceipt: (order: Order) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ onOpenReceipt }) => {
  const {
    orders,
    settleOrderDP,
    deleteOrder,
    deleteMultipleOrders,
    currentUser,
    settings,
    showToast
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Lunas' | 'DP'>('all');

  // Settle modal state
  const [orderToSettle, setOrderToSettle] = useState<Order | null>(null);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('Cash');

  // Delete modal state (Single Order)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState(true);

  // Bulk selection state (Admin Only)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filterStatus === 'all' || o.paymentStatus === filterStatus;
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const handleConfirmSettle = () => {
    if (!orderToSettle) return;
    settleOrderDP(orderToSettle.id, settleMethod);
    setOrderToSettle(null);
  };

  const handleSendWA = (order: Order) => {
    if (!order.customerPhone) {
      showToast('Nomor WhatsApp pelanggan belum terdata', 'error');
      return;
    }
    const { url } = generateWhatsAppMessage(order, settings);
    window.open(url, '_blank');
  };

  const handleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      const visibleIds = filteredOrders.map(o => o.id);
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      const visibleSet = new Set(filteredOrders.map(o => o.id));
      setSelectedOrderIds(prev => prev.filter(id => !visibleSet.has(id)));
    }
  };

  const isAllVisibleSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every(o => selectedOrderIds.includes(o.id));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-500" />
            <span>Riwayat Transaksi & Pelunasan DP</span>
          </h2>
          <p className="text-xs text-slate-400">
            Arsip lengkap seluruh transaksi dengan verifikasi integritas digital
            {isAdmin && ' • Hak Akses Admin / Owner aktif'}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nota, pelanggan, no. WA..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
          />
        </div>
      </div>

      {/* Filter Tabs & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterStatus === 'all'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Nota ({orders.length})
          </button>
          <button
            onClick={() => setFilterStatus('DP')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterStatus === 'DP'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Masih DP ({orders.filter(o => o.paymentStatus === 'DP').length})
          </button>
          <button
            onClick={() => setFilterStatus('Lunas')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterStatus === 'Lunas'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Lunas ({orders.filter(o => o.paymentStatus === 'Lunas').length})
          </button>

          {/* Export PDF Button */}
          <button
            onClick={() => {
              const ordersToExport = selectedOrderIds.length > 0
                ? filteredOrders.filter(o => selectedOrderIds.includes(o.id))
                : filteredOrders;
              downloadTransactionsPDF(ordersToExport, settings, currentUser, filterStatus);
              showToast(`Laporan PDF (${ordersToExport.length} nota) berhasil diunduh`, 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm"
            title="Unduh berkas PDF untuk daftar transaksi saat ini"
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span>Export PDF</span>
          </button>

          {/* Export Excel (.xlsx) Button */}
          <button
            onClick={async () => {
              const ordersToExport = selectedOrderIds.length > 0
                ? filteredOrders.filter(o => selectedOrderIds.includes(o.id))
                : filteredOrders;
              try {
                setIsGeneratingExcel(true);
                await downloadTransactionsExcel(ordersToExport, settings, currentUser, filterStatus);
                showToast(`Laporan Excel profesional (.xlsx) berhasil diunduh (${ordersToExport.length} nota)`, 'success');
              } catch (err) {
                console.error(err);
                showToast('Gagal memproses berkas Excel (.xlsx)', 'error');
              } finally {
                setIsGeneratingExcel(false);
              }
            }}
            disabled={isGeneratingExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:text-white transition shadow-sm"
            title="Unduh berkas Excel (.xlsx) profesional untuk daftar transaksi saat ini"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isGeneratingExcel ? 'Memproses...' : 'Export Excel'}</span>
          </button>
        </div>

        {/* Bulk Action Bar for Admin */}
        {isAdmin && selectedOrderIds.length > 0 && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/40 px-3 py-1 rounded-xl animate-in fade-in">
            <span className="text-red-300 font-semibold text-xs">
              {selectedOrderIds.length} transaksi dipilih
            </span>
            <button
              onClick={() => {
                setRestoreStockOnDelete(true);
                setIsBulkDeleteModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </button>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-1"
            >
              Batal
            </button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px]">
                {isAdmin && (
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={e => handleSelectAllVisible(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-red-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      title="Pilih Semua Transaksi Terlihat"
                    />
                  </th>
                )}
                <th className="p-3.5">Nota & Waktu</th>
                <th className="p-3.5">Pelanggan</th>
                <th className="p-3.5">Rincian Item</th>
                <th className="p-3.5">Total & Terbayar</th>
                <th className="p-3.5">Status Pembayaran</th>
                <th className="p-3.5">Segel Anti-Duplikasi</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-slate-500">
                    Tidak ada transaksi yang cocok.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isDP = order.paymentStatus === 'DP';
                  const verCode = formatVerificationCode(order.tamperChecksum || '');
                  const isSelected = selectedOrderIds.includes(order.id);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-850/40 transition ${
                        isSelected ? 'bg-red-950/20' : ''
                      }`}
                    >
                      {isAdmin && (
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedOrderIds(prev => [...prev, order.id]);
                              } else {
                                setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                              }
                            }}
                            className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-red-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                        </td>
                      )}

                      <td className="p-3.5">
                        <span className="font-bold text-white font-mono block text-xs">
                          {order.id}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {order.displayDate}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-200 block text-xs">
                          {order.customerName}
                        </span>
                        {order.customerPhone && (
                          <span className="font-mono text-[10px] text-slate-400">
                            {order.customerPhone}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-[11px] text-slate-300 max-w-[220px]">
                        <div className="truncate">
                          {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {order.items.length} jenis item
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <span className="font-bold text-white block text-xs">
                          Rp {order.total.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Masuk: Rp {order.paidAmount.toLocaleString('id-ID')} ({order.paymentMethod})
                        </span>
                      </td>

                      <td className="p-3.5">
                        {isDP ? (
                          <span className="inline-flex flex-col">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
                              DP Sisa: Rp {order.remainingAmount.toLocaleString('id-ID')}
                            </span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                            Lunas
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                          <span>{verCode}</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDP && (
                            <button
                              onClick={() => setOrderToSettle(order)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                              title="Pelunasan Sisa DP"
                            >
                              Lunasi
                            </button>
                          )}
                          <button
                            onClick={() => handleSendWA(order)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/30 transition"
                            title="Kirim Nota via WA"
                          >
                            <Smartphone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenReceipt(order)}
                            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                            title="Lihat / Cetak Struk"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Delete Transaction (Admin/Owner Only) */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setOrderToDelete(order);
                                setRestoreStockOnDelete(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition"
                              title="Hapus Transaksi (Khusus Admin/Owner)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle DP Modal */}
      {orderToSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Pelunasan Sisa DP</h3>
                <p className="text-xs text-slate-400">{orderToSettle.id} • {orderToSettle.customerName}</p>
              </div>
              <button
                onClick={() => setOrderToSettle(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center font-mono">
              <span className="text-xs text-slate-400">Sisa Tagihan:</span>
              <span className="text-base font-bold text-red-500">
                Rp {orderToSettle.remainingAmount.toLocaleString('id-ID')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Metode Pembayaran Pelunasan
              </label>
              <select
                value={settleMethod}
                onChange={e => setSettleMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="Cash">Cash / Tunai</option>
                <option value="QRIS">QRIS All Bank</option>
                <option value="Transfer BCA">Transfer BCA</option>
                <option value="Transfer Mandiri">Transfer Mandiri</option>
                <option value="Transfer BRI">Transfer BRI</option>
                <option value="Transfer BNI">Transfer BNI</option>
              </select>
            </div>

            <button
              onClick={handleConfirmSettle}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs transition shadow-lg shadow-emerald-950/40"
            >
              Konfirmasi Pelunasan & Cetak Nota Lunas
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin/Owner Only) */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">Hapus Riwayat Transaksi?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tindakan ini permanen dan menghapus nota transaksi dari arsip sistem.
                </p>
              </div>
              <button
                onClick={() => setOrderToDelete(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-mono">No. Nota</span>
                <span className="font-bold text-white font-mono">{orderToDelete.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pelanggan</span>
                <span className="font-semibold text-slate-200">{orderToDelete.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Transaksi</span>
                <span className="font-bold text-red-400 font-mono">
                  Rp {orderToDelete.total.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Item Produk</span>
                <span className="text-slate-300">
                  {orderToDelete.items.reduce((acc, i) => acc + i.qty, 0)} pcs ({orderToDelete.items.length} item)
                </span>
              </div>
            </div>

            {/* Option to restore stock */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={restoreStockOnDelete}
                onChange={e => setRestoreStockOnDelete(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-slate-300 leading-relaxed">
                <b>Kembalikan stok produk otomatis</b> ke inventaris toko (+{orderToDelete.items.reduce((acc, i) => acc + i.qty, 0)} pcs)
              </span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteOrder(orderToDelete.id, restoreStockOnDelete);
                  setSelectedOrderIds(prev => prev.filter(id => id !== orderToDelete.id));
                  setOrderToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs transition shadow-lg shadow-red-950/40 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Nota</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal (Admin/Owner Only) */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">
                  Hapus {selectedOrderIds.length} Transaksi Terpilih?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tindakan ini akan menghapus semua transaksi terpilih secara permanen dari sistem.
                </p>
              </div>
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={restoreStockOnDelete}
                onChange={e => setRestoreStockOnDelete(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-slate-300 leading-relaxed">
                <b>Kembalikan stok produk otomatis</b> ke inventaris untuk semua transaksi terpilih
              </span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMultipleOrders(selectedOrderIds, restoreStockOnDelete);
                  setSelectedOrderIds([]);
                  setIsBulkDeleteModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs transition shadow-lg shadow-red-950/40 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus {selectedOrderIds.length} Nota</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
