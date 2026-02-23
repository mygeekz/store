// contexts/StyleContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type SidebarVariant = 'classic' | 'pill';
export type ThemeMode = 'light' | 'dark' | 'system';

export type StyleState = {
  theme: ThemeMode;

  /** 🎛️ پالت آماده برای حس «پولی» و یکپارچگی رنگ‌ها */
  palette: 'custom' | 'aurora' | 'ocean' | 'sunset';

  /** 🎨 رنگ برند (HSL) — با Tailwind به primary وصل شده */
  primaryHue: number;     // 0..360
  primaryS: number;       // 40..100 (%)
  primaryL: number;       // 30..70  (%)

  sidebarVariant: SidebarVariant;
  sidebarIconPx: number;       // 28..56
  sidebarPillWidthPx: number;  // 180..320
  showInkBar: boolean;
};

type Ctx = {
  style: StyleState;
  setStyle: <K extends keyof StyleState>(k: K, v: StyleState[K]) => void;
  setMany: (patch: Partial<StyleState>) => void;
  resetStyle: () => void;

  // هِلپرها
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  computeSidebarWidthPx: () => number;

  // میان‌بر تغییر سریع رنگ برند
  setBrand: (h: number, s?: number, l?: number) => void;
};

const DEFAULTS: StyleState = {
  theme: 'system',
  palette: 'aurora',
  primaryHue: 258,
  primaryS: 90,
  primaryL: 50,
  sidebarVariant: 'pill',
  sidebarIconPx: 40,
  sidebarPillWidthPx: 240,
  showInkBar: true,
};

const KEY = 'koroush.style.v1';
const StyleContext = createContext<Ctx | null>(null);

// ───────── Utilities
const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function readInitial(): StyleState {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<StyleState>) : {};
    const theme: ThemeMode =
      saved?.theme === 'light' || saved?.theme === 'dark' || saved?.theme === 'system'
        ? saved.theme
        : DEFAULTS.theme;

    const sidebarVariant: SidebarVariant =
      saved?.sidebarVariant === 'classic' || saved?.sidebarVariant === 'pill'
        ? saved.sidebarVariant
        : DEFAULTS.sidebarVariant;

    const palette: StyleState['palette'] =
      saved?.palette === 'aurora' || saved?.palette === 'ocean' || saved?.palette === 'sunset' || saved?.palette === 'custom'
        ? saved.palette
        : DEFAULTS.palette;

    return {
      theme,
      palette,
      sidebarVariant,
      showInkBar: saved?.showInkBar ?? DEFAULTS.showInkBar,

      // 🎨 برند
      primaryHue: clampInt(saved?.primaryHue ?? DEFAULTS.primaryHue, 0, 360, DEFAULTS.primaryHue),
      primaryS: clampInt(saved?.primaryS ?? DEFAULTS.primaryS, 40, 100, DEFAULTS.primaryS),
      primaryL: clampInt(saved?.primaryL ?? DEFAULTS.primaryL, 30, 70, DEFAULTS.primaryL),

      // اندازه‌ها
      sidebarIconPx: clampInt(saved?.sidebarIconPx ?? DEFAULTS.sidebarIconPx, 28, 56, DEFAULTS.sidebarIconPx),
      sidebarPillWidthPx: clampInt(
        saved?.sidebarPillWidthPx ?? DEFAULTS.sidebarPillWidthPx,
        180,
        320,
        DEFAULTS.sidebarPillWidthPx
      ),
    };
  } catch {
    return DEFAULTS;
  }
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

function applyPalette(palette: StyleState['palette']) {
  // این attribute در styles/themes.css هم استفاده می‌شود
  document.documentElement.setAttribute('data-palette', palette);
}

// ───────── Provider
export const StyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [style, setStyleState] = useState<StyleState>(readInitial);

  const setStyle = <K extends keyof StyleState>(k: K, v: StyleState[K]) => {
    setStyleState(prev => ({ ...prev, [k]: v }));
  };

  const setMany = (patch: Partial<StyleState>) => {
    setStyleState(prev => ({ ...prev, ...patch }));
  };

  const resetStyle = () => setStyleState(DEFAULTS);

  const setTheme = (t: ThemeMode) => setStyle('theme', t);
  const toggleTheme = () =>
    setStyle('theme', style.theme === 'light' ? 'dark' : style.theme === 'dark' ? 'system' : 'light');

  const setBrand = (h: number, s?: number, l?: number) => {
    setStyleState(prev => ({
      ...prev,
      palette: 'custom',
      primaryHue: clampInt(h, 0, 360, DEFAULTS.primaryHue),
      primaryS: clampInt(s ?? prev.primaryS, 40, 100, DEFAULTS.primaryS),
      primaryL: clampInt(l ?? prev.primaryL, 30, 70, DEFAULTS.primaryL),
    }));
  };

  // پایداری در localStorage
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(style));
  }, [style]);

  // اعمال تم + شنود تغییر تم سیستم در حالت system
  useEffect(() => {
    applyTheme(style.theme);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (style.theme === 'system') applyTheme('system');
    };
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, [style.theme]);

  useEffect(() => {
    applyPalette(style.palette);
  }, [style.palette]);

  // اعمال متغیرهای CSS سراسری (Tailwind به این‌ها وصل است)
  useEffect(() => {
    const root = document.documentElement;

    // 🎨 برند HSL
    const hue = clampInt(style.primaryHue, 0, 360, DEFAULTS.primaryHue);
    const s = clampInt(style.primaryS, 40, 100, DEFAULTS.primaryS);
    const l = clampInt(style.primaryL, 30, 70, DEFAULTS.primaryL);
    root.style.setProperty('--primary-h', String(hue));
    root.style.setProperty('--primary-s', `${s}%`);
    root.style.setProperty('--primary-l', `${l}%`);

    // ✅ نسخه عددی برای calc() در Tailwind و CSS
    root.style.setProperty('--primary-s-num', String(s));
    root.style.setProperty('--primary-l-num', String(l));

    // ✅ سازگاری با بخش‌هایی که از hsl(var(--primary)) استفاده می‌کنند
    root.style.setProperty('--primary', `${hue} ${s}% ${l}%`);

    // اندازه‌ها
    root.style.setProperty('--sidebar-icon', `${clampInt(style.sidebarIconPx, 28, 56, 40)}px`);
    root.style.setProperty('--sidebar-pill-w', `${clampInt(style.sidebarPillWidthPx, 180, 320, 240)}px`);

    // جوهری
    root.style.setProperty('--inkbar-opacity', style.showInkBar ? '1' : '0');
  }, [
    style.primaryHue,
    style.primaryS,
    style.primaryL,
    style.sidebarIconPx,
    style.sidebarPillWidthPx,
    style.showInkBar,
  ]);

  // عرض واقعی سایدبار برای لایه‌بندی
  const computeSidebarWidthPx = () =>
    style.sidebarVariant === 'pill'
      ? clampInt(style.sidebarPillWidthPx, 180, 320, DEFAULTS.sidebarPillWidthPx)
      : 288; // w-72

  const value = useMemo<Ctx>(
    () => ({
      style,
      setStyle,
      setMany,
      resetStyle,
      setTheme,
      toggleTheme,
      computeSidebarWidthPx,
      setBrand,
    }),
    [style]
  );

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
};

// ───────── Hooks
export const useStyleContext = () => {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error('useStyleContext must be used within StyleProvider');
  return ctx;
};

// alias سازگار با importهای قبلی
export const useStyle = useStyleContext;
