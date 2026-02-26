import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthCookieOptions, getAuthCookieValue, isPasswordValid } from '@/server/auth';

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const RETRY_DELAY_MS = 220;

const attempts = new Map<string, number[]>();

const getClientId = (req: NextRequest) => {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || 'unknown-ip';
  const ua = (req.headers.get('user-agent') || 'unknown-ua').slice(0, 120);
  return `${ip}:${ua}`;
};

const pruneAttempts = (timestamps: number[], now: number) => {
  return timestamps.filter(time => now - time < LOGIN_WINDOW_MS);
};

const isClientRateLimited = (clientId: string, now: number) => {
  const recent = pruneAttempts(attempts.get(clientId) || [], now);
  attempts.set(clientId, recent);
  return recent.length >= MAX_LOGIN_ATTEMPTS;
};

const registerFailure = (clientId: string, now: number) => {
  const recent = pruneAttempts(attempts.get(clientId) || [], now);
  recent.push(now);
  attempts.set(clientId, recent);
};

const clearFailures = (clientId: string) => {
  attempts.delete(clientId);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  const now = Date.now();
  const clientId = getClientId(req);
  if (isClientRateLimited(clientId, now)) {
    return NextResponse.json({ success: false, message: '尝试次数过多，请稍后再试' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const password = (body?.password || '').toString();
    if (password.length > 256) {
      return NextResponse.json({ success: false, message: '请求格式错误' }, { status: 400 });
    }

    if (!isPasswordValid(password)) {
      registerFailure(clientId, now);
      await sleep(RETRY_DELAY_MS);
      return NextResponse.json({ success: false, message: '账号或密码错误' }, { status: 401 });
    }

    clearFailures(clientId);
    const res = NextResponse.json({ success: true });
    res.cookies.set(AUTH_COOKIE_NAME, getAuthCookieValue(), getAuthCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ success: false, message: '请求格式错误' }, { status: 400 });
  }
}
