import { useEffect, useState } from 'react';

export type DeviceFormFactor = 'phone' | 'tablet' | 'desktop';

export interface DetectedDeviceInfo {
  formFactor: DeviceFormFactor;
  os: string;
  model: string | null;
  deviceLabel: string;
  runtimeMode: 'App' | 'Web';
  inputMode: 'Touch' | 'Keyboard';
  displayLabel: string;
  detailsTooltip: string;
}

interface NavigatorUAData {
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{
    model?: string;
    platform?: string;
    platformVersion?: string;
  }>;
}

function checkAppMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function cleanModelName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw
    .replace(/\bBuild\/.*$/i, '')
    .replace(/\bwv\b/gi, '')
    .trim();
  if (!trimmed || trimmed.length < 2) return null;
  const upper = trimmed.toUpperCase();
  if (
    upper === 'K' ||
    upper === 'LINUX' ||
    upper === 'ANDROID' ||
    upper === 'MOBILE' ||
    upper === 'U' ||
    upper === 'ARM64' ||
    upper === 'X86_64'
  ) {
    return null;
  }
  return trimmed.slice(0, 24);
}

function detectSyncDeviceInfo(highEntropyModel: string | null = null): DetectedDeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      formFactor: 'desktop',
      os: 'Unknown',
      model: null,
      deviceLabel: 'Desktop',
      runtimeMode: 'Web',
      inputMode: 'Keyboard',
      displayLabel: 'Desktop · Web',
      detailsTooltip: 'Desktop Web Session',
    };
  }

  const ua = navigator.userAgent || '';
  const uaLower = ua.toLowerCase();
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  const platform = (uaData?.platform || navigator.platform || '').toLowerCase();
  const maxTouch = navigator.maxTouchPoints || 0;
  const isTouch =
    window.matchMedia?.('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    maxTouch > 0;
  const minScreenDim = Math.min(window.screen?.width || window.innerWidth, window.screen?.height || window.innerHeight);
  const runtimeMode: 'App' | 'Web' = checkAppMode() ? 'App' : 'Web';
  const inputMode: 'Touch' | 'Keyboard' = isTouch ? 'Touch' : 'Keyboard';

  let os = 'Unknown';
  let formFactor: DeviceFormFactor = 'desktop';
  let deviceLabel = 'Desktop PC';
  let model = cleanModelName(highEntropyModel);

  const isIPad =
    /ipad/.test(uaLower) || (platform.includes('mac') && maxTouch > 1);
  const isIPhone = /iphone/.test(uaLower);
  const isIPod = /ipod/.test(uaLower);
  const isAndroid = /android/.test(uaLower) || platform.includes('android');

  if (isIPhone) {
    os = 'iOS';
    formFactor = 'phone';
    deviceLabel = 'iPhone';
  } else if (isIPad) {
    os = 'iPadOS';
    formFactor = 'tablet';
    deviceLabel = 'iPad';
  } else if (isIPod) {
    os = 'iOS';
    formFactor = 'phone';
    deviceLabel = 'iPod Touch';
  } else if (isAndroid) {
    os = 'Android';
    if (!model) {
      const androidMatch = ua.match(/Android\s+[^;)]+;\s*([^;)]+?)(?:\s+Build\/|;|\))/i);
      model = cleanModelName(androidMatch?.[1]);
    }
    const uaHintsMobile = uaData?.mobile;
    const isTablet =
      uaHintsMobile === false ||
      (!/mobile/.test(uaLower) && minScreenDim >= 600) ||
      minScreenDim >= 720;
    formFactor = isTablet ? 'tablet' : 'phone';
    deviceLabel = isTablet ? 'Android Tablet' : 'Android Phone';
  } else if (/cros/.test(uaLower) || platform.includes('chrome os')) {
    os = 'ChromeOS';
    formFactor = isTouch && minScreenDim < 900 ? 'tablet' : 'desktop';
    deviceLabel = 'Chromebook';
  } else if (/win/.test(platform) || /windows/.test(uaLower)) {
    os = 'Windows';
    formFactor = isTouch && minScreenDim < 768 ? 'tablet' : 'desktop';
    deviceLabel = formFactor === 'tablet' ? 'Windows Tablet' : 'Windows PC';
  } else if (/mac/.test(platform) || /macintosh|mac os x/.test(uaLower)) {
    os = 'macOS';
    formFactor = 'desktop';
    deviceLabel = 'Mac';
  } else if (/linux/.test(platform) || /linux/.test(uaLower)) {
    os = 'Linux';
    formFactor = 'desktop';
    deviceLabel = 'Linux PC';
  } else if (isTouch) {
    formFactor = minScreenDim >= 650 ? 'tablet' : 'phone';
    deviceLabel = formFactor === 'tablet' ? 'Tablet' : 'Mobile Phone';
  }

  const parts = [deviceLabel];
  if (model && !deviceLabel.toLowerCase().includes(model.toLowerCase())) {
    parts.push(model);
  }
  parts.push(runtimeMode);

  const displayLabel = parts.join(' · ');
  const screenInfo = `${window.innerWidth}x${window.innerHeight}`;
  const detailsTooltip = `${deviceLabel}${model ? ` (${model})` : ''} · ${os} · ${inputMode} · ${runtimeMode} · ${screenInfo}`;

  return {
    formFactor,
    os,
    model,
    deviceLabel,
    runtimeMode,
    inputMode,
    displayLabel,
    detailsTooltip,
  };
}

export function useDeviceInfo(): DetectedDeviceInfo {
  const [modelHint, setModelHint] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DetectedDeviceInfo>(() => detectSyncDeviceInfo(null));

  useEffect(() => {
    let active = true;
    const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
    if (uaData?.getHighEntropyValues) {
      uaData
        .getHighEntropyValues(['model', 'platform'])
        .then((values) => {
          if (!active) return;
          const cleaned = cleanModelName(values.model);
          if (cleaned) {
            setModelHint(cleaned);
            setDeviceInfo(detectSyncDeviceInfo(cleaned));
          }
        })
        .catch(() => {});
    }

    const refresh = () => setDeviceInfo(detectSyncDeviceInfo(modelHint));
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    const mqStandalone = window.matchMedia?.('(display-mode: standalone)');
    const mqFullscreen = window.matchMedia?.('(display-mode: fullscreen)');
    mqStandalone?.addEventListener?.('change', refresh);
    mqFullscreen?.addEventListener?.('change', refresh);

    return () => {
      active = false;
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      mqStandalone?.removeEventListener?.('change', refresh);
      mqFullscreen?.removeEventListener?.('change', refresh);
    };
  }, [modelHint]);

  return deviceInfo;
}
