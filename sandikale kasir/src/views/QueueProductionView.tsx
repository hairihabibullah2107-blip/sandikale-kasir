import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductionStatus, Order } from '../types';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import {
  Layers,
  Search,
  Smartphone,
  Printer,
  CheckCircle2,
  Clock,
  Paintbrush,
  Sparkles,
  ChevronRight,
  Filter,
  DollarSign
} from 'lucide-react';

interface QueueProductionViewProps {
  onOpenReceipt: (order: Order) => void;
  onOpenSettleModal: (order: Order) => void;
}

export const QueueProductionView: React.FC<QueueProductionViewProps> = ({
  onOpenReceipt,
  onOpenSettleModal
}) => {
  const { orders, updateOrderStatus, settings, t, showToast } = useApp();
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stages: ProductionStatus[] = [
    'Antrean Desain',
    'Proses Cetak',
    'Finishing',
    'Siap Ambil',
    'Selesai'
  ];

  const filteredOrders = orders.filter(ord => {
    const matchesStage = filterStage === 'all' || ord.productionStatus === filterStage;
    const matchesSearch =
      ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerPhone.includes(searchQuery);
    return matchesStage && matchesSearch;
  });

  const handleStatusChange = (order: Order, newStatus: ProductionStatus) => {
    updateOrderStatus(order.id, newStatus);

    // Ask to send WhatsApp notification
    if (order.customerPhone) {
      const { url } = generateWhatsAppMessage(order, settings, newStatus);
      showToast(`Status diubah ke ${newStatus}. Mengarahkan ke WhatsApp...`, 'info');
      window.open(url, '_blank');
    }
  };

  const handleSendWA = (order: Order) => {
    if (!order.customerPhone) {
      showToast('Nomor WhatsApp pelanggan belum terdata', 'error');
      return;
    }
    const { url } = generateWhatsAppMessage(order, settings);
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-500" />
            <span>{t.queueTitle}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {t.queueSubtitle}
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

      {/* Stage Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setFilterStage('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            filterStage === 'all'
              ? 'bg-red-600/20 text-red-400 border border-red-500/40'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Semua ({orders.length})
        </button>
        {stages.map(st => {
          const count = orders.filter(o => o.productionStatus === st).length;
          return (
            <button
              key={st}
              onClick={() => setFilterStage(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                filterStage === st
                  ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Orders List / Kanban Cards */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
            <Clock className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-medium">Tidak ada antrean pesanan pada tahap ini.</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isDP = order.paymentStatus === 'DP';
            return (
              <div
                key={order.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-700 transition"
              >
                {/* Left: Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                      {order.id}
                    </span>
                    <span className="text-xs text-slate-400">
                      {order.displayDate}
                    </span>

                    {/* Stage Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        order.productionStatus === 'Antrean Desain'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                          : order.productionStatus === 'Proses Cetak'
                          ? 'bg-blue-950/60 text-blue-400 border border-blue-500/40'
                          : order.productionStatus === 'Finishing'
                          ? 'bg-purple-950/60 text-purple-400 border border-purple-500/40'
                          : order.productionStatus === 'Siap Ambil'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {order.productionStatus}
                    </span>

                    {/* Payment Badge */}
                    {isDP ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        DP: Sisa Rp {order.remainingAmount.toLocaleString('id-ID')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        LUNAS
                      </span>
                    )}
                  </div>

                  {/* Customer & Details */}
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-white">
                      {order.customerName}
                    </h4>
                    {order.customerPhone && (
                      <span className="text-xs text-slate-400 font-mono">
                        ({order.customerPhone})
                      </span>
                    )}
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-slate-300 space-y-0.5">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">•</span>
                        <span>{it.qty}x {it.name}</span>
                        {it.customDetails?.sideSpecs && (
                          <span className="text-[11px] text-slate-500">
                            ({it.customDetails.sideSpecs.join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      Catatan: {order.notes}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap lg:flex-col items-stretch justify-center gap-2 lg:w-48 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                  {/* Status Dropdown */}
                  <div className="w-full">
                    <label className="block text-[10px] text-slate-400 font-mono uppercase mb-1">
                      Ubah Status Produksi:
                    </label>
                    <select
                      value={order.productionStatus}
                      onChange={e => handleStatusChange(order, e.target.value as ProductionStatus)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500 transition"
                    >
                      {stages.map(st => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Send WhatsApp Button */}
                  <button
                    onClick={() => handleSendWA(order)}
                    className="flex-1 lg:w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                    title="Kirim pemberitahuan status via WhatsApp"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Settle DP balance if unpaid */}
                  {isDP && (
                    <button
                      onClick={() => onOpenSettleModal(order)}
                      className="flex-1 lg:w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Pelunasan Sisa</span>
                    </button>
                  )}

                  {/* View Receipt */}
                  <button
                    onClick={() => onOpenReceipt(order)}
                    className="flex-1 lg:w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Nota Struk</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
