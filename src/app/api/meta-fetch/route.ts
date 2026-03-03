import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

interface SiteMetadata {
  title: string;
  description: string;
  favicon?: string;
  url: string;
  success: boolean;
  error?: string;
}

// 自定义 Agent：忽略 HTTPS 证书错误（用于内网自签名证书）
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // 忽略 SSL 证书错误
  keepAlive: true,
});

const httpAgent = new http.Agent({
  keepAlive: true,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // 验证 URL 格式
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const targetUrl = parsedUrl.toString();
    const isHttps = targetUrl.startsWith('https://');

    console.log('[meta-fetch] Fetching:', targetUrl);

    // 使用 Node.js fetch API 获取网页内容，带自定义 Agent
    const response = await fetch(targetUrl, {
      method: 'GET',
      // @ts-ignore - Node.js 扩展选项
      agent: isHttps ? httpsAgent : httpAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
      },
      signal: AbortSignal.timeout(10000), // 10 秒超时
      redirect: 'follow', // 自动跟随重定向
    });

    if (!response.ok) {
      console.error('[meta-fetch] HTTP error:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: 500 }
      );
    }

    const html = await response.text();
    console.log('[meta-fetch] Success, HTML length:', html.length);

    // 解析 HTML 提取元数据
    const metadata = parseMetadata(html, targetUrl);

    return NextResponse.json({
      success: true,
      ...metadata,
    });
  } catch (error) {
    console.error('[meta-fetch] Error:', error instanceof Error ? error.message : error);
    
    // 更详细的错误分类
    let errorMessage = 'Failed to fetch metadata';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = '请求超时 (10 秒)';
      } else if (error.message.includes('certificate')) {
        errorMessage = 'SSL 证书错误';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'DNS 解析失败';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '连接被拒绝';
      } else if (error.message.includes('ETIMEDOUT')) {
        errorMessage = '连接超时';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

function parseMetadata(html: string, baseUrl: string): Omit<SiteMetadata, 'success' | 'error'> {
  let title = '';
  let description = '';
  let favicon = '';

  // 提取 title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // 提取 meta description
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
                   html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  // 提取 Open Graph title 和 description（如果有）
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i);
  if (ogTitleMatch && !title) {
    title = ogTitleMatch[1].trim();
  }

  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
                     html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i);
  if (ogDescMatch && !description) {
    description = ogDescMatch[1].trim();
  }

  // 提取 favicon
  const iconMatch = html.match(/<link[^>]+rel=["'](icon|shortcut icon|apple-touch-icon)[^>]+href=["']([^"']+)["'][^>]*>/i) ||
                   html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](icon|shortcut icon|apple-touch-icon)[^>]*>/i);
  
  if (iconMatch) {
    const iconPath = iconMatch[2];
    // 将相对路径转换为绝对路径
    favicon = new URL(iconPath, baseUrl).href;
  } else {
    // 默认 favicon 路径
    const baseUrlObj = new URL(baseUrl);
    favicon = `${baseUrlObj.protocol}//${baseUrlObj.hostname}/favicon.ico`;
  }

  // 清理和截断
  title = truncate(title, 100);
  description = truncate(description, 200);

  return {
    title,
    description,
    favicon,
    url: baseUrl,
  };
}

function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str || '';
  return str.substring(0, maxLength).trim() + '...';
}
