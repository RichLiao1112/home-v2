'use client';

import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { LayoutPanelTop, LogOut, Sparkles } from 'lucide-react';

export default function Header() {
  const { logout } = useAuthStore();
  const { setEditingCategory, categories, layout } = useAppStore();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-900/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">{layout.head?.name || 'Home V2'}</h1>
            <p className="text-xs text-slate-400">
              {layout.head?.subtitle || '现代化导航控制台'} · {categories.length} 个分类
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setEditingCategory({
                id: 'layout-settings',
                title: '__layout__',
                color: '#3B82F6',
                cards: [],
              })
            }
            className="inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label="打开页面设置"
          >
            <LayoutPanelTop className="h-4 w-4" />
          </button>
          <button
            onClick={() => logout()}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-slate-200 transition hover:border-rose-300/30 hover:bg-rose-500/15 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">退出</span>
          </button>
        </div>
      </div>
    </header>
  );
}
