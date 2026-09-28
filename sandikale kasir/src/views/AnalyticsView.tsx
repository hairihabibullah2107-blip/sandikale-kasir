import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertCircle,
  ShoppingBag,
  Download,
  Calendar,
  CreditCard,
  Clock,
  Printer,
  Sparkles,
  Smartphone,
  FileText,
  FileSpreadsheet,
  Eye,
  Check,
  X
} from 'lucide-react';
import { downloadAnalyticsPDF, generateAnalyticsPDF } from '../utils/pdfGenerator';
import { downloadAnalyticsExcel } from '../utils/excelGenerator';

interface AnalyticsViewProps {
  isRemoteMode?: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ isRemoteMode }) => {
  const { orders, t, settings, showToast, currentUser } = useApp();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [includeTableInPdf, setIncludeTableInPdf] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  // Filter orders by date range
  const now = new Date();
  const filteredOrders = orders.filter(o => {
    if (period === 'all') return true;
    const orderDate = new Date(o.date);
    if (period === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return orderDate >= sevenDaysAgo;
    }
    if (period === 'month') {
      return (
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  // Calculate Metrics
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalBilled = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingReceivables = filteredOrders.reduce((sum, o) => sum + o.remainingAmount, 0);
  const totalOrderCount = filteredOrders.length;

  // Approximate gross profit (Revenue minus approximate COGS)
  const estimatedCost = filteredOrders.reduce((sum, o) => {
    const itemCost = o.items.reduce((s, it) => s + (it.costPrice || it.price * 0.6) * it.qty, 0);
    return sum + itemCost;
  }, 0);
  const estimatedGrossProfit = Math.max(0, totalBilled - estimatedCost);

  // Payment method breakdown
  const paymentBreakdown: { [method: string]: number } = {};
  filteredOrders.forEach(o => {
    const key = o.paymentMethod || 'Cash';
    paymentBreakdown[key] = (paymentBreakdown[key] || 0) + o.paidAmount;
  });

  // Best selling products
  const productCountMap: { [name: string]: { qty: number; revenue: number } } = {};
  filteredOrders.forEach(o => {
    o.items.forEach(it => {
      if (!productCountMap[it.name]) {
        productCountMap[it.name] = { qty: 0, revenue: 0 };
      }
      productCountMap[it.name].qty += it.qty;
      productCountMap[it.name].revenue += it.price * it.qty;
    });
  });

  const topProducts = Object.entries(productCountMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);

  // Hourly traffic simulation from real orders
  const hourlyTraffic = Array.from({ length: 12 }).map((_, idx) => {
    const hour = idx + 9; // 09:00 - 20:00
    const count = filteredOrders.filter(o => {
      const d = new Date(o.date);
      return d.getHours() === hour;
    }).length;
    return { hour: `${hour}:00`, count };
  });

  const maxHourlyCount = Math.max(1, ...hourlyTraffic.map(h => h.count));

  // Export to Excel (Professional Formatted XLSX)
  const handleExportExcel = async (customIncludeTable?: boolean) => {
    try {
      setIsGeneratingExcel(true);
      await downloadAnalyticsExcel(filteredOrders, settings, {
        period,
        includeTransactionsList: customIncludeTable !== undefined ? customIncludeTable : includeTableInPdf,
        currentUser,
      });
      showToast(`Laporan Excel profesional (.xlsx) berhasil diunduh (${filteredOrders.length} transaksi)`, 'success');
      if (showPdfModal) {
        setShowPdfModal(false);
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses berkas Excel (.xlsx)', 'error');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      setIsGeneratingPdf(true);
      downloadAnalyticsPDF(filteredOrders, settings, {
        period,
        includeTransactionsList: includeTableInPdf,
        currentUser,
      });
      showToast('Laporan analitik & keuangan PDF berhasil diunduh', 'success');
      setShowPdfModal(false);
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses berkas PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePreviewPDF = () => {
    try {
      setIsGeneratingPdf(true);
      const doc = generateAnalyticsPDF(filteredOrders, settings, {
        period,
        includeTransactionsList: includeTableInPdf,
        currentUser,
      });
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      showToast('Pratinjau laporan PDF dibuka di tab baru', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal membuka pratinjau PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-500" />
              <span>{t.analyticsTitle}</span>
            </h2>
            {isRemoteMode && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-[10px] text-amber-300 font-mono font-bold animate-pulse">
                <Smartphone className="w-3 h-3" /> Remote Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {t.analyticsSubtitle}
          </p>
        </div>

        {/* Filter Period and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                period === 'today'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.periodToday}
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                period === 'week'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.periodWeek}
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                period === 'month'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.periodMonth}
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                period === 'all'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.periodAll}
            </button>
          </div>

          {/* Export PDF */}
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-xs font-semibold text-red-300 hover:text-white transition shadow-sm"
            title="Buka opsi ekspor dokumen resmi PDF dan Excel"
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span>Export PDF</span>
          </button>

          {/* Export Excel (.xlsx) */}
          <button
            onClick={() => handleExportExcel()}
            disabled={isGeneratingExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:text-white transition shadow-sm"
            title="Unduh berkas Excel (.xlsx) profesional dengan kartu KPI eksekutif, tabel bergaris rapi, & sheet database"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{isGeneratingExcel ? 'Memproses...' : 'Export Excel (.xlsx)'}</span>
            <span className="sm:hidden">Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue (Omzet Masuk) */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.totalRevenue}</span>
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span>Real-time arus kas masuk (DP + Lunas)</span>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.grossProfit}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            Rp {estimatedGrossProfit.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-500">
            Estimasi margin laba bersih toko
          </div>
        </div>

        {/* Piutang (Pending Receivables) */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.pendingReceivables}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
            Rp {pendingReceivables.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-amber-400/80">
            Sisa pembayaran yang belum dilunasi
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.totalOrders}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {totalOrderCount} Transaksi
          </div>
          <div className="text-[10px] text-slate-500">
            Pesanan terverifikasi sistem
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Hourly Traffic Peaks (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              <h3 className="font-bold text-sm text-white">{t.hourlyTraffic}</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">09:00 - 20:00 WITA</span>
          </div>

          {/* Bar Chart Representation */}
          <div className="h-48 flex items-end justify-between gap-1.5 pt-6 pb-2 px-1">
            {hourlyTraffic.map((item, idx) => {
              const heightPercent = maxHourlyCount > 0 ? (item.count / maxHourlyCount) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    {item.count}
                  </span>
                  <div className="w-full bg-slate-800 rounded-t-lg overflow-hidden h-full flex items-end">
                    <div
                      style={{ height: `${Math.max(8, heightPercent)}%` }}
                      className={`w-full rounded-t transition-all duration-300 ${
                        item.count > 0 ? 'bg-gradient-to-t from-red-600 to-red-400' : 'bg-slate-800'
                      }`}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 truncate w-full text-center">
                    {item.hour.split(':')[0]}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            Pola jam sibuk kasir digunakan untuk mengatur jadwal staf cetak & kasir lapangan.
          </p>
        </div>

        {/* Payment Method Share (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-sm text-white">{t.paymentBreakdown}</h3>
          </div>

          <div className="space-y-3 pt-2">
            {Object.keys(paymentBreakdown).length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Belum ada transaksi pada periode ini.
              </div>
            ) : (
              Object.entries(paymentBreakdown).map(([method, amount]) => {
                const percentage = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{method}</span>
                      <span className="font-mono text-white font-bold">
                        Rp {amount.toLocaleString('id-ID')} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-red-500 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top 5 Best Selling Products (12 cols) */}
        <div className="lg:col-span-12 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">{t.topProducts}</h3>
            <span className="text-xs text-slate-400 font-mono">Berdasarkan Volume Terjual</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {topProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Tidak ada data produk terjual pada periode ini.
              </div>
            ) : (
              topProducts.map(([name, stat], idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-red-400 font-mono font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-200">
                      {name}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-white font-mono block">
                      {stat.qty} pcs
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Omzet: Rp {stat.revenue.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Export PDF Modal Dialog */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Ekspor Laporan Resmi (PDF & Excel)</h3>
                  <p className="text-[11px] text-slate-400">Dokumen analitik & keuangan {settings.storeName || 'Sandikale'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Scope Info */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Periode Laporan:</span>
                <span className="font-bold text-red-400">
                  {period === 'today' ? 'Hari Ini' : period === 'week' ? '7 Hari Terakhir' : period === 'month' ? 'Bulan Ini' : 'Semua Data Riwayat'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cakupan Data:</span>
                <span className="font-mono font-bold text-white">{filteredOrders.length} Transaksi Terpilih</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Omzet Masuk:</span>
                <span className="font-mono font-bold text-emerald-400">
                  Rp {totalRevenue.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Piutang Belum Lunas:</span>
                <span className="font-mono font-bold text-amber-400">
                  Rp {pendingReceivables.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Konfigurasi Format Dokumen:</label>
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition">
                <input
                  type="checkbox"
                  checked={includeTableInPdf}
                  onChange={e => setIncludeTableInPdf(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0 cursor-pointer"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-white block">Sertakan Tabel Rincian Nota Transaksi</span>
                  <span className="text-[11px] text-slate-400 block leading-relaxed">
                    Menyertakan tabel detail setiap nota (No. nota, waktu, pelanggan, rincian barang, total tagihan, pembayaran, sisa piutang, dan status) baik di PDF maupun lembar Excel.
                  </span>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handlePreviewPDF}
                  disabled={isGeneratingPdf || isGeneratingExcel}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                  title="Buka pratinjau di tab browser untuk melihat atau mencetak"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pratinjau / Cetak PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf || isGeneratingExcel}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Unduh Berkas PDF'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleExportExcel()}
                disabled={isGeneratingPdf || isGeneratingExcel}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{isGeneratingExcel ? 'Membuat Berkas Excel (.xlsx)...' : 'Unduh Berkas Excel (.xlsx) Profesional'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
