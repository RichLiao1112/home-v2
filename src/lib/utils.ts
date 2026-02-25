import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Card } from '@/types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const PRIVATE_HOST_PATTERN =
  /^(localhost$|127\.0\.0\.1$|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/;

export const isPrivateHost = (host: string) => PRIVATE_HOST_PATTERN.test(host);

export const getBestCardLink = (card: Card, host: string) => {
  if (!card.wanLink && !card.lanLink) return '';
  if (isPrivateHost(host)) return card.lanLink || card.wanLink || '';
  return card.wanLink || card.lanLink || '';
};
