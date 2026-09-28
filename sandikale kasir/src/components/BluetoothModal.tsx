import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { bluetoothPrinter } from '../utils/bluetoothPrinter';
import {
  Printer,
  Bluetooth,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Play,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

interface BluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({ isOpen, onClose }) => {
  const { bluetoothState, connectBluetooth, disconnectBluetooth, settings, showToast } = useApp();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const ok = await connectBluetooth();
      if (ok) {
        showToast('Printer Bluetooth berhasil terhubung!', 'success');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    if (!bluetoothState.isConnected) {
      showToast('Hubungkan printer terlebih dahulu', 'error');
      return;
    }
    setIsTesting(true);
    try {
      const testBytes = bluetoothPrinter.buildTestReceiptBytes(settings);
      await bluetoothPrinter.sendBytes(testBytes);
      showToast('Perintah uji cetak berhasil dikirim!', 'success');
    } catch (err: any) {
      console.error('Test print failed:', err);
      showToast(err.message || 'Gagal mengirim uji cetak', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Bluetooth className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Printer Bluetooth Thermal</h3>
              <p className="text-xs text-slate-400">Koneksi ESC/POS 58mm & 80mm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              bluetoothState.isConnected
                ? 'bg-blue-950/30 border-blue-500/40'
                : 'bg-slate-800/40 border-slate-700/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  bluetoothState.isConnected
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase text-slate-400 block font-semibold">
                  Status Perangkat
                </span>
                <span className="text-sm font-bold text-white">
                  {bluetoothState.isConnected
                    ? bluetoothState.deviceName || 'Thermal Printer Terhubung'
                    : 'Belum Terhubung'}
                </span>
              </div>
            </div>

            {bluetoothState.isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {bluetoothState.isConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={isTesting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs transition shadow-lg shadow-blue-950/40 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>{isTesting ? 'Mengirim Data...' : 'Kirim Uji Cetak (Test Print)'}</span>
                </button>
                <button
                  type="button"
                  onClick={disconnectBluetooth}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-400 font-semibold text-xs transition border border-slate-700"
                >
                  Putuskan Koneksi Bluetooth
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm transition shadow-lg shadow-blue-950/40 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isConnecting ? 'animate-spin' : ''}`} />
                <span>{isConnecting ? 'Memindai Perangkat...' : 'Pindai & Sambungkan Printer'}</span>
              </button>
            )}
          </div>

          {/* Error Message Banner */}
          {bluetoothState.error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-2.5 text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{bluetoothState.error}</span>
            </div>
          )}

          {/* Guide / Troubleshooting */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Panduan Staf Kasir Lapangan:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>Pastikan Bluetooth perangkat dan printer thermal sudah menyala (ON).</li>
              <li>Gunakan browser Google Chrome / Microsoft Edge (desktop atau Android).</li>
              <li>Mendukung printer thermal standar RPP02N, Panda, Iware, Zywell, Bluetooth POS 58mm/80mm.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
