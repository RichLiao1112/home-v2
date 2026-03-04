'use client';

import { useEffect, useState, useRef } from 'react';
import { Cloud, MapPin, RefreshCw, Search, X, Clock } from 'lucide-react';

interface WeatherData {
  temp: string;
  text: string;
  icon: string;
  location: string;
  feelsLike: string;
  humidity: string;
  windDir: string;
  windScale: string;
  success: boolean;
  error?: string;
}

interface LocationItem {
  id: string;
  name: string;
  adcode: string;
  lat: string;
  lon: string;
  country?: string;
  province?: string;
  city?: string;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState<string>('');

  // 搜索相关状态
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationItem[]>([]);
  const [savedLocations, setSavedLocations] = useState<LocationItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSearchTime = useRef(0); // 上次搜索时间，用于节流

  // 加载保存的位置
  const loadSavedLocations = async () => {
    try {
      const res = await fetch('/api/weather/location');
      const data = await res.json();
      if (data.success) {
        setSavedLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Failed to load saved locations:', err);
    }
  };

  const fetchWeather = async (location?: string) => {
    setLoading(true);
    setError(null);

    try {
      const savedLocation = location || localStorage.getItem('home-v2-weather-location') || '101010100';

      const response = await fetch(`/api/weather?location=${savedLocation}`, {
        cache: 'no-store',
      });

      const data = await response.json();

      if (data.success) {
        setWeather(data);
      } else {
        setError(data.error || '获取天气失败');
        console.error('Weather API error:', data);
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 搜索城市（带节流：500ms内不重复请求）
  const searchCity = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const now = Date.now();
    if (now - lastSearchTime.current < 500) {
      return; // 节流：500ms内不重复请求
    }
    lastSearchTime.current = now;

    setSearching(true);
    try {
      const res = await fetch(`/api/weather/location?city=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.locations || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  // 选择位置
  const selectLocation = async (location: LocationItem) => {
    console.log('Selected location:', location);

    // 保存到后端
    try {
      await fetch('/api/weather/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });
      await loadSavedLocations();
    } catch (err) {
      console.error('Failed to save location:', err);
    }

    // 使用 adcode 查询天气
    const locationCode = location.adcode || location.id;
    if (locationCode) {
      setCurrentCity(location.name);
      localStorage.setItem('home-v2-weather-location', locationCode);
      localStorage.setItem('home-v2-weather-city', location.name);
      await fetchWeather(locationCode);
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // 删除保存的位置
  const deleteLocation = async (e: React.MouseEvent, locationId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/weather/location?id=${locationId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSavedLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Failed to delete location:', err);
    }
  };

  // 点击外部关闭搜索框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 搜索框显示时聚焦输入框
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // 防抖搜索（500ms）+ 节流（在searchCity中实现）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchCity(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadSavedLocations();
    fetchWeather();

    // 加载保存的城市名称
    const savedCity = localStorage.getItem('home-v2-weather-city');
    if (savedCity) {
      setCurrentCity(savedCity);
    }

    // 每 30 分钟自动刷新
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {showSearch ? (
        <div className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索城市..."
            className="w-24 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
            className="rounded p-1 text-slate-400 hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </button>

          {/* 搜索结果下拉 */}
          {(searchResults.length > 0 || searching) && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/15 bg-white/10 p-2 shadow-xl backdrop-blur-xl">
              {searching ? (
                <div className="p-2 text-sm text-slate-400">搜索中...</div>
              ) : (
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {searchResults.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => selectLocation(location)}
                      className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm text-slate-200 hover:bg-white/10"
                    >
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{location.name}</span>
                      <span className="text-xs text-slate-500">
                        {location.province || location.country}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 显示保存的历史位置 */}
          {showSearch && !searchQuery && savedLocations.length > 0 && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/15 bg-white/10 p-2 shadow-xl backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-1 px-2 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                <span>最近选择</span>
              </div>
              <div className="space-y-1">
                {savedLocations.map((location) => (
                  <div
                    key={location.id}
                    className="group flex items-center gap-2 rounded-lg p-2 text-sm text-slate-200 hover:bg-white/10"
                  >
                    <button
                      onClick={() => selectLocation(location)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{location.name}</span>
                    </button>
                    <button
                      onClick={(e) => deleteLocation(e, location.id)}
                      className="hidden rounded p-1 text-slate-500 hover:bg-white/10 hover:text-red-400 group-hover:block"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-400">
          <Cloud className="h-4 w-4" />
          <span>天气服务未配置</span>
        </div>
      ) : !weather && loading ? (
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>加载中...</span>
        </div>
      ) : !weather ? (
        null
      ) : (
        <div
          onClick={() => setShowSearch(true)}
          className="group relative flex cursor-pointer items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-sm text-slate-200 transition-colors hover:bg-white/10"
        >
          <span className="text-lg">{weather.icon}</span>
          <span className="font-medium">{weather.temp}°C</span>
          <span className="text-slate-400">{weather.text}</span>
          <span className="text-slate-400">{currentCity || weather.location}</span>

          {/* 悬停显示详细信息 */}
          <div className="absolute right-0 top-full z-50 mt-2 hidden w-48 rounded-xl border border-white/15 bg-white/10 p-3 shadow-xl backdrop-blur-xl group-hover:block">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">体感温度</span>
                <span>{weather.feelsLike}°C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">湿度</span>
                <span>{weather.humidity}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">风向</span>
                <span>{weather.windDir} {weather.windScale}级</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
