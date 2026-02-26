'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { KeyRound, LayoutPanelTop, LogOut, Plus, Sparkles, Trash2 } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { setEditingCategory, categories, layout, currentKey, configKeys, loadData, createConfigKey, deleteConfigKey } =
    useAppStore();
  const [isScrolled, setIsScrolled] = useState(false);

  const updateUrlKey = useCallback((key: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('key', key);
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [router]);

  const handleSelectKey = (key: string) => {
    if (!key || key === currentKey) return;
    updateUrlKey(key);
    void loadData(key);
  };

  const handleCreateKey = async () => {
    const value = window.prompt('输入新的配置 key（例如 office / home / demo）');
    if (!value) return;
    await createConfigKey(value);
  };

  const handleDeleteKey = async () => {
    if (!window.confirm(`确认删除配置 "${currentKey}" 吗？`)) return;
    await deleteConfigKey(currentKey);
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!currentKey) return;
    if (typeof window === 'undefined') return;
    const currentKeyInUrl = new URLSearchParams(window.location.search).get('key')?.trim();
    if (currentKeyInUrl === currentKey) return;
    updateUrlKey(currentKey);
  }, [currentKey, updateUrlKey]);

  const navOpacityFromConfig = Math.min(Math.max(layout.head?.navOpacity ?? 62, 10), 100);
  const baseOpacity = navOpacityFromConfig / 100;
  const navOpacity = Math.min(baseOpacity + (isScrolled ? 0.12 : 0), 0.9);
  const headerStyle: CSSProperties = {
    backgroundColor: `rgba(2, 6, 23, ${navOpacity.toFixed(2)})`,
    borderColor: isScrolled ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.12)',
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-all duration-200 ${
        isScrolled ? 'shadow-xl shadow-slate-950/35' : 'shadow-lg shadow-slate-950/20'
      }`}
      style={headerStyle}
    >
      <div
        className={`mx-auto w-full max-w-[1720px] px-4 sm:px-6 lg:px-8 ${isScrolled ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-900/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">
                {layout.head?.name || 'Home'}
              </h1>
              <p className="hidden truncate text-xs text-slate-400 sm:block">
                {layout.head?.subtitle || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() =>
                setEditingCategory({
                  id: 'layout-settings',
                  title: '__layout__',
                  color: '#3B82F6',
                  cards: [],
                })
              }
              className="motion-btn-hover inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200"
              aria-label="打开页面设置"
            >
              <LayoutPanelTop className="h-4 w-4" />
            </button>
            <button
              onClick={() => logout()}
              className="motion-btn-hover inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200"
              aria-label="退出"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2 py-1.5">
              <KeyRound className="h-4 w-4 text-slate-300" />
              <select
                value={currentKey}
                onChange={event => handleSelectKey(event.target.value)}
                className="motion-input-focus w-24 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs text-slate-200 outline-none sm:w-auto"
                aria-label="切换配置 key"
              >
                {configKeys.map(key => (
                  <option
                    key={key}
                    value={key}
                    className="bg-slate-900 text-slate-100"
                  >
                    {key}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateKey}
                className="motion-btn-hover inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-200 hover:bg-white/15"
                aria-label="新增配置 key"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDeleteKey}
                disabled={configKeys.length <= 1}
                className="motion-btn-hover inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-300 hover:bg-rose-500/15 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="删除当前配置 key"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() =>
                setEditingCategory({
                  id: 'layout-settings',
                  title: '__layout__',
                  color: '#3B82F6',
                  cards: [],
                })
              }
              className="motion-btn-hover inline-flex h-10 min-w-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="打开页面设置"
            >
              <LayoutPanelTop className="h-4 w-4" />
            </button>
            <button
              onClick={() => logout()}
              className="motion-btn-hover inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-slate-200 transition hover:border-rose-300/30 hover:bg-rose-500/15 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <LogOut className="h-4 w-4" />
              <span>退出</span>
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 sm:hidden">
          <div className="relative flex-1">
            <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <select
              value={currentKey}
              onChange={event => handleSelectKey(event.target.value)}
              className="motion-input-focus h-9 w-full rounded-xl border border-white/15 bg-white/5 pl-7 pr-2 text-xs text-slate-200 outline-none"
              aria-label="切换配置 key（移动端）"
            >
              {configKeys.map(key => (
                <option
                  key={key}
                  value={key}
                  className="bg-slate-900 text-slate-100"
                >
                  {key}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreateKey}
            className="motion-btn-hover inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200"
            aria-label="新增配置 key"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={handleDeleteKey}
            disabled={configKeys.length <= 1}
            className="motion-btn-hover inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="删除当前配置 key"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
