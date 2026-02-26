const LOCK_COUNT_ATTR = 'data-home-scroll-lock-count';
const PREV_OVERFLOW_ATTR = 'data-home-prev-overflow';
const PREV_OVERSCROLL_ATTR = 'data-home-prev-overscroll';

export const lockBodyScroll = () => {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const count = Number(body.getAttribute(LOCK_COUNT_ATTR) || '0');
  if (count <= 0) {
    body.setAttribute(PREV_OVERFLOW_ATTR, body.style.overflow || '');
    body.setAttribute(PREV_OVERSCROLL_ATTR, body.style.overscrollBehavior || '');
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
  }
  body.setAttribute(LOCK_COUNT_ATTR, String(count + 1));
};

export const unlockBodyScroll = () => {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const count = Number(body.getAttribute(LOCK_COUNT_ATTR) || '0');
  if (count <= 1) {
    body.style.overflow = body.getAttribute(PREV_OVERFLOW_ATTR) || '';
    body.style.overscrollBehavior = body.getAttribute(PREV_OVERSCROLL_ATTR) || '';
    body.removeAttribute(LOCK_COUNT_ATTR);
    body.removeAttribute(PREV_OVERFLOW_ATTR);
    body.removeAttribute(PREV_OVERSCROLL_ATTR);
    return;
  }
  body.setAttribute(LOCK_COUNT_ATTR, String(count - 1));
};
