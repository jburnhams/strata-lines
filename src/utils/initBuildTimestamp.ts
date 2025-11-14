const BADGE_SELECTOR = '[data-build-timestamp]';

const formatTimestamp = (rawValue: string): string | null => {
  if (!rawValue) {
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
    if (!formatted) {
      return;
    }

    badge.textContent = formatted;
    badge.setAttribute('title', formatted);
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
