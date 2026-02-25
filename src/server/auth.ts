import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = 'home_v2_auth';

const getPassword = () => process.env.LOGIN_PASSWORD || 'admin123';

const buildToken = () => {
  return createHash('sha256').update(getPassword()).digest('hex');
};

export const isPasswordValid = (password: string) => {
  return password === getPassword();
};

export const getAuthCookieValue = () => {
  return buildToken();
};

export const isAuthorizedRequest = (req: NextRequest) => {
  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  return cookie === buildToken();
};
