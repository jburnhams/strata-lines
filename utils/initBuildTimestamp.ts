const PLACEHOLDER = '__BUILD_TIMESTAMP__';
const BADGE_SELECTOR = '[data-build-timestamp]';
const FALLBACK_TEXT = 'Build: unavailable';

const formatTimestamp = (rawValue: string): string | null => {
  if (!rawValue || rawValue === PLACEHOLDER) {
    return null;
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return `Build: ${formatter.format(parsedDate)}`;
  } catch (error) {
    console.warn('Failed to format build timestamp', error);
    return null;
  }
};

const updateBadges = () => {
  const badges = document.querySelectorAll<HTMLElement>(BADGE_SELECTOR);
  if (badges.length === 0) {
    return;
  }

  badges.forEach((badge) => {
    const formatted = formatTimestamp(badge.dataset.buildTimestamp ?? '');
    if (formatted) {
      badge.textContent = formatted;
      badge.setAttribute('title', formatted);
    } else {
      badge.textContent = FALLBACK_TEXT;
      badge.setAttribute('title', FALLBACK_TEXT);
    }
  });
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateBadges, { once: true });
  } else {
    updateBadges();
  }
}

export {};
