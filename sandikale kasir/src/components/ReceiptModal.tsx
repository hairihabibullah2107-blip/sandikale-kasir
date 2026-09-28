import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import { bluetoothPrinter } from '../utils/bluetoothPrinter';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { formatVerificationCode } from '../utils/crypto';
import { SandikaleLogo } from './SandikaleLogo';
import {
  Printer,
  FileText,
  Share2,
  X,
  CheckCircle,
  Bluetooth,
  Smartphone,
  ShieldCheck
} from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  const { settings, bluetoothState, showToast } = useApp();
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [isPrintingBt, setIsPrintingBt] = useState<boolean>(false);

  if (!order) return null;

  const verCode = formatVerificationCode(order.tamperChecksum || '');

  const handlePrintBluetooth = async () => {
    if (!bluetoothState.isConnected) {
      showToast('Printer Bluetooth belum terhubung! Silakan hubungkan di navbar/pengaturan.', 'error');
      return;
    }

    setIsPrintingBt(true);
    try {
      const bytes = bluetoothPrinter.buildOrderReceiptBytes(order, settings);
      await bluetoothPrinter.sendBytes(bytes);
      showToast('Struk berhasil dicetak ke Printer Bluetooth', 'success');
    } catch (err: any) {
      console.error('Bluetooth print error:', err);
      showToast(err.message || 'Gagal mengirim data ke printer Bluetooth', 'error');
    } finally {
      setIsPrintingBt(false);
    }
  };

  const handleSystemPrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!order.customerPhone) {
      showToast('Nomor WhatsApp pelanggan tidak tercatat di nota ini.', 'error');
      return;
    }
    const { url } = generateWhatsAppMessage(order, settings);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Header (Hidden on print) */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pratinjau Nota Transaksi</h3>
              <p className="text-xs text-slate-400">Nota Resmi SANDIKALE-PROJECT</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Size Toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition font-mono ${
                  paperWidth === '58mm' ? 'bg-red-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition font-mono ${
                  paperWidth === '80mm' ? 'bg-red-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body & Thermal Paper Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6 items-center md:items-start justify-center bg-slate-950/50 print:bg-white print:p-0">
          
          {/* Thermal Paper Simulation Container */}
          <div
            id="thermal-receipt-element"
            className={`relative bg-white text-slate-900 p-5 shadow-2xl border border-slate-300 transition-all font-mono select-text print:shadow-none print:border-none print:w-full ${
              paperWidth === '58mm' ? 'w-[280px] text-[11px]' : 'w-[360px] text-[12px]'
            }`}
          >
            {/* Subtle Watermark on Receipt Paper to prevent forgery */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
              <SandikaleLogo variant="watermark" />
            </div>

            {/* Receipt Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-400">
              <div className="flex flex-col items-center justify-center mb-1">
                <span className="font-extrabold text-base tracking-wider uppercase text-slate-900 font-sans">
                  {settings.storeName}
                </span>
              </div>
              <div className="text-[10px] text-slate-600 leading-tight">
                {settings.tagline}
              </div>
              <div className="text-[9px] text-slate-500 mt-1 leading-tight">
                {settings.address}
              </div>
              <div className="text-[9px] text-slate-500 font-sans mt-0.5">
                WA: {settings.phone} | IG: @{settings.instagram}
              </div>
            </div>

            {/* Order Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>No. Nota</span>
                <span className="font-bold">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal</span>
                <span>{order.displayDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan</span>
                <span className="font-semibold truncate max-w-[150px]">{order.customerName}</span>
              </div>
              {order.customerPhone && (
                <div className="flex justify-between">
                  <span>No. WA</span>
                  <span>{order.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Kasir</span>
                <span>{order.cashierName}</span>
              </div>
            </div>

            {/* Order Items */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold text-slate-950 leading-tight">
                    {item.name}
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{item.qty} x {item.price.toLocaleString('id-ID')}</span>
                    <span className="font-bold text-slate-950">
                      {(item.qty * item.price).toLocaleString('id-ID')}
                    </span>
                  </div>
                  {item.customDetails?.sideSpecs && item.customDetails.sideSpecs.length > 0 && (
                    <div className="text-[9px] text-slate-500 italic pl-2">
                      * {item.customDetails.sideSpecs.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total, DP & Sisa */}
            <div className="py-2.5 border-b-2 border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Diskon</span>
                  <span>-Rp {order.discount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-950 pt-1 border-t border-slate-300">
                <span>TOTAL</span>
                <span>Rp {order.total.toLocaleString('id-ID')}</span>
              </div>

              {order.paymentStatus === 'DP' ? (
                <>
                  <div className="flex justify-between text-amber-700 font-semibold pt-1">
                    <span>DP DITERIMA ({order.paymentMethod})</span>
                    <span>Rp {order.dpAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-xs text-red-600 bg-red-50 p-1 rounded mt-1">
                    <span>SISA TAGIHAN</span>
                    <span>Rp {order.remainingAmount.toLocaleString('id-ID')}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>Metode Bayar</span>
                    <span className="font-semibold">{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Nominal Diterima</span>
                    <span>Rp {order.paidAmount.toLocaleString('id-ID')}</span>
                  </div>
                  {order.changeAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Kembalian</span>
                      <span>Rp {order.changeAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="text-center font-bold text-xs text-emerald-700 bg-emerald-50 py-1 rounded mt-1">
                    STATUS: LUNAS
                  </div>
                </>
              )}
            </div>

            {/* Digital Security Seal & Anti-Duplication Code */}
            <div className="pt-3 text-center space-y-1">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                KODE VERIFIKASI DIGITAL ASLI
              </div>
              <div className="inline-block px-2 py-0.5 border border-slate-400 bg-slate-50 rounded text-[10px] font-bold tracking-widest text-slate-800">
                {verCode}
              </div>
              <div className="text-[9px] text-slate-500 italic pt-1">
                {settings.receiptFooter}
              </div>
              <div className="text-[8px] text-slate-400 pt-1">
                Dicetak via SANDIKALE POS V3 Pro
              </div>
            </div>
          </div>

          {/* Action Sidebar (Hidden on print) */}
          <div className="w-full md:w-56 flex flex-col gap-2.5 print:hidden">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Aksi Cetak & Kirim
            </span>

            {/* Bluetooth Thermal Print */}
            <button
              onClick={handlePrintBluetooth}
              disabled={isPrintingBt}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-950/40 disabled:opacity-50"
            >
              <Bluetooth className="w-4 h-4" />
              <span>{isPrintingBt ? 'Mencetak...' : 'Cetak Bluetooth'}</span>
            </button>

            {/* System Thermal Print */}
            <button
              onClick={handleSystemPrint}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kertas Thermal</span>
            </button>

            {/* Send WhatsApp */}
            <button
              onClick={handleSendWhatsApp}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-950/40"
            >
              <Smartphone className="w-4 h-4" />
              <span>Kirim Nota via WA</span>
            </button>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1 mt-2">
              <div className="flex items-center gap-1 text-slate-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                <span>Anti-Duplikasi</span>
              </div>
              <p>Struk ini dilengkapi hash kriptografi SHA-256 dan watermark anti-pemalsuan.</p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition mt-auto"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
