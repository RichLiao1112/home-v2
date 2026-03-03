import { NextRequest, NextResponse } from 'next/server';

const PRIVATE_IP_PATTERNS = [
  /^127\./,                              // 127.0.0.0/8 - Loopback
  /^10\./,                               // 10.0.0.0/8 - Private
  /^172\.(1[6-9]|2\d|3[0-1])\./,        // 172.16.0.0/12 - Private
  /^192\.168\./,                         // 192.168.0.0/16 - Private
  /^169\.254\./,                         // 169.254.0.0/16 - Link-local
  /^::1$/,                               // ::1 - IPv6 loopback
  /^fc00:/i,                             // fc00::/7 - IPv6 unique local
  /^fe80:/i,                             // fe80::/10 - IPv6 link-local
];

function isPrivateIP(ip: string): boolean {
  // 移除 IPv6 的方括号
  const cleanIP = ip.replace(/^\[|\]$/g, '');
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(cleanIP));
}

function getClientIP(request: NextRequest): string {
  // 按优先级检查各种可能的 header
  const headers = [
    'x-forwarded-for',      // 标准反向代理 header
    'x-real-ip',            // Nginx x-real-ip
    'cf-connecting-ip',     // Cloudflare
    'true-client-ip',       // Akamai
    'x-client-ip',          // 其他代理
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for 可能包含多个 IP，取第一个
      const ip = value.split(',')[0].trim();
      if (ip) return ip;
    }
  }

  // 最后尝试从 socket 获取（仅在 Node.js 环境有效）
  // @ts-ignore - NextRequest 的 socket 属性
  const socket = request.socket;
  if (socket?.remoteAddress) {
    return socket.remoteAddress;
  }

  // 默认返回未知
  return 'unknown';
}

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  const isPrivate = isPrivateIP(clientIP);

  return NextResponse.json({
    clientIP,
    isPrivate,
    networkType: isPrivate ? 'lan' : 'wan',
    timestamp: Date.now(),
  });
}
