'use client';

import APPBridge from '@/store/app-bridge';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type FeatureFlags = Record<string, boolean>;

type LogEntry = {
  id: string;
  label: string;
  payload?: unknown;
  time: string;
};

function formatTime(date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export default function BridgeTest() {
  const [runtime, setRuntime] = useState<string | false>(false);
  const [inApp, setInApp] = useState<boolean>(false);
  const [features, setFeatures] = useState<FeatureFlags>({});
  const [navUrl, setNavUrl] = useState<string>(
    'maka://home/works/worksActivity'
  );
  const [webUrl, setWebUrl] = useState<string>('https://www.maka.im/');
  const [browserUrl, setBrowserUrl] = useState<string>('https://www.maka.im');
  const [disableBackButton, setDisableBackButton] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef<number>(0);

  const addLog = useCallback((label: string, payload?: unknown) => {
    logIdRef.current += 1;
    setLogs(prev => [
      {
        id: String(logIdRef.current),
        label,
        payload,
        time: formatTime(),
      },
      ...prev,
    ]);
  }, []);

  const detectRuntime = useCallback(() => {
    const r = APPBridge.getRuntime();
    setRuntime(r);
    const isInApp = APPBridge.judgeIsInApp();
    setInApp(!!isInApp);
    addLog('Detect runtime', { runtime: r, inApp: isInApp });
  }, [addLog]);

  const initBridge = useCallback(async () => {
    const ok = await APPBridge.init();
    addLog('Init bridge', { ok });
  }, [addLog]);

  const getUserInfo = useCallback(async () => {
    const res = await APPBridge.appCall(
      { type: 'MKUserInfo', params: {}, jsCbFnName: 'bridgeUserInfoCb' },
      data => addLog('UserInfo callback', data),
      2000
    );
    addLog('UserInfo invoke result', res);
  }, [addLog]);

  const getDeviceInfo = useCallback(async () => {
    const res = await APPBridge.appCall(
      { type: 'MKDeviceInfo' as any, params: {}, jsCbFnName: 'MKDeviceInfo' },
      data => addLog('UserInfo callback', data),
      2000
    );
    addLog('MKDeviceInfo invoke result', res);
  }, [addLog]);

  const openWeb = useCallback(async () => {
    const res = await APPBridge.navToPage({ type: 'URL', url: webUrl });
    addLog('Open web url', { url: webUrl, res });
  }, [addLog, webUrl]);

  const openVipModal = useCallback(async () => {
    addLog('打开 vip modal');

    const res = await APPBridge.appCall(
      {
        type: 'MKAPPModal',
        jsCbFnName: 'MKAPPModal',
        params: {
          url: `http://${window.location.host}/mobile/vip-popup?appid=jiantie`,
          height: 570,
          closeable: true,
        },
      },
      data => {
        console.log('Vip modal callback', data);
        addLog('关闭 modal callback', data);
      },
      60000
    );
  }, [addLog]);

  const openBrowser = useCallback(async () => {
    if (!browserUrl) {
      addLog('MKOpenBrowser 失败', { msg: 'URL参数不能为空' });
      return;
    }

    addLog('调用 MKOpenBrowser', { url: browserUrl });

    const res = await APPBridge.appCall(
      {
        type: 'MKOpenBrowser' as any,
        jsCbFnName: 'MKOpenBrowser',
        params: {
          url: browserUrl,
        },
      },
      data => {
        if (data?.success) {
          addLog('MKOpenBrowser 成功', data);
        } else {
          addLog('MKOpenBrowser 失败', data);
        }
      },
      5000
    );
    addLog('MKOpenBrowser invoke result', res);
  }, [addLog, browserUrl]);

  const toggleBackButton = useCallback(
    async (disable: boolean) => {
      addLog('调用 MKDisableBackButton', { disable });

      const res = await APPBridge.appCall(
        {
          type: 'MKDisableBackButton' as any,
          jsCbFnName: 'MKDisableBackButton',
          params: {
            disable: disable,
          },
        },
        data => {
          if (data?.success) {
            setDisableBackButton(data.disable ?? disable);
            addLog('MKDisableBackButton 成功', data);
          } else {
            addLog('MKDisableBackButton 失败', data);
          }
        },
        2000
      );
      addLog('MKDisableBackButton invoke result', res);
    },
    [addLog]
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  // 注册 APPBackCall 事件监听
  useEffect(() => {
    const WINDOW = window as any;
    const handleAppBackCall = (data: any) => {
      let params = data;
      if (typeof data === 'string') {
        try {
          params = JSON.parse(data);
        } catch {
          params = { raw: data };
        }
      }
      addLog('APPBackCall 事件触发', params);
    };

    // 注册全局回调函数
    WINDOW.APPBackCall = handleAppBackCall;
    addLog('已注册 APPBackCall 事件监听', {});

    // 清理函数
    return () => {
      if (WINDOW.APPBackCall === handleAppBackCall) {
        WINDOW.APPBackCall = null;
      }
    };
  }, [addLog]);

  const featuresList = useMemo(() => Object.entries(features), [features]);

  return (
    <div className='p-4 space-y-4'>
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold'>App Bridge Test</h2>
        <p className='text-xs text-gray-500'>验证 @/app-bridge 的常用能力</p>
      </div>

      <section className='space-y-2'>
        <label className='text-sm font-medium'>打开外部浏览器</label>
        <div className='flex gap-2'>
          <input
            value={browserUrl}
            onChange={e => setBrowserUrl(e.target.value)}
            className='flex-1 px-3 py-2 border rounded'
            placeholder='https://www.maka.im'
          />
          <button
            className='px-3 py-2 rounded bg-purple-600 text-white'
            onClick={openBrowser}
          >
            打开浏览器
          </button>
        </div>
      </section>

      <section className='space-y-2'>
        <label className='text-sm font-medium'>物理返回按钮控制</label>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-gray-600'>
            当前状态：{disableBackButton ? '已禁用' : '已启用'}
          </span>
          <div className='flex gap-2'>
            <button
              className={`px-3 py-2 rounded text-white ${
                disableBackButton ? 'bg-gray-400' : 'bg-red-600'
              }`}
              onClick={() => toggleBackButton(true)}
              disabled={disableBackButton}
            >
              禁用返回
            </button>
            <button
              className={`px-3 py-2 rounded text-white ${
                !disableBackButton ? 'bg-gray-400' : 'bg-green-600'
              }`}
              onClick={() => toggleBackButton(false)}
              disabled={!disableBackButton}
            >
              启用返回
            </button>
          </div>
        </div>
      </section>

      <section className='space-y-2'>
        <div className='grid grid-cols-2 gap-2'>
          <button
            className='px-3 py-2 rounded bg-blue-600 text-white'
            onClick={detectRuntime}
          >
            检测运行环境
          </button>
          <button
            className='px-3 py-2 rounded bg-blue-600 text-white'
            onClick={initBridge}
          >
            初始化 Bridge
          </button>
          <button
            className='px-3 py-2 rounded bg-blue-600 text-white'
            onClick={getUserInfo}
          >
            获取用户信息
          </button>

          <button
            className='px-3 py-2 rounded bg-blue-600 text-white'
            onClick={getDeviceInfo}
          >
            获取设备信息
          </button>

          <button
            className='px-3 py-2 rounded bg-blue-600 text-white'
            onClick={openVipModal}
          >
            vip半弹窗
          </button>

          <button
            className='px-3 py-2 rounded bg-gray-500 text-white'
            onClick={clearLogs}
          >
            清空日志
          </button>
        </div>
      </section>

      <section className='space-y-2'>
        <div className='text-sm'>
          当前运行环境：
          <span className='ml-2 inline-block rounded px-2 py-0.5 bg-gray-100 text-gray-700'>
            {runtime || 'Unknown'}
          </span>
          <span className='ml-2 inline-block rounded px-2 py-0.5 bg-gray-100 text-gray-700'>
            {inApp ? 'In App' : 'Not In App'}
          </span>
        </div>
      </section>

      <section className='space-y-2'>
        <label className='text-sm font-medium'>Web 路由 URL</label>
        <div className='flex gap-2'>
          <input
            value={webUrl}
            onChange={e => setWebUrl(e.target.value)}
            className='flex-1 px-3 py-2 border rounded'
            placeholder='https://...'
          />
          <button
            className='px-3 py-2 rounded bg-emerald-600 text-white'
            onClick={openWeb}
          >
            打开 Web
          </button>
        </div>
      </section>

      <section className='space-y-2'>
        <h3 className='text-sm font-medium'>能力检测结果</h3>
        {featuresList.length === 0 ? (
          <div className='text-xs text-gray-500'>暂无</div>
        ) : (
          <ul className='text-sm list-disc pl-5 space-y-1'>
            {featuresList.map(([key, val]) => (
              <li key={key} className='flex items-center gap-2'>
                <span className='font-mono text-xs'>{key}</span>
                <span
                  className={`text-xs ${val ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {val ? '支持' : '不支持'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className='space-y-2 pb-8'>
        <h3 className='text-sm font-medium'>日志</h3>
        <div className='h-64 overflow-auto bg-black text-green-300 rounded p-2 text-xs'>
          {logs.length === 0 ? (
            <div className='text-gray-400'>无日志</div>
          ) : (
            <ul className='space-y-1'>
              {logs.map(l => (
                <li key={l.id} className='whitespace-pre-wrap break-words'>
                  <span className='text-amber-300'>[{l.time}]</span> {l.label}
                  {typeof l.payload !== 'undefined' && (
                    <>
                      {' '}
                      <span className='text-gray-400'>-</span>{' '}
                      <span>{JSON.stringify(l.payload)}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
