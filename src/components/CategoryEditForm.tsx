'use client';

import { useEffect, useState } from 'react';
import { Image, Search, X, Folder, Palette, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { apiListUnsplashPhotos, apiSearchMedia, apiSearchUnsplashCollections } from '@/lib/api';

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

export default function CategoryEditForm() {
  const { editingCategory, setEditingCategory, addCategory, updateCategory, deleteCategory, layout, updateLayout } =
    useAppStore();
  const isLayoutMode = editingCategory?.id === 'layout-settings' || editingCategory?.title === '__layout__';

  const [formData, setFormData] = useState({
    title: editingCategory?.title || '',
    color: editingCategory?.color || COLORS[0],
  });
  const [layoutData, setLayoutData] = useState({
    name: layout.head?.name || 'Home',
    subtitle: layout.head?.subtitle || '',
    backgroundImage: layout.head?.backgroundImage || '',
    unsplashCollectionId: layout.head?.unsplashCollectionId || '',
    navOpacity: String(layout.head?.navOpacity ?? 62),
    overlayOpacity: String(layout.head?.overlayOpacity ?? 70),
    categoryOpacity: String(layout.head?.categoryOpacity ?? 5),
    cardOpacity: String(layout.head?.cardOpacity ?? 5),
  });
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaResults, setMediaResults] = useState<Array<{ name: string; url: string }>>([]);
  const [unsplashQuery, setUnsplashQuery] = useState('dark abstract');
  const [unsplashCollections, setUnsplashCollections] = useState<
    Array<{ id: string; title: string; totalPhotos: number; cover: string }>
  >([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [unsplashPhotos, setUnsplashPhotos] = useState<
    Array<{ id: string; title: string; thumb: string; regular: string; author: string }>
  >([]);
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
      const photos = await apiListUnsplashPhotos(list[0].id);
      setUnsplashPhotos(photos);
    } else {
      setSelectedCollectionId('');
      setUnsplashPhotos([]);
    }
  };

  const loadUnsplashPhotos = async (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setLayoutData(prev => ({ ...prev, unsplashCollectionId: collectionId }));
    const photos = await apiListUnsplashPhotos(collectionId);
    setUnsplashPhotos(photos);
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
          backgroundImage: layoutData.backgroundImage.trim(),
          unsplashCollectionId: layoutData.unsplashCollectionId.trim(),
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

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl shadow-slate-950/60 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-4">
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
        className="p-6 space-y-4"
      >
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
              <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto">
                {mediaLoading ? (
                  <p className="col-span-4 text-xs text-slate-400">搜索中...</p>
                ) : mediaResults.length === 0 ? (
                  <p className="col-span-4 text-xs text-slate-400">暂无匹配图片</p>
                ) : (
                  mediaResults.map(item => (
                    <button
                      type="button"
                      key={item.url}
                      onClick={() => setLayoutData({ ...layoutData, backgroundImage: item.url })}
                      className="motion-btn-hover group overflow-hidden rounded-lg border border-white/15 bg-slate-900/70 text-left"
                      title={item.name}
                    >
                      <img src={item.url} alt={item.name} className="h-14 w-full object-cover" />
                      <div className="truncate px-2 py-1 text-[10px] text-slate-300">{item.name}</div>
                    </button>
                  ))
                )}
              </div>
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
              {unsplashCollections.length > 0 && (
                <select
                  value={selectedCollectionId}
                  onChange={e => loadUnsplashPhotos(e.target.value)}
                  className={fieldClassName}
                >
                  {unsplashCollections.map(item => (
                    <option key={item.id} value={item.id} className="bg-slate-900 text-slate-100">
                      {item.title} ({item.totalPhotos})
                    </option>
                  ))}
                </select>
              )}
              <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto">
                {unsplashPhotos.map(photo => (
                  <button
                    type="button"
                    key={photo.id}
                    onClick={() => setLayoutData({ ...layoutData, backgroundImage: photo.regular })}
                    className="motion-btn-hover overflow-hidden rounded-lg border border-white/15 bg-slate-900/70"
                    title={photo.author ? `${photo.title || 'Unsplash'} · ${photo.author}` : photo.title || 'Unsplash'}
                  >
                    <img src={photo.thumb} alt={photo.title || 'unsplash'} className="h-14 w-full object-cover" />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">需要在容器环境变量中配置 `UNSPLASH_ACCESS_KEY`。</p>
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

        <div className="flex gap-3 pt-4">
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
