import { PANEL_MAX_WIDTH, PANEL_MIN_WIDTH } from './constants';

export const LEFT_PANEL_WIDTH_STORAGE_KEY = 'tagme-segmentation-left-panel-width';
export const RIGHT_PANEL_WIDTH_STORAGE_KEY = 'tagme-segmentation-right-panel-width';

export function clampPanelWidth(width: number) {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, width));
}

export function getStoredPanelWidth(storageKey: string, fallbackWidth: number) {
  if (typeof window === 'undefined') {
    return clampPanelWidth(fallbackWidth);
  }

  try {
    const storedWidth = window.localStorage.getItem(storageKey);

    if (storedWidth === null) {
      return clampPanelWidth(fallbackWidth);
    }

    const parsedWidth = Number(storedWidth);

    if (!Number.isFinite(parsedWidth)) {
      return clampPanelWidth(fallbackWidth);
    }

    return clampPanelWidth(parsedWidth);
  } catch {
    return clampPanelWidth(fallbackWidth);
  }
}

export function savePanelWidth(storageKey: string, width: number) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, String(clampPanelWidth(width)));
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}
