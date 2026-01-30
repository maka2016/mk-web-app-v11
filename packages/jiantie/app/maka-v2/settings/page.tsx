'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getAppId } from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';

export default function Page(props: any) {
  const store = useStore();
  const isMobile = store.environment.isMobile;
  const appid = getAppId();

  // 使用政策
  const userAgreement = () => {
    const urls: Record<string, string> = {
      jiantie:
        'https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/简帖用户服务协议.html?v5',
      xueji:
        'https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/学迹用户服务协议.html',
      huiyao:
        'https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/会邀用户服务协议.html',
    };
    const url = urls[appid];

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      window.open(url);
    }
  };

  // 隐私协议
  const privacyPolicy = () => {
    const urls: Record<string, string> = {
      jiantie:
        'https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/简帖个人信息保护政策_.html?v5',
      xueji:
        'https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/学迹个人信息保护政策.html',
      huiyao:
        'https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/会邀个人信息保护政策.html',
    };
    const url = urls[appid];

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: url,
        type: 'URL',
      });
    } else {
      window.open(url);
    }
  };

  const setting = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({ url: `maka://home/mine/account`, type: 'NATIVE' });
    }
  };

  const accountSetting = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/maka-v2/settings/account?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      location.href = `/maka-v2/settings/account?appid=${getAppId()}`;
    }
  };

  return (
    <div className='h-full bg-white'>
      {isMobile && <MobileHeader title='设置' />}
      {!isMobile && (
        <div className='px-6 py-4 border-b'>
          <h1 className='text-2xl font-semibold text-[#09090b]'>设置</h1>
        </div>
      )}
      <div
        className={cls([
          'flex flex-col',
          isMobile ? 'p-4 gap-2' : 'p-6 gap-4 max-w-2xl mx-auto w-full',
        ])}
      >
        <div className='border border-[#e4e4e7] rounded-[10px]'>
          {isMobile && (
            <div className='px-4 pt-3 pb-2 font-semibold text-base leading-6 text-[#09090b]'>
              设置
            </div>
          )}
          <div
            className={cls([
              'px-4 py-3 flex items-center gap-3 border-b border-[#e4e4e7] last:border-b-0 transition-colors cursor-pointer',
              !isMobile && 'hover:bg-gray-50',
            ])}
            onClick={() => accountSetting()}
          >
            <div className='flex-1'>
              <div
                className={cls([
                  'font-semibold text-[#09090b]',
                  isMobile ? 'text-sm leading-5' : 'text-base leading-6',
                ])}
              >
                账号与安全
              </div>
            </div>
            <Icon name='right' />
          </div>
          <div
            className={cls([
              'px-4 py-3 flex items-center gap-3 border-b border-[#e4e4e7] last:border-b-0 transition-colors cursor-pointer',
              !isMobile && 'hover:bg-gray-50',
            ])}
            onClick={() => setting()}
          >
            <div className='flex-1'>
              <div
                className={cls([
                  'font-semibold text-[#09090b]',
                  isMobile ? 'text-sm leading-5' : 'text-base leading-6',
                ])}
              >
                系统设置
              </div>
            </div>
            <Icon name='right' />
          </div>
          <div
            className={cls([
              'px-4 py-3 flex items-center gap-3 border-b border-[#e4e4e7] last:border-b-0 transition-colors cursor-pointer',
              !isMobile && 'hover:bg-gray-50',
            ])}
            onClick={() => userAgreement()}
          >
            <div className='flex-1'>
              <div
                className={cls([
                  'font-semibold text-[#09090b]',
                  isMobile ? 'text-sm leading-5' : 'text-base leading-6',
                ])}
              >
                服务协议
              </div>
            </div>
            <Icon name='right' />
          </div>
          <div
            className={cls([
              'px-4 py-3 flex items-center gap-3 border-b border-[#e4e4e7] last:border-b-0 transition-colors cursor-pointer',
              !isMobile && 'hover:bg-gray-50',
            ])}
            onClick={() => privacyPolicy()}
          >
            <div className='flex-1'>
              <div
                className={cls([
                  'font-semibold text-[#09090b]',
                  isMobile ? 'text-sm leading-5' : 'text-base leading-6',
                ])}
              >
                隐私政策
              </div>
            </div>
            <Icon name='right' />
          </div>
        </div>
      </div>
    </div>
  );
}
