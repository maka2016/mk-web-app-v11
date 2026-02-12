'use client';

import APPBridge from '@/store/app-bridge';
import { setCookieExpire } from '@/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type FeatureFlags = Record<string, boolean>;

type LogEntry = {
  id: string;
  label: string;
  payload?: unknown;
  time: string;
};

const JANUR_MOCK_HEADERS: Record<string, string> = {
  appid: 'janur',
  device: 'ios',
  version: '1.0.0',
  bundleid: 'im.maka.janur',
  idfa: '873C2386-3CC2-4F43-BA0B-B415B74E5C52',
  oaid: '',
  idfv: 'D0B0C205-E647-4551-8A05-1137957503E5',
  androidid: '',
};

/** 模拟谷歌登录用的 identityToken（测试用） */
const MOCK_GOOGLE_IDENTITY_TOKEN =
  'eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg2MzBhNzFiZDZlYzFjNjEyNTdhMjdmZjJlZmQ5MTg3MmVjYWIxZjYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzNjk1NTg5Njg0OTMtMXIxZGtydTRiYXZiMTFnZTFlZjBnYjRyc3FkZWk3OXAuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiIzNjk1NTg5Njg0OTMtcjJkcWkzNHFyOGZyb3Vvc2JkNGZsNGl0ZTN2MWdqdTcuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTc1MDIxMjczMzA4NDg0MTUxMzQiLCJlbWFpbCI6IndzeXVsaW5saUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6ImxpIGxpIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0w3UnBUdWU0akExMEFaYWVIRkNySG5Xb3dqUWpnSE4tcENoM25UaVZxSU4yTWhJdz1zOTYtYyIsImdpdmVuX25hbWUiOiJsaSIsImZhbWlseV9uYW1lIjoibGkiLCJpYXQiOjE3NzAxNzQ3NzUsImV4cCI6MTc3MDE3ODM3NX0.pseE2RhNoMucBCwRAXjajcQ54iGXiq-egKg6C1h5rDPl-8gKqIyY6iXud24gP1bBXuv7Qv-WILZ3-Zu7KLFsgL3-gYPe7vVTO5q_48KemcWxoH0WNNM4NXlx7anyhBi9qmOpiDtRyU73ytUUnevF-X_6G10PdpigGo-GTcXBqosFKFsL8FR6JJw26hcGpDpgyiRjy4hIGJnJ1nIWLpv6yhyO1bQAc0DQf0manR5b-XrgYmS7NGRmCsaB8EK6GEMFgCDfeVHUi7ze5l2OJ1VI2RonfJgPlpWKCWX1fMH-19sB435xkBUJnTQ8aeHOfMlAISMkLG3ca0EXb_N4lMf6rA';



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
  const [navUrl, setNavUrl] = useState<string>('maka://home/works/worksActivity');
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

  const simJanurGuestLogin = useCallback(async () => {
    addLog('模拟 janur 游客登录...');
    try {
      const res = await fetch('/api/auth/sign-in/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...JANUR_MOCK_HEADERS,
        },
        body: JSON.stringify({ appid: 'janur' }),
      });
      const json = await res.json();
      addLog('janur 游客登录响应', json);

      if (json.success && json.data?.token && json.data?.uid) {
        const hours = 30 * 24 * 60 * 60 * 1000;
        setCookieExpire('janur_token', json.data.token, hours);
        setCookieExpire('janur_uid', String(json.data.uid), hours);
        addLog('janur 游客登录成功，跳转首页');
        window.location.href = '/mobile/home?appid=janur';
      } else {
        addLog('janur 游客登录失败', { error: json.error || '未知错误' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog('janur 游客登录异常', { error: msg });
    }
  }, [addLog]);

  const simGoogleLogin = useCallback(async () => {
    addLog('模拟janur谷歌登录...');
    try {
      const res = await fetch('/api/auth/sign-in/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...JANUR_MOCK_HEADERS,
          appid: 'janur',
        },
        body: JSON.stringify({
          provider: 'google',
          identityToken: MOCK_GOOGLE_IDENTITY_TOKEN,
          appid: 'janur',
        }),
      });
      const json = await res.json();
      addLog('谷歌登录响应', json);

      if (json.success && json.data?.token && json.data?.uid) {
        const hours = 30 * 24 * 60 * 60 * 1000;
        setCookieExpire('janur_token', json.data.token, hours);
        setCookieExpire('janur_uid', String(json.data.uid), hours);
        addLog('谷歌登录成功，跳转首页');
        window.location.href = '/mobile/home?appid=janur';
      } else {
        addLog('谷歌登录失败', { error: json.error || '未知错误' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog('谷歌登录异常', { error: msg });
    }
  }, [addLog]);

  const testSystemShare = useCallback(async () => {
    addLog('开始测试系统分享图片（APPBridge）');

    // 测试图片URL（使用一个公开的测试图片）
    const testImageUrls = ['https://img1.maka.im/cdn/screenshot/temp/cover/QV62SMNQW602415240-v5-s1-works-p0.png'];

    try {
      // 检查是否在 APP 环境中
      if (!APPBridge.judgeIsInApp()) {
        addLog('不在 APP 环境中，使用 navigator.share');

        // Web 环境降级方案
        if (!navigator.share) {
          addLog('系统分享失败', { error: '当前环境不支持 navigator.share API' });
          return;
        }

        const canShareFiles =
          navigator.canShare &&
          navigator.canShare({
            files: [new File([''], 'test.png', { type: 'image/png' })] as any,
          });

        addLog('能力检测', { supportsShare: true, supportsFiles: canShareFiles });

        if (canShareFiles) {
          addLog('开始下载图片...');
          const response = await fetch(testImageUrls[0]);
          const blob = await response.blob();
          const file = new File([blob], 'test-image.png', { type: 'image/png' });

          await navigator.share({
            title: '测试图片分享',
            text: '这是一个系统分享测试',
            files: [file],
          });

          addLog('系统分享成功');
        } else {
          await navigator.share({
            title: '测试图片分享',
            text: '这是一个系统分享测试',
            url: window.location.href,
          });

          addLog('系统分享链接成功');
        }
        return;
      }

      // APP 环境：检测分享能力
      addLog('在 APP 环境中，检测分享能力');
      const features = await APPBridge.featureDetect(['MKShare', 'WechatSharePoster']);
      addLog('能力检测结果', features);

      const supportMKShare = features?.MKShare || false;
      const supportWechatSharePoster = features?.WechatSharePoster || false;

      // 先保存图片到相册，获取 fileUri
      if (supportMKShare || supportWechatSharePoster) {
        addLog('开始保存图片到相册');

        const saveResult = await APPBridge.appCall(
          {
            type: 'MKSaveImage',
            appid: 'jiantie',
            params: {
              urls: testImageUrls,
            },
            jsCbFnName: 'testSystemShareSaveImageCb',
          },
          data => {
            addLog('MKSaveImage 回调', data);
          },
          30000
        );

        addLog('MKSaveImage 返回结果', saveResult);

        const fileUri = (saveResult as any)?.fileuri;

        // 调用分享功能
        if (supportMKShare) {
          addLog('使用 MKShare 分享图片', {
            type: 'images',
            urls: testImageUrls,
            fileuri: fileUri,
          });

          const shareResult = await APPBridge.appCall(
            {
              type: 'MKShare',
              appid: 'jiantie',
              params: {
                title: '测试图片分享',
                type: 'images',
                shareType: 'system',
                urls: testImageUrls,
                fileuri: fileUri,
              },
              jsCbFnName: 'testSystemShareCb',
            },
            data => {
              addLog('MKShare 回调', data);
            },
            30000
          );

          addLog('MKShare 返回结果', shareResult);
        } else {
          addLog('不支持 MKShare，降级为 link 分享');

          const shareResult = await APPBridge.appCall(
            {
              type: 'MKShare',
              appid: 'jiantie',
              params: {
                title: '测试图片分享',
                content: '这是一个系统分享测试',
                thumb: testImageUrls[0],
                type: 'link',
                shareType: 'system',
                url: window.location.href,
              },
            },
            data => {
              addLog('MKShare link 回调', data);
            },
            30000
          );

          addLog('MKShare link 返回结果', shareResult);
        }
      } else {
        addLog('不支持任何分享能力', { supportMKShare, supportWechatSharePoster });
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        addLog('用户取消分享');
      } else {
        addLog('系统分享失败', {
          error: error?.message || String(error),
          name: error?.name,
        });
      }
    }
  }, [addLog]);

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
          <button className='px-3 py-2 rounded bg-purple-600 text-white' onClick={openBrowser}>
            打开浏览器
          </button>
        </div>
      </section>

      <section className='space-y-2'>
        <label className='text-sm font-medium'>物理返回按钮控制</label>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-gray-600'>当前状态：{disableBackButton ? '已禁用' : '已启用'}</span>
          <div className='flex gap-2'>
            <button
              className={`px-3 py-2 rounded text-white ${disableBackButton ? 'bg-gray-400' : 'bg-red-600'}`}
              onClick={() => toggleBackButton(true)}
              disabled={disableBackButton}
            >
              禁用返回
            </button>
            <button
              className={`px-3 py-2 rounded text-white ${!disableBackButton ? 'bg-gray-400' : 'bg-green-600'}`}
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
          <button className='px-3 py-2 rounded bg-blue-600 text-white' onClick={detectRuntime}>
            检测运行环境
          </button>
          <button className='px-3 py-2 rounded bg-blue-600 text-white' onClick={initBridge}>
            初始化 Bridge
          </button>
          <button className='px-3 py-2 rounded bg-blue-600 text-white' onClick={getUserInfo}>
            获取用户信息
          </button>

          <button className='px-3 py-2 rounded bg-blue-600 text-white' onClick={getDeviceInfo}>
            获取设备信息
          </button>

          <button className='px-3 py-2 rounded bg-blue-600 text-white' onClick={openVipModal}>
            vip半弹窗
          </button>

          <button className='px-3 py-2 rounded bg-orange-600 text-white' onClick={testSystemShare}>
            系统分享图片
          </button>

          <button className='px-3 py-2 rounded bg-emerald-600 text-white' onClick={simJanurGuestLogin}>
            模拟 janur 游客登录
          </button>

          <button className='px-3 py-2 rounded bg-red-600 text-white' onClick={simGoogleLogin}>
            janur模拟谷歌登录
          </button>

          <button className='px-3 py-2 rounded bg-gray-500 text-white' onClick={clearLogs}>
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
          <button className='px-3 py-2 rounded bg-emerald-600 text-white' onClick={openWeb}>
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
                <span className={`text-xs ${val ? 'text-emerald-600' : 'text-rose-600'}`}>
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
                      <span className='text-gray-400'>-</span> <span>{JSON.stringify(l.payload)}</span>
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
