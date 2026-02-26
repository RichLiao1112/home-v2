'use client';

import { useEffect, useState } from 'react';
import { Search, X, Grid3X3, Link, FileText, Loader2, Upload } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { apiSearchMedia, apiUploadImage } from '@/lib/api';

export default function CardEditForm() {
  const { editingCard, setEditingCard, categories, addCard, updateCard, deleteCard } = useAppStore();
  const [uploading, setUploading] = useState(false);
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaResults, setMediaResults] = useState<Array<{ name: string; url: string }>>([]);
  const [formData, setFormData] = useState({
    title: editingCard?.title || '',
    description: editingCard?.description || '',
    cover: editingCard?.cover || '',
    coverColor: editingCard?.coverColor ?? '#3B82F6',
    wanLink: editingCard?.wanLink || '',
    lanLink: editingCard?.lanLink || '',
    openInNewWindow: editingCard?.openInNewWindow ?? true,
    categoryId: editingCard?.categoryId || categories[0]?.id || '',
  });

  useEffect(() => {
    apiSearchMedia(mediaQuery).then(setMediaResults);
  }, [mediaQuery]);

  if (!editingCard) return null;

  const isEditing = !!editingCard.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    if (!formData.wanLink.trim() && !formData.lanLink.trim()) return;

    if (isEditing) {
      updateCard(editingCard.id, formData);
    } else {
      addCard(formData);
    }
    setEditingCard(null);
  };

  const handleDelete = () => {
    if (confirm('确定要删除这个卡片吗？')) {
      deleteCard(editingCard.id, editingCard.categoryId);
      setEditingCard(null);
    }
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const url = await apiUploadImage(file);
    setUploading(false);
    if (!url) {
      alert('上传失败，请确认已登录且图片格式正确');
      return;
    }
    setFormData(prev => ({ ...prev, cover: url }));
  };

  const fieldClassName =
    'motion-input-focus w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30';
  const selectedCategoryColor = categories.find(cat => cat.id === formData.categoryId)?.color || '';
  const effectiveCoverColor = formData.coverColor || selectedCategoryColor || '#3B82F6';

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl shadow-slate-950/60 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-cyan-300" />
          <h2 className="text-lg font-semibold text-slate-100">{isEditing ? '编辑卡片' : '添加卡片'}</h2>
        </div>
        <button
          onClick={() => setEditingCard(null)}
          className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-6 space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">所属分类</label>
          <select
            value={formData.categoryId}
            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
            className={fieldClassName}
          >
            {categories.map(cat => (
              <option
                key={cat.id}
                value={cat.id}
              >
                {cat.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">卡片名称</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="例如：GitHub、Gmail、Dashboard"
            className={fieldClassName}
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-200">
            <Link className="h-4 w-4" />
            公网地址（WAN）
          </label>
          <input
            type="url"
            value={formData.wanLink}
            onChange={e => setFormData({ ...formData, wanLink: e.target.value })}
            placeholder="https://example.com"
            className={fieldClassName}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-200">
            <FileText className="h-4 w-4" />
            备注（可选）
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="给这个卡片添加备注信息"
            className={fieldClassName}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-200">
            <Link className="h-4 w-4" />
            内网地址（LAN，可选）
          </label>
          <input
            type="url"
            value={formData.lanLink}
            onChange={e => setFormData({ ...formData, lanLink: e.target.value })}
            placeholder="http://192.168.x.x:3000"
            className={fieldClassName}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">图标 URL（可选）</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.cover}
              onChange={e => setFormData({ ...formData, cover: e.target.value })}
              placeholder="https://... 或 /assets/xxx.png"
              className={fieldClassName}
            />
            <label className="motion-btn-hover inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              上传
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => onUpload(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <label className="mb-1 block text-xs text-slate-300">搜索已上传图片（用于图标）</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={mediaQuery}
                onChange={e => setMediaQuery(e.target.value)}
                placeholder="按文件名搜索"
                className={`${fieldClassName} pl-9`}
              />
            </div>
            <div className="scrollbar-hidden grid max-h-40 grid-cols-4 gap-2 overflow-y-auto">
              {mediaResults.length === 0 ? (
                <p className="col-span-4 text-xs text-slate-400">暂无匹配图片</p>
              ) : (
                mediaResults.map(item => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => setFormData({ ...formData, cover: item.url })}
                    className="motion-btn-hover flex flex-col items-center gap-2 rounded-xl border border-white/15 bg-slate-900/70 p-2"
                    title={item.name}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/80 ring-1 ring-white/10">
                      <img src={item.url} alt={item.name} className="h-7 w-7 rounded object-contain" />
                    </div>
                    <div className="w-full truncate text-center text-[10px] text-slate-300">{item.name}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">图标底色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={effectiveCoverColor}
              onChange={e => setFormData({ ...formData, coverColor: e.target.value })}
              className="h-10 w-24 cursor-pointer rounded-xl bg-slate-900/70"
            />
            <button
              type="button"
              onClick={() => setFormData({ ...formData, coverColor: '' })}
              className={`motion-btn-hover whitespace-nowrap rounded-xl border px-3 py-2 text-xs ${
                formData.coverColor === ''
                  ? 'border-cyan-300/60 bg-cyan-500/15 text-cyan-100'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              使用分类颜色
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={formData.openInNewWindow}
            onChange={e => setFormData({ ...formData, openInNewWindow: e.target.checked })}
            className="h-4 w-4 accent-cyan-400"
          />
          在新标签页打开
        </label>

        <div className="flex gap-3 pt-4">
          {isEditing && (
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
            onClick={() => setEditingCard(null)}
            className="motion-btn-hover whitespace-nowrap rounded-xl px-4 py-2 text-slate-200 transition-colors hover:bg-white/10"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!formData.title.trim() || (!formData.wanLink.trim() && !formData.lanLink.trim())}
            className="motion-btn-hover whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2 text-white hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? '保存' : '添加'}
          </button>
        </div>
      </form>
    </div>
  );
}
