import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { POSView } from './views/POSView';
import { QueueProductionView } from './views/QueueProductionView';
import { InventoryView } from './views/InventoryView';
import { AnalyticsView } from './views/AnalyticsView';
import { TransactionsView } from './views/TransactionsView';
import { SettingsView } from './views/SettingsView';
import { CustomSablonModal } from './components/CustomSablonModal';
import { CheckoutModal } from './components/CheckoutModal';
import { ReceiptModal } from './components/ReceiptModal';
import { BluetoothModal } from './components/BluetoothModal';
import { SecurityModal } from './components/SecurityModal';
import { Order } from './types';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, activeReceiptOrder, setActiveReceiptOrder, toast } = useApp();

  const [currentTab, setCurrentTab] = useState<string>('pos');
  const [isRemoteMode, setIsRemoteMode] = useState<boolean>(false);

  // Modals state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Settle DP modal target order
  const [settleOrderTarget, setSettleOrderTarget] = useState<Order | null>(null);

  // If user is not authenticated, show login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  const handleToggleRemoteMode = () => {
    const next = !isRemoteMode;
    setIsRemoteMode(next);
    if (next) {
      setCurrentTab('analytics');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          isRemoteMode={isRemoteMode}
          onToggleRemoteMode={handleToggleRemoteMode}
        />

        {/* Dynamic Views */}
        <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
          {currentTab === 'pos' && (
            <POSView
              onOpenCustomModal={() => setIsCustomModalOpen(true)}
              onOpenCheckoutModal={() => setIsCheckoutModalOpen(true)}
            />
          )}

          {currentTab === 'queue' && (
            <QueueProductionView
              onOpenReceipt={(order) => setActiveReceiptOrder(order)}
              onOpenSettleModal={(order) => {
                setCurrentTab('transactions');
              }}
            />
          )}

          {currentTab === 'inventory' && <InventoryView />}

          {currentTab === 'analytics' && (
            <AnalyticsView isRemoteMode={isRemoteMode} />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              onOpenReceipt={(order) => setActiveReceiptOrder(order)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
              onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/50 text-red-300'
                : 'bg-slate-900/95 border-slate-700 text-slate-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <CustomSablonModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
      />

      <ReceiptModal
        order={activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
      />

      <BluetoothModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
