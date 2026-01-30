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

  return (
    <div>
      <MobileHeader title='使用条款' />
      <div className='p-4'>
        <div className={styles.menus}>
          <div className={styles.menusTitle}>帮助与支持</div>

          <div className={styles.menuItem} onClick={() => userAgreement()}>
            <Icon name='file-editing' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>使用条款</div>
              <div className={styles.desc}>
                用户使用本平台服务的基本条款和条件
              </div>
            </div>
            <Icon name='right' />
          </div>
          <div className={styles.menuItem} onClick={() => privacyPolicy()}>
            <Icon name='file-editing' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>隐私协议</div>
              <div className={styles.desc}>
                我们如何收集、使用和保护您的个人信息
              </div>
            </div>
            <Icon name='right' />
          </div>
        </div>
      </div>
    </div>
  );
}
