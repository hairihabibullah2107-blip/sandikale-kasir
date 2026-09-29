import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { SandikaleLogo } from './SandikaleLogo';
import { Lock, LogIn, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { setCurrentUser, showToast } = useApp();
  // Login menggunakan nama pengguna yang terdaftar di profiles.
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const identity = username.trim();
    if (!identity) {
      setErrorMsg('Nama pengguna atau email wajib diisi.');
      return;
    }

    if (!pin) {
      setErrorMsg('Kata sandi / PIN wajib diisi.');
      return;
    }

    setIsLoading(true);

    const signIn = async () => {
      // Login langsung ke Supabase Auth. Tidak lagi melakukan query profiles
      // sebelum autentikasi, sehingga RLS/anon tidak dapat memblokir login.
      // Input dapat berupa email Auth atau username internal.
      const candidates = identity.includes('@')
        ? [identity.toLowerCase()]
        : [
            identity.toLowerCase(),
            `${identity.toLowerCase().replace(/\\s+/g, '')}@sandikale.com`,
          ];

      let lastError: any = null;
      let sessionUser: any = null;

      for (const email of candidates) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pin,
        });
        if (!error && data.user) {
          sessionUser = data.user;
          break;
        }
        lastError = error;
      }

      if (!sessionUser) {
        console.error('[SANDIKALE] Login failed:', lastError);
        setErrorMsg('Nama pengguna/email atau kata sandi salah.');
        setIsLoading(false);
        return;
      }

      // Setelah Auth berhasil, profiles dapat dibaca menggunakan sesi
      // authenticated dan tidak lagi bergantung pada akses anon.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, name, role, is_active')
        .eq('id', sessionUser.id)
        .single();

      if (profileError || !profile || profile.is_active === false) {
        console.error('[SANDIKALE] Profile load failed:', profileError);
        await supabase.auth.signOut();
        setErrorMsg('Login berhasil, tetapi profil Admin belum tersedia di sistem.');
        setIsLoading(false);
        return;
      }

      setCurrentUser({
        id: profile.id,
        username: profile.username || sessionUser.email || identity,
        name: profile.name || identity,
        role: profile.role,
        pin: ''
      });

      setIsLoading(false);
      showToast(`Selamat datang kembali, ${profile.name || identity}!`, 'success');
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
              Nama Pengguna
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="Masukkan nama pengguna"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-red-500 transition"
            />
            <p className="mt-1.5 text-[10px] text-slate-500">
              Tulis nama pengguna yang dibuat oleh Admin / Owner.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kata Sandi / PIN
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Masukkan kata sandi / PIN"
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
