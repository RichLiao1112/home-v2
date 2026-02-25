'use client';

import { useState } from 'react';
import { X, Folder, Palette, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

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
    name: layout.head?.name || 'Home V2',
    subtitle: layout.head?.subtitle || '',
    backgroundImage: layout.head?.backgroundImage || '',
    backgroundBlur: String(layout.head?.backgroundBlur ?? 14),
    overlayOpacity: String(layout.head?.overlayOpacity ?? 70),
    categoryOpacity: String(layout.head?.categoryOpacity ?? 5),
    cardOpacity: String(layout.head?.cardOpacity ?? 5),
  });

  if (!editingCategory) return null;

  const isEditing = !!editingCategory.id && !isLayoutMode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLayoutMode) {
      updateLayout({
        head: {
          ...layout.head,
          name: layoutData.name.trim() || 'Home V2',
          subtitle: layoutData.subtitle.trim(),
          backgroundImage: layoutData.backgroundImage.trim(),
          backgroundBlur: Number(layoutData.backgroundBlur || 0),
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
    'w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30';

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
                type="url"
                value={layoutData.backgroundImage}
                onChange={e => setLayoutData({ ...layoutData, backgroundImage: e.target.value })}
                placeholder="/media/your-file.png"
                className={fieldClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">背景模糊强度</label>
              <input
                type="number"
                min={0}
                max={40}
                value={layoutData.backgroundBlur}
                onChange={e => setLayoutData({ ...layoutData, backgroundBlur: e.target.value })}
                className={fieldClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                页面遮罩透明度 ({layoutData.overlayOpacity}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={layoutData.overlayOpacity}
                onChange={e => setLayoutData({ ...layoutData, overlayOpacity: e.target.value })}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                分类透明度 ({layoutData.categoryOpacity}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={layoutData.categoryOpacity}
                onChange={e => setLayoutData({ ...layoutData, categoryOpacity: e.target.value })}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                卡片透明度 ({layoutData.cardOpacity}%)
              </label>
              <input
                type="range"
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
              className="rounded-xl px-4 py-2 text-slate-300 transition-colors hover:bg-rose-500/15 hover:text-rose-200"
            >
              删除
            </button>
          )}
          <div className="flex-1"></div>
          <button
            type="button"
            onClick={() => setEditingCategory(null)}
            className="rounded-xl px-4 py-2 text-slate-200 transition-colors hover:bg-white/10"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isLayoutMode ? !layoutData.name.trim() : !formData.title.trim()}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
}
