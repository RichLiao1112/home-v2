import { NextRequest, NextResponse } from 'next/server';

// 天气图标映射
const weatherIconMap: Record<string, string> = {
  '100': '☀️', '101': '🌤️', '102': '⛅', '103': '🌥️', '104': '☁️',
  '150': '🌙', '151': '🌤️', '152': '☁️', '300': '🌦️', '301': '⛈️',
  '302': '⚡', '303': '⛈️', '304': '🌨️', '305': '🌧️', '306': '🌧️',
  '307': '🌧️', '308': '🌧️', '309': '🌦️', '310': '🌧️', '311': '🌧️',
  '312': '🌧️', '313': '🌨️', '314': '🌧️', '315': '🌧️', '316': '🌧️',
  '317': '🌧️', '318': '🌧️', '399': '🌧️', '400': '🌨️', '401': '🌨️',
  '402': '❄️', '403': '❄️', '404': '🌨️', '405': '🌨️', '406': '🌨️',
  '407': '🌨️', '408': '🌨️', '409': '❄️', '410': '❄️', '499': '🌨️',
  '500': '🌫️', '501': '🌫️', '502': '😷', '503': '🌪️', '504': '🌪️',
  '507': '🌪️', '508': '🌪️', '509': '🌫️', '510': '🌫️', '511': '😷',
  '512': '😷', '513': '😷', '514': '🌫️', '515': '🌫️', '900': '🔥',
  '901': '❄️', '999': '🌡️',
};

// 缓存
const weatherCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10分钟

function getWeatherCache(location: string) {
  const cached = weatherCache.get(location);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setWeatherCache(location: string, data: any) {
  weatherCache.set(location, { data, timestamp: Date.now() });
}

// 获取天气数据
async function fetchWeatherData(location: string) {
  const apiKey = process.env.QWEATHER_API_KEY;
  const apiHost = process.env.QWEATHER_API_HOST || 'api.qweather.com';

  if (!apiKey) {
    throw new Error('API not configured');
  }

  const response = await fetch(`https://${apiHost}/v7/weather/now?location=${location}`, {
    headers: { 'X-QW-Api-Key': apiKey },
    signal: AbortSignal.timeout(5000),
  });

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
    location: data.location?.name || '未知位置',
    feelsLike: now.feelsLike,
    humidity: now.humidity,
    windDir: now.windDir,
    windScale: now.windScale,
  };
}

// 搜索城市
async function searchCity(query: string) {
  const apiKey = process.env.QWEATHER_API_KEY;
  const apiHost = process.env.QWEATHER_API_HOST || 'api.qweather.com';

  if (!apiKey) {
    throw new Error('API not configured');
  }

  const response = await fetch(`https://${apiHost}/v2/city/lookup?location=${encodeURIComponent(query)}&number=10`, {
    headers: { 'X-QW-Api-Key': apiKey },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== '200') {
    throw new Error(`API Error: ${data.code}`);
  }

  return data.city || [];
}

// MCP 工具定义
const tools = [
  {
    name: 'get_weather',
    description: '获取指定城市的实时天气信息',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: '城市名称或和风天气位置ID（如北京、101010100）',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'search_city',
    description: '搜索城市位置，获取位置ID用于查询天气',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '城市名称关键词（如"北京"、"Shanghai"）',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_weather_status',
    description: '检查天气API是否已配置',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// MCP 工具处理函数
async function handleTool(name: string, args: any) {
  switch (name) {
    case 'get_weather': {
      const location = args.location || '101010100';
      const cached = getWeatherCache(location);
      if (cached) {
        return { content: [{ type: 'text', text: JSON.stringify({ ...cached, cached: true }, null, 2) }] };
      }
      const data = await fetchWeatherData(location);
      setWeatherCache(location, data);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, ...data }, null, 2) }] };
    }
    case 'search_city': {
      const results = await searchCity(args.query);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, locations: results }, null, 2) }] };
    }
    case 'get_weather_status': {
      const apiKey = process.env.QWEATHER_API_KEY;
      return { content: [{ type: 'text', text: JSON.stringify({ configured: !!apiKey && apiKey.trim() !== '' }, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// GET 返回 MCP 服务信息
// MCP 协议处理（无需登录认证）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, params } = body;

    if (method === 'tools/list') {
      // 返回工具列表
      return NextResponse.json({
        tools,
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const result = await handleTool(name, args);
      return NextResponse.json({
        content: result.content,
      });
    }

    return NextResponse.json({ error: 'Unknown method' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }] },
      { status: 500 }
    );
  }
}

