'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Copy, Edit2, Globe, History, KeyRound, Network, Search, Trash2, X } from 'lucide-react';
import { pinyin } from 'pinyin-pro';
import type { Card } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { getBestCardLink } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { apiCreateSnapshot } from '@/lib/api';

const OPEN_SEARCH_EVENT = 'home-v2:open-search';
const OPEN_SETTINGS_EVENT = 'home-v2:open-settings';
const OPEN_SNAPSHOT_EVENT = 'home-v2:open-snapshot';
const OPEN_RECYCLE_EVENT = 'home-v2:open-recycle';

const RECENT_OPEN_STORAGE_KEY = 'home-v2-search-recent-open';
const RECENT_ACTION_STORAGE_KEY = 'home-v2-search-recent-actions';
const MAX_RESULTS = 50;
const MAX_RECENT_OPEN = 60;
const MAX_RECENT_ACTION = 30;

type PrefixMode = 'all' | 'key' | 'card' | 'cat' | 'desc' | 'wan' | 'lan' | 'cmd';

type SearchItem = {
  id: string;
  categoryId: string;
  categoryTitle: string;
  card: Card;
  titleText: string;
  categoryText: string;
  descriptionText: string;
  wanText: string;
  lanText: string;
  mergedText: string;
  initials: string;
  pinyinFull: string;
};

type RecentOpenRecord = {
  id: string;
  lastOpenedAt: number;
  count: number;
};

type RecentActionRecord = {
  id: string;
  type: 'command' | 'key' | 'card-open' | 'card-edit' | 'card-delete' | 'card-copy';
  label: string;
  detail?: string;
  at: number;
  payload?: { commandId?: string; key?: string; searchItemId?: string };
};

type CommandItem = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  shortcut?: string;
};

type SearchResultItem =
  | { kind: 'key'; key: string; score: number }
  | { kind: 'card'; item: SearchItem; score: number }
  | { kind: 'command'; command: CommandItem; score: number }
  | { kind: 'history'; action: RecentActionRecord; score: number };

const COMMANDS: CommandItem[] = [
  {
    id: 'open-settings',
    title: '打开页面设置',
    description: '进入页面设置弹窗',
    keywords: ['settings', '页面设置', 'layout'],
    shortcut: '回车',
  },
  {
    id: 'open-snapshot',
    title: '打开快照管理',
    description: '查看、创建、恢复快照',
    keywords: ['snapshot', '快照', '回滚'],
    shortcut: '回车',
  },
  {
    id: 'open-recycle',
    title: '打开回收站',
    description: '恢复或永久删除已移除项',
    keywords: ['recycle', '回收站', '恢复'],
    shortcut: '回车',
  },
  {
    id: 'focus-key-mode',
    title: '进入 key 搜索模式',
    description: '自动填入 key:，仅搜索配置 key',
    keywords: ['key', 'k:', '配置切换'],
    shortcut: '回车',
  },
  {
    id: 'create-key',
    title: '新建配置 key',
    description: '输入 key 名称并创建新配置',
    keywords: ['新增 key', 'create key', '配置管理'],
    shortcut: '回车',
  },
  {
    id: 'delete-current-key',
    title: '删除当前配置 key',
    description: '删除当前配置（至少保留一个）',
    keywords: ['删除 key', 'remove key', '配置管理'],
    shortcut: '回车',
  },
  {
    id: 'switch-next-key',
    title: '切换到下一个 key',
    description: '按配置列表顺序切换到下一个',
    keywords: ['next key', '下一个配置', '配置管理'],
    shortcut: '回车',
  },
  {
    id: 'switch-prev-key',
    title: '切换到上一个 key',
    description: '按配置列表顺序切换到上一个',
    keywords: ['prev key', '上一个配置', '配置管理'],
    shortcut: '回车',
  },
  {
    id: 'create-snapshot-now',
    title: '立即创建快照',
    description: '为当前配置创建手动快照',
    keywords: ['snapshot', '创建快照', '配置管理'],
    shortcut: '回车',
  },
];

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '').trim();

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

const parsePrefixMode = (raw: string): { mode: PrefixMode; query: string } => {
  const trimmed = raw.trim();
  if (!trimmed) return { mode: 'all', query: '' };
  if (trimmed.startsWith('/')) return { mode: 'cmd', query: trimmed.slice(1).trim() };
  const match = /^([a-z]+)\s*:(.*)$/i.exec(trimmed);
  if (!match) return { mode: 'all', query: trimmed };
  const prefix = match[1].toLowerCase();
  const nextQuery = match[2].trim();
  if (prefix === 'key' || prefix === 'k') return { mode: 'key', query: nextQuery };
  if (prefix === 'card' || prefix === 'c') return { mode: 'card', query: nextQuery };
  if (prefix === 'cat' || prefix === 'category') return { mode: 'cat', query: nextQuery };
  if (prefix === 'desc' || prefix === 'remark') return { mode: 'desc', query: nextQuery };
  if (prefix === 'wan') return { mode: 'wan', query: nextQuery };
  if (prefix === 'lan') return { mode: 'lan', query: nextQuery };
  if (prefix === 'cmd' || prefix === 'action') return { mode: 'cmd', query: nextQuery };
  return { mode: 'all', query: trimmed };
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

const toPinyinFull = (value: string) => {
  if (!value) return '';
  try {
    return normalize(
      pinyin(value, {
        toneType: 'none',
        type: 'array',
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

const getFieldScore = (query: string, target: string) => {
  if (!query || !target) return -1;
  if (target.startsWith(query)) return 120;
  if (target.includes(query)) return 100;
  if (isFuzzyMatch(query, target)) return 75;
  return -1;
};

const getCardMatchScore = (query: string, mode: PrefixMode, item: SearchItem) => {
  if (!query) return 1;
  const titleScore = getFieldScore(query, item.titleText);
  const mergedScore = getFieldScore(query, item.mergedText);
  const catScore = getFieldScore(query, item.categoryText);
  const descScore = getFieldScore(query, item.descriptionText);
  const wanScore = getFieldScore(query, item.wanText);
  const lanScore = getFieldScore(query, item.lanText);
  const initialsScore = getFieldScore(query, item.initials);
  const pinyinScore = getFieldScore(query, item.pinyinFull);

  if (mode === 'card') return titleScore;
  if (mode === 'cat') return catScore;
  if (mode === 'desc') return descScore;
  if (mode === 'wan') return wanScore;
  if (mode === 'lan') return lanScore;

  return Math.max(titleScore, mergedScore, catScore - 5, descScore - 8, initialsScore - 10, pinyinScore - 3);
};

const getKeyMatchScore = (query: string, key: string) => {
  const keyText = normalize(key);
  if (!query) return 180;
  return getFieldScore(query, keyText) + 60;
};

const getCommandMatchScore = (query: string, command: CommandItem) => {
  if (!query) return 110;
  const label = normalize(command.title);
  const desc = normalize(command.description);
  const keywordText = normalize(command.keywords.join(' '));
  return Math.max(getFieldScore(query, label), getFieldScore(query, desc) - 8, getFieldScore(query, keywordText) - 4);
};

const readRecentOpen = (): RecentOpenRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_OPEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Partial<RecentOpenRecord>>;
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

const readRecentActions = (): RecentActionRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_ACTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<RecentActionRecord>;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && typeof item.id === 'string').slice(0, MAX_RECENT_ACTION);
  } catch {
    return [];
  }
};

const writeRecentOpen = (records: RecentOpenRecord[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_OPEN_STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECENT_OPEN)));
  } catch {
    // ignore storage write failures
  }
};

const writeRecentActions = (records: RecentActionRecord[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_ACTION_STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECENT_ACTION)));
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
  const {
    categories,
    currentKey,
    configKeys,
    loadData,
    createConfigKey,
    deleteConfigKey,
    setEditingCard,
    deleteCard,
  } = useAppStore();
  const { logout } = useAuthStore();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentOpen, setRecentOpen] = useState<RecentOpenRecord[]>([]);
  const [recentActions, setRecentActions] = useState<RecentActionRecord[]>([]);

  useEffect(() => {
    setRecentOpen(readRecentOpen());
    setRecentActions(readRecentActions());
  }, []);

  const searchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    categories
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .forEach(category => {
        category.cards
          .slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .forEach(card => {
            const titleText = normalize(card.title || '');
            const categoryText = normalize(category.title || '');
            const descriptionText = normalize(card.description || '');
            const wanText = normalize(card.wanLink || '');
            const lanText = normalize(card.lanLink || '');
            const mergedSource = [category.title, card.title, card.description, card.wanLink, card.lanLink]
              .filter(Boolean)
              .join(' ');
            items.push({
              id: `${category.id}-${card.id}`,
              categoryId: category.id,
              categoryTitle: category.title,
              card,
              titleText,
              categoryText,
              descriptionText,
              wanText,
              lanText,
              mergedText: normalize(mergedSource),
              initials: toPinyinInitials(mergedSource),
              pinyinFull: toPinyinFull(mergedSource),
            });
          });
      });
    return items;
  }, [categories]);

  const searchItemMap = useMemo(() => new Map(searchItems.map(item => [item.id, item])), [searchItems]);
  const recentOpenMap = useMemo(() => {
    const map = new Map<string, RecentOpenRecord>();
    recentOpen.forEach(item => map.set(item.id, item));
    return map;
  }, [recentOpen]);

  const { mode: prefixMode, query: parsedQuery } = parsePrefixMode(query);
  const normalizedQuery = normalize(parsedQuery);

  const recordAction = (action: Omit<RecentActionRecord, 'id' | 'at'>) => {
    const nextItem: RecentActionRecord = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      at: Date.now(),
    };
    setRecentActions(prev => {
      const next = [nextItem, ...prev].slice(0, MAX_RECENT_ACTION);
      writeRecentActions(next);
      return next;
    });
  };

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
    setRecentOpen(prev => {
      const existing = prev.find(record => record.id === item.id);
      const next = existing
        ? [{ id: item.id, lastOpenedAt: now, count: existing.count + 1 }, ...prev.filter(record => record.id !== item.id)]
        : [{ id: item.id, lastOpenedAt: now, count: 1 }, ...prev];
      writeRecentOpen(next);
      return next.slice(0, MAX_RECENT_OPEN);
    });
    recordAction({
      type: 'card-open',
      label: `打开卡片：${item.card.title}`,
      detail: `${item.categoryTitle} · ${mode.toUpperCase()}`,
      payload: { searchItemId: item.id },
    });

    window.open(link, item.card.openInNewWindow === false ? '_self' : '_blank');
    closeDialog();
  };

  const switchConfigKey = async (key: string) => {
    if (!key || key === currentKey) {
      closeDialog();
      return;
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('key', key);
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
    await loadData(key);
    recordAction({
      type: 'key',
      label: `切换配置：${key}`,
      detail: '通过搜索弹窗切换',
      payload: { key },
    });
    closeDialog();
  };

  const handleEditCard = (item: SearchItem) => {
    setEditingCard({ ...item.card, categoryId: item.categoryId });
    recordAction({
      type: 'card-edit',
      label: `编辑卡片：${item.card.title}`,
      detail: item.categoryTitle,
      payload: { searchItemId: item.id },
    });
    closeDialog();
  };

  const handleDeleteCard = (item: SearchItem) => {
    if (!window.confirm(`确认删除卡片「${item.card.title}」吗？`)) return;
    deleteCard(item.card.id, item.categoryId);
    recordAction({
      type: 'card-delete',
      label: `删除卡片：${item.card.title}`,
      detail: item.categoryTitle,
      payload: { searchItemId: item.id },
    });
    closeDialog();
  };

  const handleCopyCardLink = async (item: SearchItem) => {
    const link = getBestCardLink(item.card, window.location.hostname);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      recordAction({
        type: 'card-copy',
        label: `复制链接：${item.card.title}`,
        detail: link,
        payload: { searchItemId: item.id },
      });
    } catch {
      window.prompt('复制失败，请手动复制链接：', link);
    }
  };

  const executeCommand = async (command: CommandItem) => {
    if (command.id === 'open-settings') {
      window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
    } else if (command.id === 'open-snapshot') {
      window.dispatchEvent(new Event(OPEN_SNAPSHOT_EVENT));
    } else if (command.id === 'open-recycle') {
      window.dispatchEvent(new Event(OPEN_RECYCLE_EVENT));
    } else if (command.id === 'focus-key-mode') {
      setQuery('key:');
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    } else if (command.id === 'create-key') {
      const key = window.prompt('输入新的配置 key（例如 office / home / demo）');
      if (!key) return;
      await createConfigKey(key);
    } else if (command.id === 'delete-current-key') {
      if (!window.confirm(`确认删除当前配置 "${currentKey}" 吗？`)) return;
      await deleteConfigKey(currentKey);
    } else if (command.id === 'switch-next-key') {
      if (configKeys.length <= 1) return;
      const currentIndex = Math.max(0, configKeys.indexOf(currentKey));
      const nextKey = configKeys[(currentIndex + 1) % configKeys.length];
      await switchConfigKey(nextKey);
      return;
    } else if (command.id === 'switch-prev-key') {
      if (configKeys.length <= 1) return;
      const currentIndex = Math.max(0, configKeys.indexOf(currentKey));
      const prevKey = configKeys[(currentIndex - 1 + configKeys.length) % configKeys.length];
      await switchConfigKey(prevKey);
      return;
    } else if (command.id === 'create-snapshot-now') {
      const nowText = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
      await apiCreateSnapshot(currentKey, `手动快照 ${nowText}`, 'manual');
    } else if (command.id === 'logout') {
      await logout();
    }
    recordAction({
      type: 'command',
      label: `执行命令：${command.title}`,
      detail: command.description,
      payload: { commandId: command.id },
    });
    closeDialog();
  };

  const replayHistory = async (action: RecentActionRecord) => {
    if (action.type === 'key' && action.payload?.key) {
      await switchConfigKey(action.payload.key);
      return;
    }
    if (action.type === 'command' && action.payload?.commandId) {
      const command = COMMANDS.find(item => item.id === action.payload!.commandId);
      if (command) {
        await executeCommand(command);
        return;
      }
    }
    if ((action.type === 'card-open' || action.type === 'card-edit' || action.type === 'card-delete' || action.type === 'card-copy') && action.payload?.searchItemId) {
      const target = searchItemMap.get(action.payload.searchItemId);
      if (!target) return;
      if (action.type === 'card-open') openCardLink(target, 'best');
      if (action.type === 'card-edit') handleEditCard(target);
      if (action.type === 'card-delete') handleDeleteCard(target);
      if (action.type === 'card-copy') await handleCopyCardLink(target);
    }
  };

  const results = useMemo<SearchResultItem[]>(() => {
    const commandResults = COMMANDS
      .map(command => ({ command, score: getCommandMatchScore(normalizedQuery, command) }))
      .filter(entry => (prefixMode === 'cmd' ? entry.score >= 0 : normalizedQuery ? entry.score >= 105 : true))
      .sort((a, b) => b.score - a.score)
      .map(entry => ({ kind: 'command' as const, command: entry.command, score: entry.score }));

    const keyResults = configKeys
      .map(key => ({ key, score: getKeyMatchScore(normalizedQuery, key) }))
      .filter(entry => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => ({ kind: 'key' as const, key: entry.key, score: entry.score }));

    if (!normalizedQuery && prefixMode === 'all') {
      const historyResults = recentActions
        .slice(0, 8)
        .map(action => ({ kind: 'history' as const, action, score: 200 - Math.floor((Date.now() - action.at) / 60000) }));
      const sortedRecentOpen = recentOpen
        .slice()
        .filter(record => searchItemMap.has(record.id))
        .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt || b.count - a.count);
      const recentOpenIds = new Set(sortedRecentOpen.map(item => item.id));
      const recentCards = sortedRecentOpen
        .map(record => searchItemMap.get(record.id))
        .filter((it): it is SearchItem => Boolean(it))
        .map(item => ({ kind: 'card' as const, item, score: 95 }));
      const restCards = searchItems
        .filter(item => !recentOpenIds.has(item.id))
        .slice(0, MAX_RESULTS)
        .map(item => ({ kind: 'card' as const, item, score: 60 }));
      return [...historyResults, ...commandResults.slice(0, 4), ...keyResults, ...recentCards, ...restCards].slice(0, MAX_RESULTS);
    }

    if (prefixMode === 'cmd') return commandResults.slice(0, MAX_RESULTS);
    if (prefixMode === 'key') return keyResults.slice(0, MAX_RESULTS);

    const cardResults = searchItems
      .map(item => ({ item, score: getCardMatchScore(normalizedQuery, prefixMode, item) }))
      .filter(entry => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => ({ kind: 'card' as const, item: entry.item, score: entry.score }));

    if (prefixMode === 'card' || prefixMode === 'cat' || prefixMode === 'desc' || prefixMode === 'wan' || prefixMode === 'lan') {
      return cardResults.slice(0, MAX_RESULTS);
    }

    return [...commandResults.slice(0, 3), ...keyResults, ...cardResults].slice(0, MAX_RESULTS);
  }, [configKeys, normalizedQuery, prefixMode, recentActions, recentOpen, searchItemMap, searchItems]);

  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(results.length > 0 ? results.length - 1 : 0);
    }
  }, [activeIndex, results]);

  const activeResult = results[activeIndex];

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
        return;
      }
      if (key === 'arrowdown') {
        event.preventDefault();
        setActiveIndex(prev => (results.length ? Math.min(prev + 1, results.length - 1) : 0));
        return;
      }
      if (key === 'arrowup') {
        event.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (key === 'enter') {
        event.preventDefault();
        const target = results[activeIndex];
        if (!target) return;
        if (target.kind === 'key') {
          void switchConfigKey(target.key);
          return;
        }
        if (target.kind === 'command') {
          void executeCommand(target.command);
          return;
        }
        if (target.kind === 'history') {
          void replayHistory(target.action);
          return;
        }
        openCardLink(target.item, 'best');
        return;
      }

      if (event.altKey && activeResult?.kind === 'card') {
        if (key === 'e') {
          event.preventDefault();
          handleEditCard(activeResult.item);
          return;
        }
        if (key === 'd') {
          event.preventDefault();
          handleDeleteCard(activeResult.item);
          return;
        }
        if (key === 'c') {
          event.preventDefault();
          void handleCopyCardLink(activeResult.item);
          return;
        }
        if (key === 'l') {
          event.preventDefault();
          openCardLink(activeResult.item, 'lan');
          return;
        }
        if (key === 'w') {
          event.preventDefault();
          openCardLink(activeResult.item, 'wan');
          return;
        }
      }
    };

    const onOpenSearch = () => openDialog();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpenSearch);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpenSearch);
    };
  }, [activeIndex, activeResult, open, results]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery, open, prefixMode]);

  useEffect(() => {
    if (!open) return;
    const container = listRef.current;
    if (!container) return;
    const activeRow = container.querySelector<HTMLElement>(`[data-search-row-index="${activeIndex}"]`);
    if (!activeRow) return;
    activeRow.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, results]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/70" onClick={closeDialog} />
      <div className="relative mx-auto mt-14 w-full max-w-5xl rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl sm:mt-20 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索卡片/配置/命令（支持 key: card: cat: desc: wan: lan: /命令）"
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
          快捷键：`/` 或 `Ctrl+K` 打开。前缀筛选：`key:` `card:` `cat:` `desc:` `wan:` `lan:` `/命令`。二级快捷键：`Alt+E/D/C/L/W`。
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div
            ref={listRef}
            className="scrollbar-hidden max-h-[min(62vh,620px)] overflow-y-auto rounded-xl border border-white/10 bg-white/5"
          >
            {results.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400">没有找到匹配项</div>
            ) : (
              results.map((result, index) => {
                const active = index === activeIndex;
                if (result.kind === 'key') {
                  const isCurrent = result.key === currentKey;
                  return (
                    <button
                      key={`key-${result.key}`}
                      type="button"
                      data-search-row-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => void switchConfigKey(result.key)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 text-left last:border-b-0 ${
                        active ? 'bg-cyan-500/15' : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-slate-100">{highlightText(result.key, parsedQuery)}</div>
                        <div className="truncate text-xs text-slate-400">配置切换</div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${
                          isCurrent
                            ? 'border-cyan-300/40 bg-cyan-500/20 text-cyan-100'
                            : 'border-white/15 bg-white/5 text-slate-200'
                        }`}
                      >
                        <KeyRound className="h-3 w-3" />
                        {isCurrent ? '当前' : '切换'}
                      </span>
                    </button>
                  );
                }

                if (result.kind === 'command') {
                  return (
                    <button
                      key={`cmd-${result.command.id}`}
                      type="button"
                      data-search-row-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => void executeCommand(result.command)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 text-left last:border-b-0 ${
                        active ? 'bg-cyan-500/15' : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-slate-100">{highlightText(result.command.title, parsedQuery)}</div>
                        <div className="truncate text-xs text-slate-400">{result.command.description}</div>
                      </div>
                      <span className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                        命令
                      </span>
                    </button>
                  );
                }

                if (result.kind === 'history') {
                  return (
                    <button
                      key={`history-${result.action.id}`}
                      type="button"
                      data-search-row-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => void replayHistory(result.action)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 text-left last:border-b-0 ${
                        active ? 'bg-cyan-500/15' : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-slate-100">{result.action.label}</div>
                        <div className="truncate text-xs text-slate-400">{result.action.detail || '最近操作'}</div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                        <History className="h-3 w-3" />
                        历史
                      </span>
                    </button>
                  );
                }

                const item = result.item;
                return (
                  <div
                    key={`card-${item.id}`}
                    data-search-row-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 text-left last:border-b-0 ${
                      active ? 'bg-cyan-500/15' : 'hover:bg-white/10'
                    }`}
                  >
                    <button type="button" onClick={() => openCardLink(item, 'best')} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm text-slate-100">{highlightText(item.card.title, parsedQuery)}</div>
                      <div className="truncate text-xs text-slate-400">
                        {highlightText(item.categoryTitle, parsedQuery)}
                        {item.card.description ? <> · {highlightText(item.card.description, parsedQuery)}</> : null}
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {!normalizedQuery && recentOpenMap.has(item.id) ? (
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

          <div className="hidden rounded-xl border border-white/10 bg-white/5 p-3 lg:block">
            {!activeResult ? (
              <div className="text-xs text-slate-400">暂无预览</div>
            ) : activeResult.kind === 'card' ? (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{activeResult.item.card.title}</div>
                  <div className="text-xs text-slate-400">{activeResult.item.categoryTitle}</div>
                </div>
                {activeResult.item.card.description ? (
                  <p className="text-xs text-slate-300">{activeResult.item.card.description}</p>
                ) : null}
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="truncate">WAN: {activeResult.item.card.wanLink || '无'}</div>
                  <div className="truncate">LAN: {activeResult.item.card.lanLink || '无'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditCard(activeResult.item)}
                    className="motion-btn-hover inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyCardLink(activeResult.item)}
                    className="motion-btn-hover inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    复制链接
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(activeResult.item)}
                    className="motion-btn-hover inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 text-xs text-rose-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuery('key:')}
                    className="motion-btn-hover inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    切 key
                  </button>
                </div>
              </div>
            ) : activeResult.kind === 'key' ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-100">配置切换</div>
                <div className="text-xs text-slate-300">{activeResult.key}</div>
                <div className="text-[11px] text-slate-500">回车或点击即可切换到该配置</div>
              </div>
            ) : activeResult.kind === 'command' ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-100">{activeResult.command.title}</div>
                <div className="text-xs text-slate-300">{activeResult.command.description}</div>
                <div className="text-[11px] text-slate-500">命令关键词：{activeResult.command.keywords.join(' / ')}</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-100">{activeResult.action.label}</div>
                <div className="text-xs text-slate-300">{activeResult.action.detail || '最近操作记录'}</div>
                <div className="text-[11px] text-slate-500">
                  {new Date(activeResult.action.at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
