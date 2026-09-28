import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SandikaleLogo } from './SandikaleLogo';
import {
  Wifi,
  WifiOff,
  Printer,
  ShieldCheck,
  Globe,
  LogOut,
  User as UserIcon,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  onOpenBluetoothModal: () => void;
  onOpenSecurityModal: () => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBluetoothModal,
  onOpenSecurityModal,
}) => {
  const {
    currentUser,
    setCurrentUser,
    isOnline,
    offlineQueueCount,
    syncOfflineQueue,
    bluetoothState,
    language,
    setLanguage,
    t
  } = useApp();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 sticky top-0">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <SandikaleLogo variant="full" />
      </div>

      {/* Center Status Indicators */}
      <div className="hidden lg:flex items-center gap-4">
        {/* Live Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-red-400" />
          <span>{currentTime}</span>
        </div>

        {/* Network & Offline Status */}
        {isOnline ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Wifi className="w-3.5 h-3.5" />
            <span>{t.statusOnline}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-950/50 border border-amber-500/40 text-xs text-amber-300">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.statusOffline}</span>
            {offlineQueueCount > 0 && (
              <button
                onClick={syncOfflineQueue}
                title="Klik untuk menyinkronkan data offline"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{offlineQueueCount} Antre</span>
              </button>
            )}
          </div>
        )}

        {/* Bluetooth Thermal Printer Indicator */}
        <button
          onClick={onOpenBluetoothModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition ${
            bluetoothState.isConnected
              ? 'bg-blue-950/40 border-blue-500/40 text-blue-400 hover:bg-blue-900/50'
              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
          title="Pengaturan Printer Bluetooth"
        >
          <Printer className={`w-3.5 h-3.5 ${bluetoothState.isConnected ? 'text-blue-400' : 'text-slate-500'}`} />
          <span>
            {bluetoothState.isConnected
              ? bluetoothState.deviceName || t.bluetoothConnected
              : t.bluetoothDisconnected}
          </span>
        </button>

        {/* AES-256 Vault Encryption Security Badge */}
        <button
          onClick={onOpenSecurityModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-400 hover:bg-red-900/40 transition"
          title="Keamanan Enkripsi AES-256 & Anti-Duplikasi"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
          <span className="font-mono text-[11px] font-semibold">AES-256 GCM</span>
        </button>
      </div>

      {/* Right Controls: Language, User Profile, Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Ganti Bahasa"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold uppercase">{language}</span>
        </button>

        {/* User Info & Role */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-200 leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-red-400 font-mono capitalize leading-tight">
                {currentUser.role}
              </span>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition ml-1"
              title="Keluar (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
