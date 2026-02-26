import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/server/auth';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE_NAME, '', { ...getAuthCookieOptions(), maxAge: 0, expires: new Date(0) });
  return res;
}
