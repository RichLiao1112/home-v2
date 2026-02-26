'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Image, Search, Upload, X, Folder, Palette, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { apiListUnsplashPhotos, apiSearchMedia, apiSearchUnsplashCollections } from '@/lib/api';
import { normalizeData, type AppData } from '@/types';

const COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#6366F1',
];
const UNSPLASH_PER_PAGE = 24;
type UnsplashQuality = 'thumb' | 'regular' | 'full' | 'raw';

export default function CategoryEditForm() {
  const {
    editingCategory,
    setEditingCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    layout,
    updateLayout,
    categories,
    currentKey,
    saveData,
    replaceData,
  } = useAppStore();
  const isLayoutMode = editingCategory?.id === 'layout-settings' || editingCategory?.title === '__layout__';

  const [formData, setFormData] = useState({
    title: editingCategory?.title || '',
    color: editingCategory?.color ?? COLORS[0],
  });
  const [layoutData, setLayoutData] = useState({
    name: layout.head?.name || 'Home',
    subtitle: layout.head?.subtitle || '',
    siteImage: layout.head?.siteImage || '',
    backgroundImage: layout.head?.backgroundImage || '',
    backgroundBlur: String(layout.head?.backgroundBlur ?? 0),
    unsplashCollectionId: layout.head?.unsplashCollectionId || '',
    desktopColumns: String(layout.head?.desktopColumns ?? 4),
    navOpacity: String(layout.head?.navOpacity ?? 62),
    overlayOpacity: String(layout.head?.overlayOpacity ?? 70),
    categoryOpacity: String(layout.head?.categoryOpacity ?? 5),
    cardOpacity: String(layout.head?.cardOpacity ?? 5),
  });
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaResults, setMediaResults] = useState<Array<{ name: string; url: string }>>([]);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashCollections, setUnsplashCollections] = useState<
    Array<{ id: string; title: string; totalPhotos: number; cover: string }>
  >([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [unsplashPhotos, setUnsplashPhotos] = useState<
    Array<{ id: string; title: string; thumb: string; regular: string; full: string; raw: string; author: string }>
  >([]);
  const [unsplashPage, setUnsplashPage] = useState(1);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashHasMore, setUnsplashHasMore] = useState(false);
  const [unsplashQuality, setUnsplashQuality] = useState<UnsplashQuality>('full');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const savedUnsplashCollectionId = layout.head?.unsplashCollectionId || '';

  useEffect(() => {
    setMediaLoading(true);
    apiSearchMedia(mediaQuery)
      .then(setMediaResults)
      .finally(() => setMediaLoading(false));
  }, [mediaQuery, isLayoutMode]);

  const loadUnsplashCollections = async () => {
    const list = await apiSearchUnsplashCollections(unsplashQuery.trim() || 'wallpaper');
    setUnsplashCollections(list);
    if (list[0]) {
      setSelectedCollectionId(list[0].id);
      setLayoutData(prev => ({ ...prev, unsplashCollectionId: list[0].id }));
      await loadUnsplashPhotos(list[0].id, 1);
    } else {
      setSelectedCollectionId('');
      setUnsplashPhotos([]);
      setUnsplashPage(1);
      setUnsplashHasMore(false);
    }
  };

  const loadUnsplashPhotos = async (collectionId: string, page = 1) => {
    setSelectedCollectionId(collectionId);
    setLayoutData(prev => ({ ...prev, unsplashCollectionId: collectionId }));
    setUnsplashLoading(true);
    try {
      const photos = await apiListUnsplashPhotos(collectionId, page, UNSPLASH_PER_PAGE);
      setUnsplashPhotos(photos);
      setUnsplashPage(page);
      setUnsplashHasMore(photos.length >= UNSPLASH_PER_PAGE);
    } finally {
      setUnsplashLoading(false);
    }
  };

  const loadUnsplashBySavedId = async () => {
    const collectionId = layoutData.unsplashCollectionId.trim();
    if (!collectionId) return;
    await loadUnsplashPhotos(collectionId);
  };

  useEffect(() => {
    if (!isLayoutMode) return;
    const collectionId = savedUnsplashCollectionId.trim();
    if (!collectionId) return;
    loadUnsplashPhotos(collectionId).catch(() => undefined);
  }, [isLayoutMode, savedUnsplashCollectionId]);

  if (!editingCategory) return null;

  const isEditing = !!editingCategory.id && !isLayoutMode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLayoutMode) {
      updateLayout({
        head: {
          ...layout.head,
          name: layoutData.name.trim() || 'Home',
          subtitle: layoutData.subtitle.trim(),
          siteImage: layoutData.siteImage.trim(),
          backgroundImage: layoutData.backgroundImage.trim(),
          backgroundBlur: Math.min(Math.max(Number(layoutData.backgroundBlur || 0), 0), 40),
          unsplashCollectionId: layoutData.unsplashCollectionId.trim(),
          desktopColumns: Math.min(Math.max(Number(layoutData.desktopColumns || 4), 1), 8),
          navOpacity: Number(layoutData.navOpacity || 62),
          overlayOpacity: Number(layoutData.overlayOpacity || 70),
          categoryOpacity: Number(layoutData.categoryOpacity || 5),
          cardOpacity: Number(layoutData.cardOpacity || 5),
        },
      });
      setEditingCategory(null);
      return;
    }
    if (!formData.title.trim()) return;

    if (isEditing) {
      updateCategory(editingCategory.id, formData);
    } else {
      addCategory(formData);
    }
    setEditingCategory(null);
  };

  const handleDelete = () => {
    if (confirm('确定要删除这个分类吗？')) {
      deleteCategory(editingCategory.id);
      setEditingCategory(null);
    }
  };

  const fieldClassName =
    'motion-input-focus w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30';
  const compactNumberClassName =
    'motion-input-focus h-8 w-20 rounded-lg border border-white/15 bg-slate-900/70 px-2 text-right text-sm text-slate-100 outline-none';

  const normalizePercent = (value: string, fallback: number) => {
    const next = Number(value);
    if (Number.isNaN(next)) return String(fallback);
    return String(Math.min(100, Math.max(0, Math.round(next))));
  };
  const normalizeColumns = (value: string, fallback: number) => {
    const next = Number(value);
    if (Number.isNaN(next)) return String(fallback);
    return String(Math.min(8, Math.max(1, Math.round(next))));
  };
  const normalizeBlur = (value: string, fallback: number) => {
    const next = Number(value);
    if (Number.isNaN(next)) return String(fallback);
    return String(Math.min(40, Math.max(0, Math.round(next))));
  };
  const isSelectedBackground = (url: string) => layoutData.backgroundImage.trim() === url.trim();
  const resolveUnsplashUrl = (
    photo: { thumb: string; regular: string; full: string; raw: string },
    quality: UnsplashQuality
  ) => {
    const byQuality: Record<UnsplashQuality, Array<string>> = {
      thumb: [photo.thumb, photo.regular, photo.full, photo.raw],
      regular: [photo.regular, photo.full, photo.raw, photo.thumb],
      full: [photo.full, photo.raw, photo.regular, photo.thumb],
      raw: [photo.raw, photo.full, photo.regular, photo.thumb],
    };
    return byQuality[quality].find(Boolean) || '';
  };

  const extractImportData = (payload: unknown): AppData | null => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const root = payload as Record<string, unknown>;

    // Support exported structure: { version, key, data: AppData }
    if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
      const data = root.data as Record<string, unknown>;
      if (Array.isArray(data.categories)) {
        return normalizeData(data as unknown as AppData);
      }
    }

    // Support direct AppData JSON
    if (Array.isArray(root.categories)) {
      return normalizeData(root as unknown as AppData);
    }

    // Support AppDB-like JSON: { key1: AppData, key2: AppData }
    const fromCurrentKey = root[currentKey];
    if (fromCurrentKey && typeof fromCurrentKey === 'object' && !Array.isArray(fromCurrentKey)) {
      const data = fromCurrentKey as Record<string, unknown>;
      if (Array.isArray(data.categories)) return normalizeData(data as unknown as AppData);
    }

    for (const value of Object.values(root)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const data = value as Record<string, unknown>;
      if (Array.isArray(data.categories)) return normalizeData(data as unknown as AppData);
    }
    return null;
  };

  const handleExport = () => {
    const payload: AppData = {
      layout,
      categories,
      updatedAt: new Date().toISOString(),
    };
    const exportData = {
      version: 'home-v2-export-v1',
      exportedAt: new Date().toISOString(),
      key: currentKey,
      data: payload,
    };
    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `home-v2-${currentKey}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const data = extractImportData(parsed);
      if (!data) {
        window.alert('导入失败：未找到有效配置数据（categories）。');
        return;
      }
      if (!window.confirm(`确认导入 "${file.name}" 到当前配置（${currentKey}）吗？这会覆盖当前内容。`)) {
        return;
      }
      replaceData(data);
      await saveData();
      window.alert('导入成功，已保存到当前配置。');
    } catch {
      window.alert('导入失败：JSON 格式错误或文件不可读。');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl shadow-slate-950/60 backdrop-blur-xl ${
        isLayoutMode ? 'flex h-[min(86vh,860px)] flex-col' : ''
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-4">
        <div className="flex items-center gap-2">
          {isLayoutMode ? (
            <SlidersHorizontal className="h-5 w-5 text-cyan-300" />
          ) : (
            <Folder className="h-5 w-5 text-cyan-300" />
          )}
          <h2 className="text-lg font-semibold text-slate-100">
            {isLayoutMode ? '页面设置' : isEditing ? '编辑分类' : '添加分类'}
          </h2>
        </div>
        <button
          onClick={() => setEditingCategory(null)}
          className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className={isLayoutMode ? 'flex min-h-0 flex-1 flex-col p-6' : 'p-6'}
      >
        <div className={isLayoutMode ? 'scrollbar-hidden min-h-0 flex-1 space-y-4 overflow-y-auto pr-1' : 'space-y-4'}>
          {isLayoutMode ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">站点名称</label>
                <input
                  type="text"
                  value={layoutData.name}
                  onChange={e => setLayoutData({ ...layoutData, name: e.target.value })}
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">副标题</label>
                <input
                  type="text"
                  value={layoutData.subtitle}
                  onChange={e => setLayoutData({ ...layoutData, subtitle: e.target.value })}
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">站点图片 URL</label>
                <input
                  type="text"
                  value={layoutData.siteImage}
                  onChange={e => setLayoutData({ ...layoutData, siteImage: e.target.value })}
                  placeholder="/assets/logo.png"
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">背景图 URL</label>
                <input
                  type="text"
                  value={layoutData.backgroundImage}
                  onChange={e => setLayoutData({ ...layoutData, backgroundImage: e.target.value })}
                  placeholder="/media/your-file.png"
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <label className="mb-1 block text-sm font-medium text-slate-200">配置导入/导出（带校验）</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="motion-btn-hover inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-slate-100 hover:bg-white/15"
                  >
                    <Download className="h-3.5 w-3.5" />
                    导出当前配置
                  </button>
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    className="motion-btn-hover inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-slate-100 hover:bg-white/15"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    导入并覆盖当前配置
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  导入支持三种格式：直接 <code>AppData</code>、<code>{'{ key: AppData }'}</code>、以及系统导出的
                  <code>home-v2-export-v1</code>。
                </p>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={event => {
                    void handleImportSelect(event);
                  }}
                  className="hidden"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-slate-200">背景模糊度</label>
                  <div className="flex items-center gap-1 text-slate-300">
                    <input
                      type="number"
                      min={0}
                      max={40}
                      step={1}
                      value={layoutData.backgroundBlur}
                      onChange={e => setLayoutData({ ...layoutData, backgroundBlur: normalizeBlur(e.target.value, 0) })}
                      className={compactNumberClassName}
                    />
                    <span className="text-xs">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  step={1}
                  min={0}
                  max={40}
                  value={layoutData.backgroundBlur}
                  onChange={e => setLayoutData({ ...layoutData, backgroundBlur: e.target.value })}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-slate-200">PC 每行卡片数</label>
                  <div className="flex items-center gap-1 text-slate-300">
                    <input
                      type="number"
                      min={1}
                      max={8}
                      step={1}
                      value={layoutData.desktopColumns}
                      onChange={e =>
                        setLayoutData({ ...layoutData, desktopColumns: normalizeColumns(e.target.value, 4) })
                      }
                      className={compactNumberClassName}
                    />
                    <span className="text-xs">列</span>
                  </div>
                </div>
                <input
                  type="range"
                  step={1}
                  min={1}
                  max={8}
                  value={layoutData.desktopColumns}
                  onChange={e => setLayoutData({ ...layoutData, desktopColumns: e.target.value })}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-slate-200">导航透明度</label>
                  <div className="flex items-center gap-1 text-slate-300">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={layoutData.navOpacity}
                      onChange={e => setLayoutData({ ...layoutData, navOpacity: normalizePercent(e.target.value, 62) })}
                      className={compactNumberClassName}
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  step={1}
                  min={10}
                  max={100}
                  value={layoutData.navOpacity}
                  onChange={e => setLayoutData({ ...layoutData, navOpacity: e.target.value })}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-slate-200">页面遮罩透明度</label>
                  <div className="flex items-center gap-1 text-slate-300">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={layoutData.overlayOpacity}
                      onChange={e =>
                        setLayoutData({ ...layoutData, overlayOpacity: normalizePercent(e.target.value, 70) })
                      }
                      className={compactNumberClassName}
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  step={1}
                  min={0}
                  max={100}
                  value={layoutData.overlayOpacity}
                  onChange={e => setLayoutData({ ...layoutData, overlayOpacity: e.target.value })}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-slate-200">分类透明度</label>
                  <div className="flex items-center gap-1 text-slate-300">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={layoutData.categoryOpacity}
                      onChange={e =>
                        setLayoutData({ ...layoutData, categoryOpacity: normalizePercent(e.target.value, 5) })
                      }
                      className={compactNumberClassName}
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  step={1}
                  min={0}
                  max={100}
                  value={layoutData.categoryOpacity}
                  onChange={e => setLayoutData({ ...layoutData, categoryOpacity: e.target.value })}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-slate-200">卡片透明度</label>
                  <div className="flex items-center gap-1 text-slate-300">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={layoutData.cardOpacity}
                      onChange={e => setLayoutData({ ...layoutData, cardOpacity: normalizePercent(e.target.value, 5) })}
                      className={compactNumberClassName}
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  step={1}
                  min={0}
                  max={100}
                  value={layoutData.cardOpacity}
                  onChange={e => setLayoutData({ ...layoutData, cardOpacity: e.target.value })}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Image className="h-4 w-4" />
                  Unsplash 集合背景
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={layoutData.unsplashCollectionId}
                    onChange={e => setLayoutData({ ...layoutData, unsplashCollectionId: e.target.value })}
                    placeholder="配置收藏夹 ID，例如 317099"
                    className={fieldClassName}
                  />
                  <button
                    type="button"
                    onClick={loadUnsplashBySavedId}
                    className="motion-btn-hover whitespace-nowrap rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-slate-200 hover:bg-white/15"
                  >
                    加载ID
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={unsplashQuery}
                    onChange={e => setUnsplashQuery(e.target.value)}
                    placeholder="例如 dark abstract, cyberpunk"
                    className={fieldClassName}
                  />
                  <button
                    type="button"
                    onClick={loadUnsplashCollections}
                    className="motion-btn-hover whitespace-nowrap rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-slate-200 hover:bg-white/15"
                  >
                    搜索
                  </button>
                </div>
                <div className="min-h-[42px]">
                  {unsplashCollections.length > 0 ? (
                    <select
                      value={selectedCollectionId}
                      onChange={e => loadUnsplashPhotos(e.target.value, 1)}
                      className={fieldClassName}
                    >
                      {unsplashCollections.map(item => (
                        <option
                          key={item.id}
                          value={item.id}
                          className="bg-slate-900 text-slate-100"
                        >
                          {item.title} ({item.totalPhotos})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex h-[42px] items-center rounded-xl border border-white/10 bg-slate-900/40 px-3 text-xs text-slate-500">
                      暂无可选集合，先搜索或输入收藏夹 ID。
                    </div>
                  )}
                </div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>第 {unsplashPage} 页</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!selectedCollectionId || unsplashPage <= 1 || unsplashLoading}
                      onClick={() => loadUnsplashPhotos(selectedCollectionId, Math.max(1, unsplashPage - 1))}
                      className="motion-btn-hover rounded-md border border-white/15 bg-white/5 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCollectionId || !unsplashHasMore || unsplashLoading}
                      onClick={() => loadUnsplashPhotos(selectedCollectionId, unsplashPage + 1)}
                      className="motion-btn-hover rounded-md border border-white/15 bg-white/5 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      下一页
                    </button>
                  </div>
                </div>
                <div className="mb-2 flex items-center justify-end gap-2">
                  <label className="text-xs text-slate-400">背景图清晰度</label>
                  <select
                    value={unsplashQuality}
                    onChange={e => setUnsplashQuality(e.target.value as UnsplashQuality)}
                    className="motion-input-focus h-8 rounded-lg border border-white/15 bg-slate-900/70 px-2 text-xs text-slate-100 outline-none"
                  >
                    <option value="thumb" className="bg-slate-900 text-slate-100">
                      thumb（低）
                    </option>
                    <option value="regular" className="bg-slate-900 text-slate-100">
                      regular（中）
                    </option>
                    <option value="full" className="bg-slate-900 text-slate-100">
                      full（高，默认）
                    </option>
                    <option value="raw" className="bg-slate-900 text-slate-100">
                      raw（最高）
                    </option>
                  </select>
                </div>
                <div className="scrollbar-hidden grid max-h-44 min-h-44 grid-cols-4 gap-2 overflow-y-auto">
                  {unsplashLoading ? (
                    <div className="col-span-4 flex items-center justify-center text-xs text-slate-500">加载中...</div>
                  ) : unsplashPhotos.length > 0 ? (
                    unsplashPhotos.map(photo =>
                      (() => {
                        const selectedTarget = resolveUnsplashUrl(photo, unsplashQuality);
                        const selected = isSelectedBackground(selectedTarget);
                        return (
                          <button
                            type="button"
                            key={photo.id}
                            onClick={() =>
                              setLayoutData({
                                ...layoutData,
                                backgroundImage: resolveUnsplashUrl(photo, unsplashQuality),
                              })
                            }
                            className={`motion-btn-hover relative overflow-hidden rounded-lg border bg-slate-900/70 ${
                              selected
                                ? 'border-cyan-300/80 ring-2 ring-cyan-300/60 shadow-[0_0_0_1px_rgba(34,211,238,0.4)]'
                                : 'border-white/15'
                            }`}
                            title={
                              photo.author
                                ? `${photo.title || 'Unsplash'} · ${photo.author}`
                                : photo.title || 'Unsplash'
                            }
                          >
                            <img
                              src={photo.thumb}
                              alt={photo.title || 'unsplash'}
                              className="h-14 w-full object-contain"
                            />
                            {selected ? (
                              <span className="absolute right-1.5 top-1.5 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900">
                                已选
                              </span>
                            ) : null}
                          </button>
                        );
                      })(),
                    )
                  ) : (
                    <div className="col-span-4 flex items-center justify-center text-xs text-slate-500">
                      暂无图片，搜索集合或加载指定 ID 后会显示在这里。
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">需要在容器环境变量中配置 `UNSPLASH_ACCESS_KEY`。</p>
              </div>
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <label className="mb-1 block text-sm font-medium text-slate-200">搜索已上传图片（背景）</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={mediaQuery}
                      onChange={e => setMediaQuery(e.target.value)}
                      placeholder="输入文件名关键词，例如 png / wallpaper"
                      className={`${fieldClassName} pl-9`}
                    />
                  </div>
                </div>
                <div className="scrollbar-hidden grid max-h-40 min-h-40 grid-cols-4 gap-2 overflow-y-auto">
                  {mediaLoading ? (
                    <p className="col-span-4 flex items-center justify-center text-xs text-slate-400">搜索中...</p>
                  ) : mediaResults.length === 0 ? (
                    <p className="col-span-4 flex items-center justify-center text-xs text-slate-400">暂无匹配图片</p>
                  ) : (
                    mediaResults.map(item =>
                      (() => {
                        const selected = isSelectedBackground(item.url);
                        return (
                          <button
                            type="button"
                            key={item.url}
                            onClick={() => setLayoutData({ ...layoutData, backgroundImage: item.url })}
                            className={`motion-btn-hover group relative flex flex-col items-center gap-2 rounded-xl border bg-slate-900/70 p-2 text-left ${
                              selected
                                ? 'border-cyan-300/80 ring-2 ring-cyan-300/60 shadow-[0_0_0_1px_rgba(34,211,238,0.4)]'
                                : 'border-white/15'
                            }`}
                            title={item.name}
                          >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/80 ring-1 ring-white/10">
                              <img
                                src={item.url}
                                alt={item.name}
                                className="h-7 w-7 rounded object-contain"
                              />
                            </div>
                            <div className="w-full truncate text-center text-[10px] text-slate-300">{item.name}</div>
                            {selected ? (
                              <span className="absolute right-1.5 top-1.5 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900">
                                已选
                              </span>
                            ) : null}
                          </button>
                        );
                      })(),
                    )
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">分类名称</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：工作、娱乐、工具"
                  className={fieldClassName}
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-1 text-sm font-medium text-slate-200">
                  <Palette className="h-4 w-4" />
                  颜色
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, color: '' })}
                  className={`motion-btn-hover mb-2 inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs ${
                    formData.color === ''
                      ? 'border-cyan-300/60 bg-cyan-500/15 text-cyan-100'
                      : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  使用毛玻璃（无底色）
                </button>
                <div className="grid grid-cols-5 gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`h-10 w-10 rounded-xl border border-white/20 transition-all duration-200 ${
                        formData.color === color
                          ? 'scale-110 ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-900'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div
          className={`flex gap-3 pt-4 ${isLayoutMode ? 'mt-4 shrink-0 border-t border-white/10 bg-slate-900/80' : ''}`}
        >
          {isEditing && !isLayoutMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="motion-btn-hover whitespace-nowrap rounded-xl px-4 py-2 text-slate-300 transition-colors hover:bg-rose-500/15 hover:text-rose-200"
            >
              删除
            </button>
          )}
          <div className="flex-1"></div>
          <button
            type="button"
            onClick={() => setEditingCategory(null)}
            className="motion-btn-hover whitespace-nowrap rounded-xl px-4 py-2 text-slate-200 transition-colors hover:bg-white/10"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isLayoutMode ? !layoutData.name.trim() : !formData.title.trim()}
            className="motion-btn-hover whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2 text-white hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
}
