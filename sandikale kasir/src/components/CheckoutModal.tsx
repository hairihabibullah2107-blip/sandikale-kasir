import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, PaymentStatus } from '../types';
import { SandikaleLogo } from './SandikaleLogo';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  QrCode,
  Banknote,
  Copy,
  CheckCircle2,
  X,
  ShieldCheck,
  Smartphone,
  Building,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    cart,
    cartSubtotal,
    createOrder,
    settings,
    currentUser,
    t,
    showToast
  } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [paymentType, setPaymentType] = useState<PaymentStatus>('Lunas');
  const [dpAmount, setDpAmount] = useState<number>(() => Math.round(cartSubtotal / 2));
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Cash');

  // Cash handling
  const [cashReceived, setCashReceived] = useState<string>('');

  // Digital payments state
  const [qrisDataUrl, setQrisDataUrl] = useState<string>('');
  const [simulatedQrisPaid, setSimulatedQrisPaid] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  // Auto update DP amount when cart changes
  useEffect(() => {
    setDpAmount(Math.round(cartSubtotal / 2));
    if (cart.length > 0 && cart[0].customDetails?.customerNotes) {
      // Pre-fill customer info if available from custom sablon
      const firstItem = cart[0];
      if (firstItem.customDetails) {
        // extract name if pattern matches
      }
    }
  }, [cartSubtotal, cart]);

  // Generate real dynamic QR code when QRIS is selected
  useEffect(() => {
    if (selectedMethod === 'QRIS' && isOpen) {
      const billAmount = paymentType === 'DP' ? dpAmount : cartSubtotal;
      // Standard Indonesian QRIS payload simulation format (EMVCo compliance placeholder)
      const qrisPayload = `00020101021226600016ID.CO.SANDIKALE.WWW0118${settings.qrisNmid}0215INV${Date.now()}520458125303360540${billAmount.toString().length}${billAmount}5802ID5917${settings.qrisMerchantName}6006LOMBOK6304`;
      
      QRCode.toDataURL(qrisPayload, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(url => setQrisDataUrl(url))
        .catch(err => console.error('QR code generation failed:', err));
    }
  }, [selectedMethod, paymentType, dpAmount, cartSubtotal, settings, isOpen]);

  if (!isOpen) return null;

  const totalBill = cartSubtotal;
  const targetPayAmount = paymentType === 'DP' ? dpAmount : totalBill;
  const remainingDebt = Math.max(0, totalBill - dpAmount);

  const numCashReceived = parseInt(cashReceived.replace(/[^0-9]/g, '')) || 0;
  const changeDue = Math.max(0, numCashReceived - targetPayAmount);
  const isCashInsufficient = selectedMethod === 'Cash' && numCashReceived > 0 && numCashReceived < targetPayAmount;

  const handleCopyAccount = (bank: string, accountNo: string) => {
    navigator.clipboard.writeText(accountNo);
    setCopiedBank(bank);
    showToast(`Nomor Rekening ${bank} disalin`, 'info');
    setTimeout(() => setCopiedBank(null), 2500);
  };

  const handleCompleteOrder = async () => {
    if (selectedMethod === 'Cash' && numCashReceived < targetPayAmount && numCashReceived !== 0) {
      showToast('Uang tunai yang diterima masih kurang!', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      await createOrder({
        customerName: customerName.trim() || 'Pelanggan Umum',
        customerPhone: customerPhone.trim() || '',
        items: [...cart],
        subtotal: cartSubtotal,
        discount: 0,
        tax: 0,
        total: totalBill,
        paidAmount: targetPayAmount,
        dpAmount: paymentType === 'DP' ? dpAmount : totalBill,
        remainingAmount: paymentType === 'DP' ? remainingDebt : 0,
        changeAmount: selectedMethod === 'Cash' ? changeDue : 0,
        paymentMethod: selectedMethod,
        paymentStatus: paymentType === 'DP' && remainingDebt > 0 ? 'DP' : 'Lunas',
        productionStatus: 'Antrean Desain',
        cashierName: currentUser?.name || 'Kasir',
        cashierId: currentUser?.id || 'u-1',
        notes: notes.trim()
      });

      // Confetti effect
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      onClose();
    } catch (err) {
      console.error('Order creation error:', err);
      showToast('Terjadi kesalahan saat memproses order', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const cashPresets = [
    { label: 'Uang Pas', amount: targetPayAmount },
    { label: '50.000', amount: 50000 },
    { label: '100.000', amount: 100000 },
    { label: '200.000', amount: 200000 },
    { label: '500.000', amount: 500000 },
    { label: '1.000.000', amount: 1000000 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      {/* Checkout Card with Subtle Watermark in Corner */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Subtle Elegant Watermark in Bottom-Right Corner as requested */}
        <div className="absolute right-0 bottom-0 pointer-events-none z-0 translate-x-12 translate-y-12">
          <SandikaleLogo variant="watermark" />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {t.checkoutTitle}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{cart.length} Jenis Item</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" /> Enkripsi Transaksi Aktif
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          
          {/* Left Column: Customer Info & Terms (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Customer Information */}
            <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {t.customerInfo}
                </span>
                <span className="text-[11px] text-red-400">Notifikasi WA Otomatis</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.customerName}
                </label>
                <input
                  type="text"
                  placeholder="Cth: Mas Dika / Distro Clothing"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.customerPhone}
                </label>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan Transaksi / Instruksi Khusus
                </label>
                <input
                  type="text"
                  placeholder="Cth: Ambil hari Kamis jam 3 sore"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Payment Type Selection (Lunas vs DP) */}
            <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
                {t.paymentType}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('Lunas')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                    paymentType === 'Lunas'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span>{t.fullPayment}</span>
                  <span className="text-[10px] font-mono font-normal">Bayar 100% Sekarang</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('DP')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                    paymentType === 'DP'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span>{t.dpPayment}</span>
                  <span className="text-[10px] font-mono font-normal">Uang Muka Produksi</span>
                </button>
              </div>

              {/* DP Amount Input & Sisa Piutang Calculation */}
              {paymentType === 'DP' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        {t.dpAmount}
                      </label>
                      <button
                        type="button"
                        onClick={() => setDpAmount(Math.round(totalBill * 0.5))}
                        className="text-[11px] text-amber-400 hover:underline"
                      >
                        Set 50% (Rp {Math.round(totalBill * 0.5).toLocaleString('id-ID')})
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-400">Rp</span>
                      <input
                        type="number"
                        min="1"
                        max={totalBill}
                        value={dpAmount}
                        onChange={e => setDpAmount(Math.min(totalBill, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-amber-500/50 text-sm text-white font-bold font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-amber-300 font-medium block">
                        {t.remainingDebt}:
                      </span>
                      <span className="text-[10px] text-amber-400/80">
                        Akan dilunasi saat barang diambil
                      </span>
                    </div>
                    <span className="text-base font-extrabold text-amber-400 font-mono">
                      Rp {remainingDebt.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Total Billing Display */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-mono uppercase">
                  Nominal Dibayar Sekarang:
                </span>
                <span className="text-[11px] text-slate-500">
                  {paymentType === 'DP' ? 'Uang Muka (DP)' : 'Lunas Total'}
                </span>
              </div>
              <span className="text-2xl font-black text-red-500 font-mono">
                Rp {targetPayAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Right Column: Payment Method & Channel Tabs (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Method Category Selector */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block mb-2">
                {t.paymentMethod}
              </span>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Cash', label: 'Tunai (Cash)', icon: Banknote },
                  { id: 'QRIS', label: 'QRIS All Bank', icon: QrCode },
                  { id: 'Transfer BCA', label: 'Bank Transfer', icon: Building },
                ].map(m => {
                  const Icon = m.icon;
                  const isSelected = selectedMethod === m.id || (m.id === 'Transfer BCA' && selectedMethod.startsWith('Transfer'));
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id as PaymentMethod)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'bg-red-600/20 border-red-500 text-red-400 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-channel Content */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 min-h-[260px] flex flex-col justify-between">
              
              {/* CASH CHANNEL */}
              {selectedMethod === 'Cash' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t.cashReceived} (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder={`Min. Rp ${targetPayAmount.toLocaleString('id-ID')}`}
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-base text-white font-bold font-mono focus:outline-none focus:border-red-500 transition"
                    />
                  </div>

                  {/* Cash Presets */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {cashPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashReceived(preset.amount.toString())}
                        className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-300 transition text-center"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Change Display */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      {t.changeAmount}:
                    </span>
                    <span
                      className={`text-lg font-bold font-mono ${
                        isCashInsufficient ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {isCashInsufficient
                        ? 'Uang Masih Kurang!'
                        : `Rp ${changeDue.toLocaleString('id-ID')}`}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS CHANNEL */}
              {selectedMethod === 'QRIS' && (
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                    <QrCode className="w-4 h-4 text-red-500" />
                    <span>Pindai QRIS (Mendukung BCA, Mandiri, BRI, GoPay, OVO, Dana)</span>
                  </div>

                  {qrisDataUrl ? (
                    <div className="p-2.5 bg-white rounded-xl shadow-lg inline-block">
                      <img
                        src={qrisDataUrl}
                        alt="QRIS Code"
                        className="w-48 h-48 rounded"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-slate-800 animate-pulse rounded-xl" />
                  )}

                  <div className="text-[11px] text-slate-400">
                    NMID: <span className="font-mono text-slate-200">{settings.qrisNmid}</span> • {settings.qrisMerchantName}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSimulatedQrisPaid(true);
                      showToast('Simulasi: Notifikasi pembayaran QRIS berhasil diterima!', 'success');
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      simulatedQrisPaid
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {simulatedQrisPaid ? '✓ Pembayaran Terkonfirmasi' : 'Simulasi Pembeli Sudah Scan QRIS'}
                  </button>
                </div>
              )}

              {/* BANK TRANSFER / VA CHANNEL */}
              {selectedMethod.startsWith('Transfer') && (
                <div className="space-y-3">
                  <span className="text-xs text-slate-300 font-semibold block">
                    Pilih Bank Tujuan Transfer:
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {settings.bankAccounts.map(acc => (
                      <button
                        key={acc.bank}
                        type="button"
                        onClick={() => setSelectedMethod(`Transfer ${acc.bank}` as PaymentMethod)}
                        className={`p-2 rounded-xl border text-xs text-left transition ${
                          selectedMethod === `Transfer ${acc.bank}`
                            ? 'bg-red-600/20 border-red-500 text-red-400 font-bold'
                            : 'bg-slate-800/60 border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="font-bold">{acc.bank}</div>
                        <div className="font-mono text-[10px] text-slate-400">{acc.accountNo}</div>
                      </button>
                    ))}
                  </div>

                  {/* Active Selected Bank Account Detail */}
                  {(() => {
                    const activeBankName = selectedMethod.replace('Transfer ', '');
                    const acc = settings.bankAccounts.find(b => b.bank === activeBankName) || settings.bankAccounts[0];
                    return (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Nomor Rekening {acc.bank}:</span>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(acc.bank, acc.accountNo)}
                            className="flex items-center gap-1 text-red-400 hover:text-red-300 font-mono text-[11px]"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedBank === acc.bank ? 'Tersalin!' : 'Salin Rekening'}
                          </button>
                        </div>
                        <div className="font-mono text-base font-bold text-white tracking-wider">
                          {acc.accountNo}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          A.N. <span className="text-slate-200 font-semibold">{acc.holderName}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Confirm & Process Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCompleteOrder}
                className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm transition shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Menyimpan Transaksi...</span>
                ) : (
                  <>
                    <span>{t.processPaymentBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
