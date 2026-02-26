'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import {
  apiCreateSnapshot,
  apiDeleteSnapshot,
  apiListSnapshots,
  apiRestoreSnapshot,
  type SnapshotMeta,
} from '@/lib/api';
import {
  ArchiveRestore,
  History,
  KeyRound,
  LayoutPanelTop,
  Loader2,
  LogOut,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';

export default function Header() {
  type RecycleTimeFilter = 'all' | 'today' | '7d' | '30d' | 'older30d';
  const OPEN_SEARCH_EVENT = 'home-v2:open-search';
  const SCROLL_ENTER_Y = 40;
  const SCROLL_EXIT_Y = 16;
  const router = useRouter();
  const { logout } = useAuthStore();
  const {
    setEditingCategory,
    layout,
    currentKey,
    configKeys,
    loadData,
    createConfigKey,
    deleteConfigKey,
    recycleBin,
    restoreDeletedCategory,
    restoreDeletedCard,
    removeDeletedCategory,
    removeDeletedCard,
    clearRecycleBin,
  } = useAppStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [recycleSearch, setRecycleSearch] = useState('');
  const [recycleTimeFilter, setRecycleTimeFilter] = useState<RecycleTimeFilter>('all');
  const [canUsePortal, setCanUsePortal] = useState(false);

  const formatBeijingTime = (value: string | number | Date) =>
    new Date(value).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false,
    });

  const loadSnapshots = useCallback(async () => {
    setSnapshotLoading(true);
    const list = await apiListSnapshots(currentKey);
    setSnapshots(list);
    setSnapshotLoading(false);
  }, [currentKey]);

  const updateUrlKey = useCallback(
    (key: string) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      url.searchParams.set('key', key);
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    },
    [router],
  );

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

  const openGlobalSearch = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
  };

  const openRecycleDialog = () => {
    setRecycleOpen(true);
  };

  useEffect(() => {
    setCanUsePortal(true);
  }, []);

  useEffect(() => {
    let rafId = 0;
    const updateScrolledState = () => {
      rafId = 0;
      const y = window.scrollY;
      setIsScrolled(prev => (prev ? y > SCROLL_EXIT_Y : y > SCROLL_ENTER_Y));
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateScrolledState);
    };

    updateScrolledState();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!currentKey) return;
    if (typeof window === 'undefined') return;
    const currentKeyInUrl = new URLSearchParams(window.location.search).get('key')?.trim();
    if (currentKeyInUrl === currentKey) return;
    updateUrlKey(currentKey);
  }, [currentKey, updateUrlKey]);

  const openSnapshotDialog = () => {
    setSnapshotOpen(true);
    void loadSnapshots();
  };

  const handleCreateSnapshot = async () => {
    const nowText = formatBeijingTime(new Date());
    const note = window.prompt('快照备注（可选）', `手动快照 ${nowText}`);
    if (note === null) return;
    setSnapshotBusy(true);
    await apiCreateSnapshot(currentKey, note.trim() || undefined);
    await loadSnapshots();
    setSnapshotBusy(false);
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!window.confirm('确认回滚到该快照吗？当前配置会被覆盖。')) return;
    setSnapshotBusy(true);
    const success = await apiRestoreSnapshot(currentKey, snapshotId);
    if (success) {
      await loadData(currentKey);
      await loadSnapshots();
    } else {
      window.alert('回滚失败，请稍后重试');
    }
    setSnapshotBusy(false);
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!window.confirm('确认删除该快照吗？')) return;
    setSnapshotBusy(true);
    const success = await apiDeleteSnapshot(currentKey, snapshotId);
    if (success) {
      await loadSnapshots();
    } else {
      window.alert('删除失败，请稍后重试');
    }
    setSnapshotBusy(false);
  };

  const formatSnapshotReason = (reason: SnapshotMeta['reason']) => {
    if (reason === 'manual') return '手动创建';
    if (reason === 'before_restore') return '回滚前自动备份';
    if (reason === 'before_import') return '导入前自动备份';
    return '自动快照';
  };

  const navOpacityFromConfig = Math.min(Math.max(layout.head?.navOpacity ?? 62, 10), 100);
  const baseOpacity = navOpacityFromConfig / 100;
  const navOpacity = Math.min(baseOpacity + (isScrolled ? 0.12 : 0), 0.9);
  const headerStyle: CSSProperties = {
    backgroundColor: `rgba(2, 6, 23, ${navOpacity.toFixed(2)})`,
    borderColor: isScrolled ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.12)',
  };

  const snapshotDialog =
    snapshotOpen && canUsePortal
      ? createPortal(
          <div className="fixed inset-0 z-[130] overflow-y-auto p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-slate-950/75"
              onClick={() => !snapshotBusy && setSnapshotOpen(false)}
            />
            <div className="relative mx-auto mt-16 w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl sm:mt-20">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">配置快照</h3>
                  <p className="text-xs text-slate-400">当前配置：{currentKey}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateSnapshot}
                    disabled={snapshotBusy}
                    className="motion-btn-hover rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-100 disabled:opacity-50"
                  >
                    {snapshotBusy ? '处理中...' : '立即创建快照'}
                  </button>
                  <button
                    onClick={() => setSnapshotOpen(false)}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                  >
                    关闭
                  </button>
                </div>
              </div>
              <div className="scrollbar-hidden max-h-[min(56vh,520px)] overflow-y-auto rounded-xl border border-white/10 bg-slate-900/50">
                {snapshotLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">正在加载快照...</span>
                  </div>
                ) : snapshots.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">还没有快照，先创建一个吧。</div>
                ) : (
                  snapshots.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-slate-100">
                          {formatBeijingTime(item.createdAt)}
                        </div>
                        <div className="truncate text-xs text-slate-400">
                          {formatSnapshotReason(item.reason)}
                          {item.note ? ` · ${item.note}` : ''}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => void handleRestoreSnapshot(item.id)}
                          disabled={snapshotBusy}
                          className="motion-btn-hover rounded-md border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-1 text-xs text-cyan-100 disabled:opacity-50"
                        >
                          恢复到此版本
                        </button>
                        <button
                          onClick={() => void handleDeleteSnapshot(item.id)}
                          disabled={snapshotBusy}
                          className="motion-btn-hover rounded-md border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-200 disabled:opacity-50"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const recycleDialog =
    recycleOpen && canUsePortal
      ? createPortal(
          <div className="fixed inset-0 z-[130] overflow-y-auto p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/75" onClick={() => setRecycleOpen(false)} />
            <div className="relative mx-auto mt-16 w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl sm:mt-20">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">回收站</h3>
                  <p className="text-xs text-slate-400">支持恢复或永久删除（当前配置：{currentKey}）</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!window.confirm('确认清空回收站吗？该操作不可恢复。')) return;
                      clearRecycleBin();
                    }}
                    disabled={recycleBin.categories.length + recycleBin.cards.length === 0}
                    className="motion-btn-hover rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 disabled:opacity-40"
                  >
                    清空
                  </button>
                  <button
                    onClick={() => setRecycleOpen(false)}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                  >
                    关闭
                  </button>
                </div>
              </div>
              <div className="scrollbar-hidden max-h-[min(60vh,560px)] space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/50 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,140px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={recycleSearch}
                      onChange={event => setRecycleSearch(event.target.value)}
                      placeholder="搜索分类或卡片名称"
                      className="motion-input-focus h-9 w-full rounded-xl border border-white/15 bg-white/5 pl-8 pr-3 text-xs text-slate-200 outline-none"
                    />
                  </div>
                  <select
                    value={recycleTimeFilter}
                    onChange={event => setRecycleTimeFilter(event.target.value as RecycleTimeFilter)}
                    className="motion-input-focus h-9 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-xs text-slate-200 outline-none"
                  >
                    <option value="all" className="bg-slate-900 text-slate-100">
                      全部时间
                    </option>
                    <option value="today" className="bg-slate-900 text-slate-100">
                      最近 24 小时
                    </option>
                    <option value="7d" className="bg-slate-900 text-slate-100">
                      最近 7 天
                    </option>
                    <option value="30d" className="bg-slate-900 text-slate-100">
                      最近 30 天
                    </option>
                    <option value="older30d" className="bg-slate-900 text-slate-100">
                      30 天前
                    </option>
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-xs text-slate-400">
                    已删除分类（{
                      recycleBin.categories.filter(item => {
                        const now = Date.now();
                        const diffDays = (now - Date.parse(item.deletedAt || '')) / (1000 * 60 * 60 * 24);
                        const matchTime =
                          recycleTimeFilter === 'all'
                            ? true
                            : recycleTimeFilter === 'today'
                              ? diffDays <= 1
                              : recycleTimeFilter === '7d'
                                ? diffDays <= 7
                                : recycleTimeFilter === '30d'
                                  ? diffDays <= 30
                                  : diffDays > 30;
                        const kw = recycleSearch.trim().toLowerCase();
                        const matchSearch = !kw || item.data.title.toLowerCase().includes(kw);
                        return matchTime && matchSearch;
                      }).length
                    }）
                  </div>
                  <div className="space-y-2">
                    {recycleBin.categories.filter(item => {
                      const now = Date.now();
                      const diffDays = (now - Date.parse(item.deletedAt || '')) / (1000 * 60 * 60 * 24);
                      const matchTime =
                        recycleTimeFilter === 'all'
                          ? true
                          : recycleTimeFilter === 'today'
                            ? diffDays <= 1
                            : recycleTimeFilter === '7d'
                              ? diffDays <= 7
                              : recycleTimeFilter === '30d'
                                ? diffDays <= 30
                                : diffDays > 30;
                      const kw = recycleSearch.trim().toLowerCase();
                      const matchSearch = !kw || item.data.title.toLowerCase().includes(kw);
                      return matchTime && matchSearch;
                    }).length === 0 ? (
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-500">
                        没有匹配的已删除分类
                      </div>
                    ) : (
                      recycleBin.categories
                        .filter(item => {
                          const now = Date.now();
                          const diffDays = (now - Date.parse(item.deletedAt || '')) / (1000 * 60 * 60 * 24);
                          const matchTime =
                            recycleTimeFilter === 'all'
                              ? true
                              : recycleTimeFilter === 'today'
                                ? diffDays <= 1
                                : recycleTimeFilter === '7d'
                                  ? diffDays <= 7
                                  : recycleTimeFilter === '30d'
                                    ? diffDays <= 30
                                    : diffDays > 30;
                          const kw = recycleSearch.trim().toLowerCase();
                          const matchSearch = !kw || item.data.title.toLowerCase().includes(kw);
                          return matchTime && matchSearch;
                        })
                        .map(item => (
                        <div
                          key={item.recycleId}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm text-slate-100">{item.data.title}</div>
                            <div className="truncate text-xs text-slate-400">
                              {new Date(item.deletedAt).toLocaleString()} · {item.data.cards.length} 张卡片
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => restoreDeletedCategory(item.recycleId)}
                              className="motion-btn-hover rounded-md border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-1 text-xs text-cyan-100"
                            >
                              恢复
                            </button>
                            <button
                              onClick={() => removeDeletedCategory(item.recycleId)}
                              className="motion-btn-hover rounded-md border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-200"
                            >
                              永久删除
                            </button>
                          </div>
                        </div>
                        ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs text-slate-400">
                    已删除卡片（{
                      recycleBin.cards.filter(item => {
                        const now = Date.now();
                        const diffDays = (now - Date.parse(item.deletedAt || '')) / (1000 * 60 * 60 * 24);
                        const matchTime =
                          recycleTimeFilter === 'all'
                            ? true
                            : recycleTimeFilter === 'today'
                              ? diffDays <= 1
                              : recycleTimeFilter === '7d'
                                ? diffDays <= 7
                                : recycleTimeFilter === '30d'
                                  ? diffDays <= 30
                                  : diffDays > 30;
                        const kw = recycleSearch.trim().toLowerCase();
                        const matchSearch =
                          !kw ||
                          item.data.title.toLowerCase().includes(kw) ||
                          item.sourceCategoryTitle.toLowerCase().includes(kw);
                        return matchTime && matchSearch;
                      }).length
                    }）
                  </div>
                  <div className="space-y-2">
                    {recycleBin.cards.filter(item => {
                      const now = Date.now();
                      const diffDays = (now - Date.parse(item.deletedAt || '')) / (1000 * 60 * 60 * 24);
                      const matchTime =
                        recycleTimeFilter === 'all'
                          ? true
                          : recycleTimeFilter === 'today'
                            ? diffDays <= 1
                            : recycleTimeFilter === '7d'
                              ? diffDays <= 7
                              : recycleTimeFilter === '30d'
                                ? diffDays <= 30
                                : diffDays > 30;
                      const kw = recycleSearch.trim().toLowerCase();
                      const matchSearch =
                        !kw || item.data.title.toLowerCase().includes(kw) || item.sourceCategoryTitle.toLowerCase().includes(kw);
                      return matchTime && matchSearch;
                    }).length === 0 ? (
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-500">
                        没有匹配的已删除卡片
                      </div>
                    ) : (
                      recycleBin.cards
                        .filter(item => {
                          const now = Date.now();
                          const diffDays = (now - Date.parse(item.deletedAt || '')) / (1000 * 60 * 60 * 24);
                          const matchTime =
                            recycleTimeFilter === 'all'
                              ? true
                              : recycleTimeFilter === 'today'
                                ? diffDays <= 1
                                : recycleTimeFilter === '7d'
                                  ? diffDays <= 7
                                  : recycleTimeFilter === '30d'
                                    ? diffDays <= 30
                                    : diffDays > 30;
                          const kw = recycleSearch.trim().toLowerCase();
                          const matchSearch =
                            !kw ||
                            item.data.title.toLowerCase().includes(kw) ||
                            item.sourceCategoryTitle.toLowerCase().includes(kw);
                          return matchTime && matchSearch;
                        })
                        .map(item => (
                        <div
                          key={item.recycleId}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm text-slate-100">{item.data.title}</div>
                            <div className="truncate text-xs text-slate-400">
                              {item.sourceCategoryTitle || '未知分类'} · {new Date(item.deletedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => restoreDeletedCard(item.recycleId)}
                              className="motion-btn-hover rounded-md border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-1 text-xs text-cyan-100"
                            >
                              恢复
                            </button>
                            <button
                              onClick={() => removeDeletedCard(item.recycleId)}
                              className="motion-btn-hover rounded-md border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-200"
                            >
                              永久删除
                            </button>
                          </div>
                        </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ease-out ${
        isScrolled ? 'shadow-xl shadow-slate-950/35' : 'shadow-lg shadow-slate-950/20'
      }`}
      style={headerStyle}
    >
      <div className="mx-auto w-full max-w-[1720px] px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                layout.head?.siteImage
                  ? 'bg-transparent'
                  : 'bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-900/30'
              }`}
            >
              {layout.head?.siteImage ? (
                <img
                  src={layout.head.siteImage}
                  alt="站点图片"
                  className="h-8 w-8 rounded object-contain"
                />
              ) : (
                <Sparkles className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">
                {layout.head?.name || 'Home'}
              </h1>
              <p className="hidden truncate text-xs text-slate-400 sm:block">{layout.head?.subtitle || ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={openGlobalSearch}
              className="motion-btn-hover inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200"
              aria-label="打开全局搜索"
            >
              <Search className="h-4 w-4" />
            </button>
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
            <button
              onClick={openRecycleDialog}
              className="motion-btn-hover inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200"
              aria-label="打开回收站"
            >
              <ArchiveRestore className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={openGlobalSearch}
              className="motion-btn-hover inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-slate-200 transition hover:bg-white/10"
            >
              <Search className="h-4 w-4" />
              <span>搜索</span>
              <span className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                Ctrl+K
              </span>
            </button>
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
            <button
              onClick={openSnapshotDialog}
              className="motion-btn-hover inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-slate-200 transition hover:bg-white/10"
            >
              <History className="h-4 w-4" />
              <span>快照</span>
            </button>
            <button
              onClick={openRecycleDialog}
              className="motion-btn-hover inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-slate-200 transition hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              <span>回收站</span>
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
          <button
            onClick={openSnapshotDialog}
            className="motion-btn-hover inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200"
            aria-label="打开快照列表"
          >
            <History className="h-4 w-4" />
          </button>
          <button
            onClick={openRecycleDialog}
            className="motion-btn-hover inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200"
            aria-label="打开回收站"
          >
            <ArchiveRestore className="h-4 w-4" />
          </button>
        </div>
      </div>
      {snapshotDialog}
      {recycleDialog}
    </header>
  );
}
