'use client';

import JTVip from '@/app/mobile/vip-popup/components/vip_jt';
import JTVip2 from '@/app/mobile/vip-popup/components/vip_jt2';
import { abtest } from '@/services/abtest';
import { useStore } from '@/store';
import { VipShowData } from '@/store/share';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';

interface Props {
  appid?: string;
  vipTrackData: VipShowData;
}

const VipPageWrapper = observer((props: Props) => {
  const { appid, vipTrackData } = props;
  const { setVipShow } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 将 trk_str 解析后的数据存入 store
    console.log('vipTrackData', vipTrackData);
    setVipShow(false, vipTrackData);
    setReady(true);
  }, [vipTrackData, setVipShow]);

  const getVipComponent = () => {
    const isMonthVip = abtest('monthVip');
    if (appid === 'jiantie' && isMonthVip) {
      return <JTVip2 modulo={317} appid={appid} />;
    }
    return <JTVip modulo={315} appid={appid} />;
  };
  if (!ready) {
    return (
      <div className='flex items-center justify-center h-full min-h-screen'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-[#D53933] border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-500'>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='relative min-h-screen bg-white pb-20'>
      {/* 装饰性背景元素 */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute -top-32 right-0 w-80 h-80 bg-[#FFF5F0] rounded-full opacity-20 blur-3xl'></div>
        <div className='absolute top-20 -left-24 w-64 h-64 bg-[#FFF9F6] rounded-full opacity-18 blur-3xl'></div>
        <div className='absolute bottom-0 right-1/3 w-96 h-96 bg-[#FFF8F5] rounded-full opacity-15 blur-3xl'></div>
      </div>

      {/* 内容区域 */}
      <div className='relative z-10 mt-10'>{getVipComponent()}</div>

      {/* 营销文案区域 */}
      <div className='relative z-10 px-4 mt-8 mb-8'>
        <div className='bg-gradient-to-br from-[#FFF8F5] to-[#FFFBF8] rounded-2xl p-6 border border-[#FFE8E0] shadow-sm'>
          <div className='space-y-4'>
            <div className='flex items-start gap-3'>
              <div className='flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] flex items-center justify-center mt-0.5'>
                <span className='text-white text-xs font-bold'>✓</span>
              </div>
              <div>
                <p className='text-[#D53933] font-semibold text-base mb-1'>
                  终身会员一次购买，永久使用
                </p>
                <p className='text-gray-700 text-sm leading-relaxed'>
                  无需续费，无需担心过期，所有模板随时可用，让每个重要时刻都更完美
                </p>
              </div>
            </div>

            <div className='flex items-start gap-3'>
              <div className='flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] flex items-center justify-center mt-0.5'>
                <span className='text-white text-xs font-bold'>✓</span>
              </div>
              <div>
                <p className='text-[#D53933] font-semibold text-base mb-1'>
                  专业设计，品质保证
                </p>
                <p className='text-gray-700 text-sm leading-relaxed'>
                  由专业设计师精心打造，涵盖婚礼、满月、升学、寿宴等各类场景模板
                </p>
              </div>
            </div>
          </div>

          <div className='mt-6 pt-6 border-t border-[#FFE8E0]'>
            <div className='flex items-center justify-center gap-2 text-gray-600 text-xs'>
              <span>已有</span>
              <span className='text-[#D53933] font-semibold'>10万+</span>
              <span>用户选择我们</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VipPageWrapper;
