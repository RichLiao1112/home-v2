'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Home, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [site, setSite] = useState({
    name: 'Home',
    subtitle: '容器密码登录，关闭浏览器自动退出',
    siteImage: '',
    backgroundImage: '',
    overlayOpacity: 70,
    backgroundBlur: 0,
  });
  const { login } = useAuthStore();

  useEffect(() => {
    const keyFromUrl =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('key')?.trim() : '';
    const keyFromStorage =
      (typeof window !== 'undefined' && window.localStorage.getItem('home-v2-current-key')) || 'default';
    const key = keyFromUrl || keyFromStorage || 'default';
    fetch(`/api/public/site?key=${encodeURIComponent(key)}`, { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) return null;
        const json = (await res.json()) as {
          site?: {
            name?: string;
            subtitle?: string;
            siteImage?: string;
            backgroundImage?: string;
            overlayOpacity?: number;
            backgroundBlur?: number;
          };
        };
        return json.site || null;
      })
      .then(nextSite => {
        if (!nextSite) return;
        setSite({
          name: nextSite.name || 'Home',
          subtitle: nextSite.subtitle || '容器密码登录，关闭浏览器自动退出',
          siteImage: nextSite.siteImage || '',
          backgroundImage: nextSite.backgroundImage || '',
          overlayOpacity: nextSite.overlayOpacity ?? 70,
          backgroundBlur: nextSite.backgroundBlur ?? 0,
        });
      })
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    const success = await login(password);
    setPending(false);
    if (!success) {
      setError('密码错误，请重试');
    }
  };

  const bgStyle: CSSProperties = site.backgroundImage
    ? {
        backgroundImage: `url(${site.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {};

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10">
      <div
        className="absolute inset-0 -z-10"
        style={bgStyle}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundColor: `rgba(2, 6, 23, ${Math.min(Math.max(site.overlayOpacity, 0), 100) / 100})`,
          backdropFilter: `blur(${site.backgroundBlur}px)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-8 text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
                site.siteImage
                  ? 'bg-transparent'
                  : 'bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-900/30'
              }`}
            >
              {site.siteImage ? (
                <img
                  src={site.siteImage}
                  alt="站点图片"
                  className="h-14 w-14 rounded object-contain"
                />
              ) : (
                <Home className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white">{site.name}</h1>
            <p className="flex items-center justify-center gap-2 text-slate-200">
              <ShieldCheck className="h-4 w-4" />
              {site.subtitle || '容器密码登录，关闭浏览器自动退出'}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-100"
              >
                访问密码
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pl-12 pr-4 text-base text-white placeholder:text-slate-400 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/20 p-3 text-sm text-red-100">{error}</div>
            )}

            <button
              type="submit"
              disabled={pending || !password.trim()}
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3.5 font-semibold text-white transition-all duration-200 hover:from-indigo-400 hover:to-cyan-400 hover:shadow-lg hover:shadow-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? '登录中...' : '进入系统'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
