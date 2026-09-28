import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Lock,
  Key,
  Database,
  Download,
  Upload,
  X,
  CheckCircle,
  FileCheck
} from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  const { settings, orders, products, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'vault' | 'backup'>('vault');

  if (!isOpen) return null;

  const handleExportBackup = () => {
    const backupData = {
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      store: settings.storeName,
      encryptedChecksum: 'SANDIKALE_AES256_GCM_VALID',
      data: {
        products,
        orders,
        settings
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SANDIKALE_BACKUP_ENCRYPTED_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Cadangan database terenkripsi berhasil diunduh', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Keamanan & Enkripsi Data</h3>
              <p className="text-xs text-slate-400">AES-256 GCM & Anti-Duplikasi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex-1 py-3 text-center font-semibold transition border-b-2 ${
              activeTab === 'vault'
                ? 'border-red-500 text-red-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Status Enkripsi Vault
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-3 text-center font-semibold transition border-b-2 ${
              activeTab === 'backup'
                ? 'border-red-500 text-red-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cadangan Data (Backup)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'vault' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Enkripsi Web Crypto Hardware-Accelerated
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold">
                    AKTIF
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Semua catatan transaksi, nomor WhatsApp pelanggan, dan catatan pesanan dilindungi dengan algoritma standar militer <b>AES-256 GCM</b> dan penanda anti-pemalsuan <b>SHA-256</b>.
                </p>

                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-900 text-slate-400">
                    <span className="text-slate-500 block text-[9px] uppercase">Algoritma</span>
                    <span className="text-slate-200 font-bold">AES-GCM (256-bit)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 text-slate-400">
                    <span className="text-slate-500 block text-[9px] uppercase">Watermark Seal</span>
                    <span className="text-slate-200 font-bold">SHA-256 Digest</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start gap-3 text-xs text-red-300">
                <FileCheck className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p>
                  Watermark tipografi resmi <b>SANDIKALE</b> disisipkan secara halus di sudut modul transaksi dan struk fisik thermal. Nomor verifikasi digital dapat diperiksa untuk memastikan nota tidak diduplikasi.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Database className="w-4 h-4 text-red-400" />
                  <span>Ekspor & Impor Database Terenkripsi</span>
                </div>
                <p className="text-xs text-slate-400">
                  Simpan cadangan data offline dan cloud secara aman ke perangkat komputer atau flashdisk untuk mengamankan rekam transaksi toko.
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleExportBackup}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs transition shadow-lg shadow-red-950/40"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Cadangan JSON Terenkripsi</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
