import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthCookieValue, isPasswordValid } from '@/server/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = (body?.password || '').toString();

    if (!isPasswordValid(password)) {
      return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(AUTH_COOKIE_NAME, getAuthCookieValue(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ success: false, message: '请求格式错误' }, { status: 400 });
  }
}
