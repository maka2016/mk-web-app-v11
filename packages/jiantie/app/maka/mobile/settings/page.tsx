'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getAppId } from '@/services';
import APPBridge from '@/store/app-bridge';
import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';

export default function Page(props: any) {
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
        url: `${location.origin}/maka/mobile/settings/account?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      location.href = `/maka/mobile/settings/account?appid=${getAppId()}`;
    }
  };

  return (
    <div className='h-full bg-white'>
      <MobileHeader title='设置' />
      <div className='p-4 flex flex-col gap-2'>
        <div className={styles.menus}>
          <div className={styles.menuItem} onClick={() => accountSetting()}>
            <div className='flex-1'>
              <div className={styles.tit}>账号与安全</div>
            </div>
            <Icon name='right' />
          </div>
          <div className={styles.menuItem} onClick={() => setting()}>
            <div className='flex-1'>
              <div className={styles.tit}>系统设置</div>
            </div>
            <Icon name='right' />
          </div>
          <div className={styles.menuItem} onClick={() => userAgreement()}>
            <div className='flex-1'>
              <div className={styles.tit}>服务协议</div>
            </div>
            <Icon name='right' />
          </div>
          <div className={styles.menuItem} onClick={() => privacyPolicy()}>
            <div className='flex-1'>
              <div className={styles.tit}>隐私政策</div>
            </div>
            <Icon name='right' />
          </div>
        </div>
      </div>
    </div>
  );
}
