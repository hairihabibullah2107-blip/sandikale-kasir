import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Settings,
  Store,
  Printer,
  Shield,
  Users,
  Database,
  Save,
  Plus,
  Trash2,
  Lock,
  Download,
  CheckCircle2
} from 'lucide-react';

interface SettingsViewProps {
  onOpenBluetoothModal: () => void;
  onOpenSecurityModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenBluetoothModal,
  onOpenSecurityModal
}) => {
  const {
    settings,
    updateSettings,
    users,
    addUser,
    deleteUser,
    currentUser,
    t,
    showToast
  } = useApp();

  // Store Profile Form State
  const [storeName, setStoreName] = useState(settings.storeName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [instagram, setInstagram] = useState(settings.instagram);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [defaultPaperSize, setDefaultPaperSize] = useState(settings.defaultPaperSize);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(settings.autoPrintReceipt);
  const [qrisNmid, setQrisNmid] = useState(settings.qrisNmid);
  const [qrisMerchantName, setQrisMerchantName] = useState(settings.qrisMerchantName);

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('kasir');
  const [newUserPin, setNewUserPin] = useState('1234');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName,
      tagline,
      address,
      phone,
      instagram,
      receiptFooter,
      defaultPaperSize,
      autoPrintReceipt,
      qrisNmid,
      qrisMerchantName
    });
    showToast('Identitas toko berhasil diperbarui', 'success');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim()) {
      showToast('Nama dan username wajib diisi!', 'error');
      return;
    }
    addUser({
      name: newUserName.trim(),
      username: newUserUsername.trim(),
      role: newUserRole,
      pin: newUserPin || '1234'
    });
    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPin('1234');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-red-500" />
          <span>{t.settingsTitle}</span>
        </h2>
        <p className="text-xs text-slate-400">
          {t.settingsSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Store Identity & Receipt Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveStoreProfile} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm text-white">{t.storeProfile}</h3>
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Profil</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Bisnis / Toko
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Slogan / Subtitle
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alamat Lengkap Workshop
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor WhatsApp Bisnis
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Akun Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  NMID QRIS Toko
                </label>
                <input
                  type="text"
                  value={qrisNmid}
                  onChange={e => setQrisNmid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Merchant QRIS
                </label>
                <input
                  type="text"
                  value={qrisMerchantName}
                  onChange={e => setQrisMerchantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Catatan Kaki Struk (Footer Nota)
              </label>
              <input
                type="text"
                value={receiptFooter}
                onChange={e => setReceiptFooter(e.target.value)}
                placeholder="Contoh: Terima kasih atas kunjungan & kepercayaan Anda! Semoga berkah selalu."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Kalimat ucapan terima kasih umum kepada pelanggan yang tercetak di bagian paling bawah struk thermal.
              </span>
            </div>
          </form>

          {/* Printer Thermal Preferences */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Preferensi Cetak Thermal Bluetooth</h3>
              </div>
              <button
                type="button"
                onClick={onOpenBluetoothModal}
                className="text-xs text-blue-400 hover:underline font-semibold"
              >
                Uji / Sambungkan
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">Ukuran Kertas Standar</span>
                  <span className="text-[10px] text-slate-400">Lebar struk thermal kasir</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDefaultPaperSize('58mm')}
                    className={`px-2 py-1 rounded font-mono ${
                      defaultPaperSize === '58mm' ? 'bg-red-600 text-white font-bold' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    58mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultPaperSize('80mm')}
                    className={`px-2 py-1 rounded font-mono ${
                      defaultPaperSize === '80mm' ? 'bg-red-600 text-white font-bold' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    80mm
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">Cetak Struk Otomatis</span>
                  <span className="text-[10px] text-slate-400">Otomatis print saat bayar</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPrintReceipt(!autoPrintReceipt)}
                  className={`w-10 h-5 rounded-full p-0.5 transition ${
                    autoPrintReceipt ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition transform ${
                      autoPrintReceipt ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: User Management & Security (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* User Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm text-white">Manajemen Pengguna</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(true)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah User</span>
              </button>
            </div>

            <div className="space-y-2">
              {users.map(u => (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-200 block">{u.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        @{u.username} • PIN: ****
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono uppercase text-slate-300">
                      {u.role}
                    </span>
                    {u.id !== 'u-1' && (
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Hapus Pengguna"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Vault Shortcut Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Privasi & Vault Enkripsi</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                AES-256 GCM
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Catatan transaksi, data pelanggan, dan integritas nota terlindungi dengan teknologi enkripsi dan digital verification hash anti-duplikasi.
            </p>

            <button
              type="button"
              onClick={onOpenSecurityModal}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-red-500" />
              <span>Buka Pusat Keamanan & Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-white text-sm">Tambah Pengguna Baru</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Gilang Produksi"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username Login
                </label>
                <input
                  type="text"
                  required
                  placeholder="gilang123"
                  value={newUserUsername}
                  onChange={e => setNewUserUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Peran / Role
                </label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="kasir">Kasir</option>
                  <option value="produksi">Produksi</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PIN Akses (4 Digit)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newUserPin}
                  onChange={e => setNewUserPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
