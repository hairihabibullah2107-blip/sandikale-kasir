import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingCart,
  Layers,
  Boxes,
  BarChart3,
  Receipt,
  Settings,
  Shield,
  Smartphone
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isRemoteMode: boolean;
  onToggleRemoteMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isRemoteMode,
  onToggleRemoteMode
}) => {
  const { currentUser, t } = useApp();

  const navItems = [
    {
      id: 'pos',
      label: t.navPOS,
      icon: ShoppingCart,
      allowedRoles: ['admin', 'kasir'],
      badge: null
    },
    {
      id: 'queue',
      label: t.navQueue,
      icon: Layers,
      allowedRoles: ['admin', 'kasir', 'produksi'],
      badge: 'SPK'
    },
    {
      id: 'inventory',
      label: t.navInventory,
      icon: Boxes,
      allowedRoles: ['admin', 'produksi', 'kasir'],
      badge: null
    },
    {
      id: 'analytics',
      label: t.navReports,
      icon: BarChart3,
      allowedRoles: ['admin'],
      badge: 'Live'
    },
    {
      id: 'transactions',
      label: t.navHistory,
      icon: Receipt,
      allowedRoles: ['admin', 'kasir'],
      badge: null
    },
    {
      id: 'settings',
      label: t.navSettings,
      icon: Settings,
      allowedRoles: ['admin'],
      badge: null
    }
  ];

  const filteredNavItems = navItems.filter(item =>
    !currentUser || item.allowedRoles.includes(currentUser.role)
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 select-none">
        <div className="p-4 flex flex-col gap-1 border-b border-slate-800/80">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Modul Operasional
          </div>
          <div className="text-xs text-slate-500">
            Sistem Kasir & Produksi Terintegrasi
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-red-600/15 text-red-400 border border-red-500/30 shadow-sm shadow-red-950/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      isActive
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Remote Owner Monitor Switch */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <button
            onClick={onToggleRemoteMode}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${
              isRemoteMode
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Smartphone className={`w-4 h-4 ${isRemoteMode ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
              <div className="text-left">
                <div className="leading-tight">Mode Pantau Jauh</div>
                <div className="text-[10px] font-normal text-slate-500">
                  {isRemoteMode ? 'Tampilan Ringkas Owner' : 'Normal Desktop'}
                </div>
              </div>
            </div>
            <div
              className={`w-8 h-4 rounded-full p-0.5 transition ${
                isRemoteMode ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-slate-950 transition transform ${
                  isRemoteMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg flex items-center justify-around z-40 px-1">
        {filteredNavItems.slice(0, 5).map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition ${
                isActive ? 'text-red-500 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};
