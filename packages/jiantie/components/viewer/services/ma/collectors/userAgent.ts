export default function userAgent() {
  const nav = window.navigator as any;
  const uaString: string = nav.userAgent || '';
  const uaData = nav.userAgentData || {};

  const { browser, browserVersion } = parseBrowser(uaString, uaData);
  const { os, osVersion, model } = parseOSAndModel(uaString, uaData);
  const { engine, engineVersion } = inferEngine(uaString, browser);

  return {
    UA: JSON.stringify({
      $vendor: undefined,
      $model: model,
      $os: os,
      $os_version: osVersion,
      $engine: engine,
      $engine_version: engineVersion,
      $browser: browser,
      $browser_version: browserVersion,
    }),
  };
}

function parseBrowser(
  ua: string,
  uaData: any
): { browser?: string; browserVersion?: string } {
  // Try client hints first
  if (uaData && Array.isArray(uaData.brands) && uaData.brands.length) {
    const brand =
      uaData.brands.find((b: any) => !/Not.?A.?Brand/i.test(b.brand)) ||
      uaData.brands[0];
    return { browser: brand?.brand, browserVersion: brand?.version };
  }

  // Fallback regex
  const edge = ua.match(/Edg\/(\d+\.\d+\.\d+\.\d+|\d+\.\d+)/);
  if (edge) return { browser: 'Edge', browserVersion: edge[1] };
  const chrome = ua.match(/Chrome\/(\d+\.\d+\.\d+\.\d+|\d+\.\d+)/);
  if (chrome && !ua.includes('Chromium'))
    return { browser: 'Chrome', browserVersion: chrome[1] };
  const firefox = ua.match(/Firefox\/(\d+\.\d+)/);
  if (firefox) return { browser: 'Firefox', browserVersion: firefox[1] };
  const safari = ua.match(/Version\/(\d+\.\d+(?:\.\d+)?)\s+Safari\//);
  if (safari && ua.includes('Safari') && !ua.includes('Chrome'))
    return { browser: 'Safari', browserVersion: safari[1] };
  return {};
}

function parseOSAndModel(
  ua: string,
  uaData: any
): { os?: string; osVersion?: string; model?: string } {
  // Try client hints
  const model = uaData?.model || undefined;
  const platform = uaData?.platform || '';
  if (platform) {
    // Version not available synchronously via client hints; fallback to UA string
  }

  // iOS
  const iOS = ua.match(/(iPhone|iPad|iPod).*?OS\s(\d+[._]\d+(?:[._]\d+)?)/i);
  if (iOS)
    return {
      os: 'iOS',
      osVersion: iOS[2].replace(/_/g, '.'),
      model: model || iOS[1],
    };
  // Android
  const android = ua.match(/Android\s(\d+(?:\.\d+){0,2})/i);
  if (android) {
    const androidModel = ua.match(/;\s*([^;\)]+)\s+Build\//);
    return {
      os: 'Android',
      osVersion: android[1],
      model: model || (androidModel ? androidModel[1] : undefined),
    };
  }
  // macOS
  const mac = ua.match(/Mac OS X\s(\d+[._]\d+(?:[._]\d+)?)/);
  if (mac) return { os: 'macOS', osVersion: mac[1].replace(/_/g, '.'), model };
  // Windows
  const win = ua.match(/Windows NT\s(\d+\.\d+)/);
  if (win) return { os: 'Windows', osVersion: win[1], model };
  // Linux or others
  if (/Linux/i.test(ua)) return { os: 'Linux', osVersion: undefined, model };
  return { os: platform || undefined, osVersion: undefined, model };
}

function inferEngine(
  ua: string,
  browser?: string
): { engine?: string; engineVersion?: string } {
  if (browser === 'Firefox') {
    const gecko = ua.match(/Gecko\/(\d+)/);
    return { engine: 'Gecko', engineVersion: gecko ? gecko[1] : undefined };
  }
  if (browser === 'Safari') {
    const wk = ua.match(/AppleWebKit\/(\d+\.\d+(?:\.\d+)?)/);
    return { engine: 'WebKit', engineVersion: wk ? wk[1] : undefined };
  }
  if (browser === 'Chrome' || browser === 'Edge') {
    const wk = ua.match(/AppleWebKit\/(\d+\.\d+(?:\.\d+)?)/);
    return { engine: 'Blink', engineVersion: wk ? wk[1] : undefined };
  }
  // Fallback guesses
  if (/AppleWebKit/i.test(ua)) {
    const wk = ua.match(/AppleWebKit\/(\d+\.\d+(?:\.\d+)?)/);
    return { engine: 'WebKit', engineVersion: wk ? wk[1] : undefined };
  }
  if (/Gecko\//i.test(ua)) {
    const gecko = ua.match(/Gecko\/(\d+)/);
    return { engine: 'Gecko', engineVersion: gecko ? gecko[1] : undefined };
  }
  return {};
}
