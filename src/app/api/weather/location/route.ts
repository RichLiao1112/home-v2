import { NextRequest, NextResponse } from 'next/server';
import { readAppData, writeAppData } from '@/server/data-store';
import { checkAndIncrementRateLimit } from '@/server/qweather-rate-limit';

// GET: 获取保存的位置列表 或 搜索城市
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const profileKey = searchParams.get('profileKey') || undefined;

    // 如果有 city 参数，搜索城市
    if (city) {
      const apiKey = process.env.QWEATHER_API_KEY;
      const apiHost = process.env.QWEATHER_API_HOST;

      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'QWEATHER_API_KEY not configured' },
          { status: 500 }
        );
      }

      if (!apiHost) {
        return NextResponse.json(
          { success: false, error: 'QWEATHER_API_HOST not configured' },
          { status: 500 }
        );
      }

      // 每日调用次数限制
      const rateLimit = await checkAndIncrementRateLimit(150);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { success: false, error: '今日API调用次数已达上限(150次)' },
          { status: 429 }
        );
      }

      // 调用和风天气城市搜索 API
      let response;
      try {
        response = await fetch(
          `https://${apiHost}/geo/v2/city/lookup?location=${encodeURIComponent(city)}`,
          {
            headers: {
              'X-QW-Api-Key': apiKey,
            },
            signal: AbortSignal.timeout(5000),
          }
        );
      } catch (fetchError) {
        const err = fetchError as Error;
        if (err.message.includes('TLS') || err.message.includes('certificate')) {
          return NextResponse.json(
            { success: false, error: 'API Host配置错误，请检查QWEATHER_API_HOST是否正确' },
            { status: 500 }
          );
        }
        throw fetchError;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== '200') {
        throw new Error(`API Error: ${data.code}`);
      }

      // 映射字段名：API返回id，前端需要adcode
      const locations = (data.location || []).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        adcode: loc.id,
        lat: loc.lat,
        lon: loc.lon,
        country: loc.country || '',
        province: loc.adm1 || '',
        city: loc.adm2 || '',
      }));

      return NextResponse.json({
        success: true,
        locations,
      });
    }

    // 没有 city 参数，获取保存的位置列表
    const currentData = await readAppData(profileKey);
    const weatherLocations = currentData.data.weatherLocations || [];

    return NextResponse.json({
      success: true,
      locations: weatherLocations,
    });
  } catch (error) {
    console.error('[Weather Location API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search location',
      },
      { status: 500 }
    );
  }
}

// POST: 保存位置到历史
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, profileKey } = body;

    if (!location || !location.id) {
      return NextResponse.json(
        { success: false, error: 'location is required' },
        { status: 400 }
      );
    }

    const currentData = await readAppData(profileKey);
    const weatherLocations = currentData.data.weatherLocations || [];

    // 检查是否已存在
    const exists = weatherLocations.some(loc => loc.id === location.id);
    if (!exists) {
      weatherLocations.unshift({
        id: location.id,
        name: location.name,
        adcode: location.id,
        lat: location.lat,
        lon: location.lon,
        country: location.country || '',
        province: location.adm1 || '',
        city: location.adm2 || '',
      });
      // 最多保存 10 个
      if (weatherLocations.length > 10) {
        weatherLocations.pop();
      }
      await writeAppData(currentData.key, {
        ...currentData.data,
        weatherLocations,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      locations: weatherLocations,
    });
  } catch (error) {
    console.error('[Weather Location Save API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save location',
      },
      { status: 500 }
    );
  }
}

// DELETE: 删除保存的位置
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('id');
    const profileKey = searchParams.get('profileKey') || undefined;

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'location id is required' },
        { status: 400 }
      );
    }

    const currentData = await readAppData(profileKey);
    const weatherLocations = (currentData.data.weatherLocations || []).filter(
      loc => loc.id !== locationId
    );

    await writeAppData(currentData.key, {
      ...currentData.data,
      weatherLocations,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      locations: weatherLocations,
    });
  } catch (error) {
    console.error('[Weather Location Delete API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete location',
      },
      { status: 500 }
    );
  }
}
