'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Globe, Network, Search, X } from 'lucide-react';
import { pinyin } from 'pinyin-pro';
import type { Card } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { getBestCardLink } from '@/lib/utils';

const OPEN_SEARCH_EVENT = 'home-v2:open-search';
const RECENT_STORAGE_KEY = 'home-v2-search-recent';
const MAX_RESULTS = 40;
const MAX_RECENT = 60;

type SearchItem = {
  id: string;
  categoryTitle: string;
  card: Card;
  titleText: string;
  normalizedText: string;
  initials: string;
};

type RecentRecord = {
  id: string;
  lastOpenedAt: number;
  count: number;
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '').trim();

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

const toPinyinInitials = (value: string) => {
  if (!value) return '';
  try {
    return normalize(
      pinyin(value, {
        toneType: 'none',
        type: 'array',
        pattern: 'first',
      }).join(''),
    );
  } catch {
    return '';
  }
};

const isFuzzyMatch = (query: string, target: string) => {
  if (!query || !target) return false;
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti += 1) {
    if (target[ti] === query[qi]) qi += 1;
  }
  return qi === query.length;
};

const getMatchScore = (query: string, item: SearchItem) => {
  if (!query) return 1;
  const { titleText, normalizedText, initials } = item;
  if (titleText.startsWith(query)) return 140;
  if (titleText.includes(query)) return 120;
  if (normalizedText.includes(query)) return 100;
  if (initials.includes(query)) return 90;
  if (isFuzzyMatch(query, titleText)) return 70;
  if (isFuzzyMatch(query, normalizedText)) return 55;
  return -1;
};

const readRecentRecords = (): RecentRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Partial<RecentRecord>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => typeof item?.id === 'string')
      .map(item => ({
        id: String(item.id),
        lastOpenedAt: Number(item.lastOpenedAt || 0),
        count: Math.max(1, Number(item.count || 1)),
      }));
  } catch {
    return [];
  }
};

const writeRecentRecords = (records: RecentRecord[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECENT)));
  } catch {
    // ignore storage write failures
  }
};

const highlightText = (text: string, keyword: string): ReactNode => {
  const plain = String(text || '');
  const needle = keyword.trim();
  if (!plain || !needle) return plain;
  const lowerText = plain.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const index = lowerText.indexOf(lowerNeedle);
  if (index < 0) return plain;
  return (
    <>
      {plain.slice(0, index)}
      <mark className="rounded bg-cyan-400/30 px-0.5 text-cyan-100">{plain.slice(index, index + needle.length)}</mark>
      {plain.slice(index + needle.length)}
    </>
  );
};

export default function GlobalSearch() {
  const { categories } = useAppStore();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);

  useEffect(() => {
    setRecentRecords(readRecentRecords());
  }, []);

  const searchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    categories
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .forEach(category => {
        const sortedCards = category.cards.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        sortedCards.forEach(card => {
          const titleText = normalize(card.title || '');
          const mergedText = normalize(
            [category.title, card.title, card.description, card.wanLink, card.lanLink].filter(Boolean).join(' '),
          );
          const initials = toPinyinInitials(`${category.title} ${card.title} ${card.description || ''}`);
          items.push({
            id: `${category.id}-${card.id}`,
            categoryTitle: category.title,
            card,
            titleText,
            normalizedText: mergedText,
            initials,
          });
        });
      });
    return items;
  }, [categories]);

  const itemMap = useMemo(() => new Map(searchItems.map(item => [item.id, item])), [searchItems]);
  const recentMap = useMemo(() => {
    const map = new Map<string, RecentRecord>();
    recentRecords.forEach(record => map.set(record.id, record));
    return map;
  }, [recentRecords]);
  const normalizedQuery = normalize(query);
  const rawQuery = query.trim();
  const results = useMemo(() => {
    if (!normalizedQuery) {
      const sortedRecent = recentRecords
        .slice()
        .filter(record => itemMap.has(record.id))
        .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt || b.count - a.count);
      const recentIds = new Set(sortedRecent.map(item => item.id));
      const recentItems = sortedRecent.map(record => itemMap.get(record.id)).filter((it): it is SearchItem => Boolean(it));
      const remainingItems = searchItems.filter(item => !recentIds.has(item.id));
      return [...recentItems, ...remainingItems].slice(0, MAX_RESULTS);
    }
    return searchItems
      .map(item => ({ item, score: getMatchScore(normalizedQuery, item) }))
      .filter(entry => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map(entry => entry.item);
  }, [itemMap, normalizedQuery, recentRecords, searchItems]);

  const closeDialog = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  const openDialog = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const openCardLink = (item: SearchItem, mode: 'best' | 'wan' | 'lan') => {
    const link =
      mode === 'wan'
        ? item.card.wanLink
        : mode === 'lan'
          ? item.card.lanLink
          : getBestCardLink(item.card, window.location.hostname);
    if (!link) return;
    const now = Date.now();
    setRecentRecords(prev => {
      const existing = prev.find(record => record.id === item.id);
      const next = existing
        ? [{ id: item.id, lastOpenedAt: now, count: existing.count + 1 }, ...prev.filter(record => record.id !== item.id)]
        : [{ id: item.id, lastOpenedAt: now, count: 1 }, ...prev];
      writeRecentRecords(next);
      return next.slice(0, MAX_RECENT);
    });
    window.open(link, item.card.openInNewWindow === false ? '_self' : '_blank');
    closeDialog();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const editable = isEditableTarget(event.target);
      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        openDialog();
        return;
      }
      if (!editable && key === '/' && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        openDialog();
        return;
      }
      if (!open) return;
      if (key === 'escape') {
        event.preventDefault();
        closeDialog();
      }
      if (key === 'arrowdown') {
        event.preventDefault();
        setActiveIndex(prev => (results.length ? Math.min(prev + 1, results.length - 1) : 0));
      }
      if (key === 'arrowup') {
        event.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
      }
      if (key === 'enter') {
        event.preventDefault();
        const target = results[activeIndex];
        if (target) openCardLink(target, 'best');
      }
    };

    const onOpenSearch = () => openDialog();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpenSearch);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpenSearch);
    };
  }, [activeIndex, open, results]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/70" onClick={closeDialog} />
      <div className="relative mx-auto mt-14 w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl sm:mt-20 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索分类/卡片/备注/链接（支持拼音首字母）"
            className="motion-input-focus h-11 w-full rounded-xl border border-white/15 bg-slate-900/70 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <button
            type="button"
            onClick={closeDialog}
            className="motion-btn-hover absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
            aria-label="关闭搜索"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          快捷键：`/` 或 `Ctrl+K`，回车打开，方向键切换。空搜索时优先显示最近打开项。
        </div>

        <div className="scrollbar-hidden mt-3 max-h-[min(58vh,560px)] overflow-y-auto rounded-xl border border-white/10 bg-white/5">
          {results.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">没有找到匹配项</div>
          ) : (
            results.map((item, index) => {
              const active = index === activeIndex;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 text-left last:border-b-0 ${
                    active ? 'bg-cyan-500/15' : 'hover:bg-white/10'
                  }`}
                >
                  <button type="button" onClick={() => openCardLink(item, 'best')} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm text-slate-100">{highlightText(item.card.title, rawQuery)}</div>
                    <div className="truncate text-xs text-slate-400">
                      {highlightText(item.categoryTitle, rawQuery)}
                      {item.card.description ? (
                        <>
                          {' · '}
                          {highlightText(item.card.description, rawQuery)}
                        </>
                      ) : null}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {!normalizedQuery && recentMap.has(item.id) ? (
                      <span className="hidden rounded-md border border-cyan-300/30 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-100 sm:inline">
                        常用
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openCardLink(item, 'lan')}
                      disabled={!item.card.lanLink}
                      className="motion-btn-hover inline-flex h-7 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 text-[11px] text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Network className="h-3 w-3" />
                      LAN
                    </button>
                    <button
                      type="button"
                      onClick={() => openCardLink(item, 'wan')}
                      disabled={!item.card.wanLink}
                      className="motion-btn-hover inline-flex h-7 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 text-[11px] text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Globe className="h-3 w-3" />
                      WAN
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
