import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return;
    }

    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => {
      setMatches(media.matches);
    };

    // Modern browsers
    if (media.addEventListener) {
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }
    // Fallback for older browsers (and some test environments)
    else if (media.addListener) {
        media.addListener(listener);
        return () => media.removeListener(listener);
    }
  }, [matches, query]);

  return matches;
}

export function useIsMobile(): boolean {
  // Matches Tailwind's 'md' breakpoint (768px).
  // If width < 768px, it is mobile.
  return useMediaQuery('(max-width: 767px)');
}

export function useIsLandscape(): boolean {
  return useMediaQuery('(orientation: landscape)');
}
