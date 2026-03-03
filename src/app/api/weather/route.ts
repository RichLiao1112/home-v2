import { NextRequest, NextResponse } from 'next/server';
import { checkAndIncrementRateLimit } from '@/server/qweather-rate-limit';
import { getWeatherCache, setWeatherCache } from '@/server/weather-cache';

// 天气图标映射（和风天气图标代码 → Emoji）
const weatherIconMap: Record<string, string> = {
  '100': '☀️', // 晴
  '101': '🌤️', // 多云
  '102': '⛅', // 少云
  '103': '🌥️', // 晴间多云
  '104': '☁️', // 阴
  '150': '🌙', // 晴（夜）
  '151': '🌤️', // 多云（夜）
  '152': '☁️', // 阴（夜）
  '300': '🌦️', // 阵雨
  '301': '⛈️', // 强阵雨
  '302': '⚡', // 雷阵雨
  '303': '⛈️', // 强雷阵雨
  '304': '🌨️', // 雷阵雨伴有冰雹
  '305': '🌧️', // 小雨
  '306': '🌧️', // 中雨
  '307': '🌧️', // 大雨
  '308': '🌧️', // 极端降雨
  '309': '🌦️', // 毛毛雨
  '310': '🌧️', // 暴雨
  '311': '🌧️', // 大暴雨
  '312': '🌧️', // 特大暴雨
  '313': '🌨️', // 冻雨
  '314': '🌧️', // 小到中雨
  '315': '🌧️', // 中到大雨
  '316': '🌧️', // 大到暴雨
  '317': '🌧️', // 暴雨到大暴雨
  '318': '🌧️', // 大暴雨到特大暴雨
  '399': '🌧️', // 雨
  '400': '🌨️', // 小雪
  '401': '🌨️', // 中雪
  '402': '❄️', // 大雪
  '403': '❄️', // 暴雪
  '404': '🌨️', // 雨夹雪
  '405': '🌨️', // 雨雪天气
  '406': '🌨️', // 阵雨夹雪
  '407': '🌨️', // 阵雪
  '408': '🌨️', // 小到中雪
  '409': '❄️', // 中到大雪
  '410': '❄️', // 大到暴雪
  '499': '🌨️', // 雪
  '500': '🌫️', // 薄雾
  '501': '🌫️', // 雾
  '502': '😷', // 霾
  '503': '🌪️', // 扬沙
  '504': '🌪️', // 浮尘
  '507': '🌪️', // 沙尘暴
  '508': '🌪️', // 强沙尘暴
  '509': '🌫️', // 浓雾
  '510': '🌫️', // 强浓雾
  '511': '😷', // 中度霾
  '512': '😷', // 重度霾
  '513': '😷', // 严重霾
  '514': '🌫️', // 大雾
  '515': '🌫️', // 特强浓雾
  '900': '🔥', // 热
  '901': '❄️', // 冷
  '999': '🌡️', // 未知
};

// 获取天气数据
async function fetchWeatherData(location: string) {
  const apiKey = process.env.QWEATHER_API_KEY;
  const apiHost = process.env.QWEATHER_API_HOST;

  if (!apiKey || !apiHost) {
    throw new Error('API not configured');
  }

  const response = await fetch(
    `https://${apiHost}/v7/weather/now?location=${location}`,
    {
      headers: {
        'X-QW-Api-Key': apiKey,
      },
      signal: AbortSignal.timeout(5000),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== '200') {
    throw new Error(`API Error: ${data.code}`);
  }

  const now = data.now;
  return {
    temp: now.temp,
    text: now.text,
    icon: weatherIconMap[now.icon] || '🌡️',
    iconCode: now.icon,
    location: data.location?.name || '未知位置',
    feelsLike: now.feelsLike,
    humidity: now.humidity,
    windDir: now.windDir,
    windScale: now.windScale,
  };
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.QWEATHER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'QWEATHER_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || '101010100';

    // 检查缓存
    const cached = getWeatherCache(location);
    if (cached) {
      return NextResponse.json({
        success: true,
        ...cached,
        cached: true,
      });
    }

    // 每日调用次数限制（仅在未命中缓存时检查）
    const rateLimit = await checkAndIncrementRateLimit(150);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '今日API调用次数已达上限(150次)' },
        { status: 429 }
      );
    }

    // 获取天气数据
    const weatherData = await fetchWeatherData(location);

    // 存入缓存
    setWeatherCache(location, weatherData);

    return NextResponse.json({
      success: true,
      ...weatherData,
    });
  } catch (error) {
    console.error('[Weather API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch weather',
      },
      { status: 500 }
    );
  }
}
