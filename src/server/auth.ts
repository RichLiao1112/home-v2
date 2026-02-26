import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = 'home_v2_auth';
const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const getPassword = () => process.env.LOGIN_PASSWORD || 'admin123';
const getSecret = () => {
  if (process.env.AUTH_SECRET?.trim()) return process.env.AUTH_SECRET.trim();
  // Fallback keeps compatibility, but production should set AUTH_SECRET explicitly.
  return createHash('sha256').update(`home-v2:${getPassword()}`).digest('hex');
};

const getSessionMaxAgeSeconds = () => {
  const value = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS || DEFAULT_SESSION_MAX_AGE_SECONDS);
  if (!Number.isFinite(value)) return DEFAULT_SESSION_MAX_AGE_SECONDS;
  return Math.min(Math.max(Math.floor(value), 300), 60 * 60 * 24 * 30);
};

const sha256 = (value: string) => createHash('sha256').update(value).digest();

const safeEqualHex = (leftHex: string, rightHex: string) => {
  const left = Buffer.from(leftHex, 'hex');
  const right = Buffer.from(rightHex, 'hex');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const sign = (payload: string) => {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
};

const getPasswordFingerprint = () => {
  return createHash('sha256').update(getPassword()).digest('hex');
};

export const getAuthCookieValue = () => {
  const exp = Math.floor(Date.now() / 1000) + getSessionMaxAgeSeconds();
  const payload = `${exp}.${getPasswordFingerprint()}`;
  const sig = sign(payload);
  return `${exp}.${sig}`;
};

export const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: getSessionMaxAgeSeconds(),
});

export const isPasswordValid = (password: string) => {
  const actual = sha256(getPassword());
  const input = sha256(password || '');
  return timingSafeEqual(actual, input);
};

export const isAuthorizedRequest = (req: NextRequest) => {
  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookie) return false;
  const [expStr, sig] = cookie.split('.');
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;
  if (exp <= Math.floor(Date.now() / 1000)) return false;
  const expectedSig = sign(`${exp}.${getPasswordFingerprint()}`);
  return safeEqualHex(sig, expectedSig);
};
