'use client';

/* eslint-disable @next/next/no-img-element */

import { cdnApi } from '@/services';
import { isAndroid, isIOS, isWechat } from '@/utils';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Main() {
  const [env, setEnv] = useState<'unknown' | 'wechat' | 'other'>('unknown');

  const [MARKET_URL, setMARKET_URL] = useState('');

  useEffect(() => {
    const initMarketUrl = async () => {
      if (isIOS()) {
        setMARKET_URL(
          'https://apps.apple.com/cn/app/%E7%AE%80%E5%B8%96-%E7%94%B5%E5%AD%90%E9%82%80%E8%AF%B7%E5%87%BD%E7%BB%93%E5%A9%9A%E5%AE%9D%E5%AE%9D%E7%99%BE%E6%97%A5%E5%AE%B4%E4%B9%94%E8%BF%81h5%E5%88%B6%E4%BD%9C/id6743101773'
        );
      }
      if (isAndroid()) {
        setMARKET_URL('market://details?id=im.maka.jiantie');
      }
    };
    initMarketUrl();
    const inWechat = isWechat?.();
    setTimeout(() => {
      setEnv(inWechat ? 'wechat' : 'other');
    }, 100);
  }, []);

  const jumpToMarket = () => {
    // if (!MARKET_URL) {
    //   return;
    // }
    // alert(MARKET_URL);
    window.location.replace(MARKET_URL);
  };

  useEffect(() => {
    if (env === 'other') {
      jumpToMarket();
      // window.location.replace(MARKET_URL);
    }
  }, [env]);

  if (env !== 'wechat') {
    return (
      <div className='flex min-h-screen flex-col  bg-white px-6 text-center text-zinc-800'>
        <div className='flex max-w-xs flex-col gap-4 pt-40'>
          <h1 className='text-lg font-semibold'>正在跳转到下载页面...</h1>
          <p className='text-sm text-zinc-500' onClick={jumpToMarket}>
            如果未能自动跳转，请{' '}
            <a
              className='text-[#ff6f61] underline'
              href={MARKET_URL}
              target='_blank'
              rel='noreferrer'
            >
              点击这里
            </a>
            前往应用市场下载。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='relative flex min-h-screen flex-col bg-zinc-900 text-white'>
      <div className='absolute inset-0 bg-black/75' />

      <div className='relative z-10 flex flex-1 flex-col justify-between px-6 pb-20 pt-12'>
        <div className='flex justify-end'>
          <div className='flex flex-col items-center text-right'>
            <ArrowUpRight
              className='h-14 w-14 text-white/90'
              strokeWidth={1.5}
            />
            <span className='mt-2 text-xs text-white/70'>点击右上角菜单</span>
          </div>
        </div>

        <div className='flex flex-col items-center text-center pb-20'>
          <img
            src={cdnApi('/assets/jiantie/%E7%AE%80%E5%B8%96.png')}
            alt='简帖'
            className='h-16 w-auto'
          />
          <h1 className='mt-6 text-xl font-semibold leading-relaxed'>
            请使用右上角 ··· 菜单选择
            <br />
            「在浏览器中打开」
          </h1>
          <p className='mt-4 max-w-xs text-sm text-white/70'>
            微信内暂不支持直接安装 App。前往原生浏览器后，我们将为你打开简帖 App
            下载页面。
          </p>
        </div>

        <div className='flex flex-col items-center gap-3 text-center text-white/60'>
          <p className='text-sm'>也可以复制链接后在默认浏览器粘贴访问。</p>
        </div>
      </div>
    </div>
  );
}
