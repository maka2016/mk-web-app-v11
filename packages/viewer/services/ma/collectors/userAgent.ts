import UA from 'ua-parser-js';

export default function () {
  const ua = new UA(window.navigator.userAgent);
  const { browser, engine, os, device } = ua.getResult();
  return {
    UA: JSON.stringify({
      $vendor: device.vendor,
      $model: device.model,
      $os: os.name,
      $os_version: os.version,
      $engine: engine.name,
      $engine_version: engine.version,
      $browser: browser.name,
      $browser_version: browser.version,
    }),
  };
}
