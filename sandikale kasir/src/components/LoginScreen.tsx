import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { SandikaleLogo } from './SandikaleLogo';
import { Lock, LogIn, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { users, setCurrentUser, showToast } = useApp();
  // Login memilih akun yang sudah dibuat di sistem oleh Admin/Owner.
  // Username tidak pernah ditampilkan atau diminta dari pengguna.
  const [selectedUserId, setSelectedUserId] = useState<string>(
    users[0]?.id || ''
  );
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!users.some(u => u.id === selectedUserId)) {
      setSelectedUserId(users[0]?.id || '');
    }
  }, [users, selectedUserId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetUser = users.find(u => u.id === selectedUserId);
    if (!targetUser) {
      setErrorMsg('Pilih akun pengguna terlebih dahulu.');
      return;
    }

    setIsLoading(true);

    const signIn = async () => {
      const email = targetUser.username.includes('@')
        ? targetUser.username
        : `${targetUser.username}@sandikale.com`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pin
      });

      if (error || !data.user) {
        console.error('[SANDIKALE] Login failed:', error);
        setErrorMsg('PIN / Kata Sandi yang dimasukkan salah atau akun cloud belum dibuat.');
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, name, role, is_active')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || profile.is_active === false) {
        console.error('[SANDIKALE] Profile load failed:', profileError);
        await supabase.auth.signOut();
        setErrorMsg('Akun pengguna tidak aktif atau profil cloud belum tersedia.');
        setIsLoading(false);
        return;
      }

      setCurrentUser({
        id: profile.id,
        username: profile.username || targetUser.username,
        name: profile.name || targetUser.name,
        role: profile.role,
        pin: ''
      });

      // Keep Auth metadata aligned with the canonical profile shown by SANDIKALE.
      if (profile.role === 'admin') {
        const { error: syncError } = await supabase.functions.invoke('manage-users', {
          body: { action: 'sync_existing' }
        });
        if (syncError) {
          console.warn('[SANDIKALE] Existing user metadata sync failed:', syncError);
        }
      }

      setIsLoading(false);
      showToast(`Selamat datang kembali, ${profile.name || targetUser.name}!`, 'success');
    };

    void signIn();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <SandikaleLogo variant="watermark" />
      </div>

      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-1.5 pt-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider font-['Plus_Jakarta_Sans']">
            SANDIKALE<span className="text-red-500">-PROJECT</span>
          </h1>
          <p className="text-xs text-slate-400">
            Sistem Kasir & Produksi Sablon Profesional
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Pilih Akun Pengguna
            </label>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-red-500 transition"
            >
              {users.length === 0 ? (
                <option value="">Belum ada pengguna</option>
              ) : (
                users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role === 'admin' ? 'ADMIN / OWNER' : u.role.toUpperCase()}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1.5 text-[10px] text-slate-500">
              Pilih nama akun yang dibuat oleh Admin / Owner, lalu masukkan PIN.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              PIN / Password Akses
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Masukkan PIN / Kata Sandi"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-red-500 transition"
              />
              <Lock className="w-4 h-4 absolute right-3.5 top-3 text-slate-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm transition shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Memverifikasi...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk Sistem Kasir</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-mono">
            Sistem Kasir Terproteksi • Enkripsi AES-256 GCM Aktif
          </span>
        </div>
      </div>
    </div>
  );
};
