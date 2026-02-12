'use client';
import {
  cdnApi,
  clearUserCookie,
  delCookie,
  getAppId,
  getIsOverSeas,
  getToken,
  getUid,
} from '@/services';
// import CommonLogger from '@/services/loggerv7/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import {
  isMakaAppAndroid,
  isMakaAppClient,
  safeCopy,
  setCookie,
} from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { cn } from '@workspace/ui/lib/utils';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import VipConvert from './VipConvert';
import styles from './index.module.scss';

interface Props {
  appid?: string;
  active: boolean;
  onChangeTab: (index: number) => void;
}

const Mine = (props: Props) => {
  const appid = props.appid || getAppId();
  const {
    userProfile,
    customerVips,
    setLoginShow,
    permissions,
    setBindPhoneShow,
    vipABTest,
  } = useStore();
  const [isApp, setIsApp] = useState(false);

  const [vipConvertOpen, setVipConvertOpen] = useState(false);

  const [isMiniProgram, setIsMiniProgram] = useState(false);

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [invoiceShow, setInvoiceShow] = useState(false);
  const t = useTranslations('Profile');
  const isOversea = getIsOverSeas();

  useEffect(() => {
    setIsApp(isMakaAppClient());
    setIsMiniProgram(APPBridge.judgeIsInMiniP());
  }, [props.active]);

  const setting = () => {
    // if (APPBridge.judgeIsInApp()) {
    //   APPBridge.navToPage({ url: `maka://home/mine/account`, type: "NATIVE" });
    // }
  };

  const onCopy = async () => {
    safeCopy(userProfile?.uid);
    toast.success(t('copySuccess'));
  };

  const login = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall({
        type: 'MKLogOut',
        jsCbFnName: '', // 回传方法 Json值：
      });
    } else if (APPBridge.judgeIsInMiniP()) {
      APPBridge.miniPlogin();
    } else {
      setLoginShow(true);
    }
  };

  const logout = () => {
    setTimeout(() => {
      setCookie(`${appid}_token`, '');
      setCookie(`${appid}_uid`, '');
      delCookie(`${appid}_uid`);
      delCookie(`${appid}_token`);
      delCookie(`Makauid`);
      delCookie(`maka_said`);
      delCookie(`ma_id`);
      delCookie(`token`);
      delCookie(`uid`);
      location.reload();
    }, 200);
  };

  const worksOrder = () => {
    const queryObj = {
      form_id: '85',
      module: '会员拦截',
      form_type: '功能缺陷',
      uid: getUid(),
      appid: getAppId(),
      token: getToken(),
      is_full_screen: '1',
      env: 'prod',
      device: isMakaAppAndroid() ? 'Android' : 'web',
      service: '1',
    };
    const queryStr = new URLSearchParams(queryObj).toString();
    const url = `${location.origin}/works-order?${queryStr}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      location.href = url;
    }
  };

  const onLogout = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall({
        type: 'MKLogOut',
        jsCbFnName: '', // 回传方法 Json值：
      });
    } else if (APPBridge.judgeIsInMiniP()) {
      APPBridge.miniPlogin();
    } else {
      setLogoutOpen(true);
    }
    clearUserCookie();
  };

  const toComment = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: 'maka://store/comment',
        type: 'NATIVE',
      });
    } else {
    }
  };

  const toInvoice = () => {
    // https://www.wenzhuangyuan.cn/invoice/home
    setInvoiceShow(true);
  };

  const toTerms = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/terms?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      location.href = `${location.origin}/mobile/terms`;
    }
  };

  const toUserBrand = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/user-brand?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      location.href = `${location.origin}/mobile/user-brand`;
    }
  };

  const toPage = (url: string) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${url}?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      location.href = url + `?appid=${appid}`;
    }
  };

  const kefu = () => {
    if (APPBridge.judgeIsInApp()) {
      // (window as any).androidApi?.openWeixinChat?.();
      APPBridge.appCall({
        type: 'MkOpenAppKefu',
        params: {
          //不需要
        },
      });
    } else {
      window.location.href =
        'https://work.weixin.qq.com/kfid/kfc815adea102660ae6';
    }
  };

  return (
    <div className={cn([styles.mine, styles[appid]])}>
      <div className={styles.head}>
        <div
          className={styles.avatar}
          onClick={() => {
            if (!userProfile) {
              login();
            }
          }}
        >
          <img
            src={
              userProfile?.avatar ||
              cdnApi('/cdn/webstore10/jiantie/default_avatar.png?1')
            }
            alt=''
          />
        </div>
        {userProfile ? (
          <div className={styles.userInfo}>
            <div className={styles.name}>
              <span>{userProfile?.username}</span>
            </div>
            <div className='flex items-center'>
              {customerVips.length > 0 && (
                <div className={styles.vipRole}>
                  {customerVips[0].role.name}：
                  {dayjs(customerVips[0].validTo || '').format('YYYY.MM.DD')}
                  到期
                </div>
              )}
              <div className={styles.uid} onClick={() => onCopy()}>
                ID: {userProfile?.uid}
                <Icon className='ml-2' name='copy' size={12} />
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.userInfo} onClick={() => login()}>
            <div className={styles.name}>{t('login')}</div>
          </div>
        )}
      </div>

      {userProfile?.uid && (
        <div className={styles.menus}>
          <div className={styles.menusTitle}>账户管理</div>

          <div
            className={styles.menuItem}
            onClick={() => toPage('/maka/mobile/settings')}
          >
            <Icon name='setting2' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>账户设置</div>
              <div className={styles.desc}>个人信息、社交绑定、密码安全</div>
            </div>
            <Icon name='right' />
          </div>

          {/* <div
            className={styles.menuItem}
            onClick={() => {
              if (!userProfile?.auths?.phone?.loginid) {
                setBindPhoneShow(true);
              }
            }}
          >
            <Icon name='iphone' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>手机验证</div>
              <div className={styles.desc}>验证手机号码</div>
            </div>
            <div className='flex gap-1 items-center'>
              {userProfile?.auths?.phone?.loginid ? (
                <div className={styles.loginid}>已验证</div>
              ) : (
                <div className={styles.loginid}>未验证</div>
              )}

              <Icon name='right' />
            </div>
          </div> */}
        </div>
      )}

      <div className={styles.menus}>
        <div
          className={styles.menuItem}
          onClick={() => toPage('/maka/mobile/user-templates')}
        >
          <Icon name='star' size={18} />
          <div className='flex-1'>
            <div className={cn([styles.tit])}>模板中心</div>
            <div className={styles.desc}>收藏模板、已购模板</div>
          </div>
          <Icon name='right' />
        </div>
        <div
          className={styles.menuItem}
          onClick={() => toPage('/maka/mobile/recycle-bin')}
        >
          <Icon name='inbox' size={18} />
          <div className='flex-1'>
            <div className={cn([styles.tit])}>回收站</div>
            <div className={styles.desc}>恢复已删除的作品</div>
          </div>
          <Icon name='right' />
        </div>
        <div
          className={styles.menuItem}
          onClick={() => setVipConvertOpen(true)}
        >
          <Icon name='duihuanma' size={18} />
          <div className='flex-1'>
            <div className={cn([styles.tit])}>会员卡兑换</div>
            <div className={styles.desc}>邀请码兑换</div>
          </div>
          <Icon name='right' />
        </div>
      </div>

      {!isMiniProgram && (
        <div className={styles.menus}>
          <div className={styles.menusTitle}>帮助与支持</div>
          {!isOversea && (
            <div className={styles.menuItem} onClick={() => worksOrder()}>
              <Icon name='file-editing' size={18} />
              <div className='flex-1'>
                <div className={styles.tit}>意见反馈</div>
                <div className={styles.desc}>问题报告、功能建议</div>
              </div>
              <Icon name='right' />
            </div>
          )}
          {!isOversea && (
            <div className={styles.menuItem} onClick={() => kefu()}>
              <Icon name='kefu' size={18} />
              <div className='flex-1'>
                <div className={styles.tit}>联系客服</div>
                <div className={styles.desc}>周一至周五9:00～18:30在线</div>
              </div>
              <Icon name='right' />
            </div>
          )}
          <div className={styles.menuItem} onClick={toInvoice}>
            <Icon name='dindan' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>开票管理</div>
              <div className={styles.desc}>发票申请、开票记录查询</div>
            </div>
            <Icon name='right' />
          </div>
          {isApp && isMakaAppAndroid() && (
            <div className={styles.menuItem} onClick={() => toComment()}>
              <Icon name='thumbs' size={18} />
              <div className='flex-1'>
                <div className={styles.tit}>鼓励MAKA</div>
                <div className={styles.desc}>在应用商店为我们评分</div>
              </div>
              <Icon name='right' />
            </div>
          )}
          {/* <div className={styles.menuItem} onClick={toTerms}>
            <Icon name="fapiao" size={18} />
            <div className="flex-1">
              <div className={styles.tit}>使用条款</div>
              <div className={styles.desc}>服务协议、隐私政策</div>
            </div>
            <Icon name="right" />
          </div> */}
        </div>
      )}

      {userProfile?.uid && (
        <div className={styles.menus}>
          <div className={styles.menuItem} onClick={onLogout}>
            <Icon name='logout' size={18} className={styles.red} />
            <div className='flex-1'>
              <div className={cn([styles.tit, styles.red])}>
                {isMiniProgram ? '切换手机号' : '退出登录'}
              </div>
              <div className={styles.desc}>
                {isMiniProgram ? '使用其他手机号登录' : '安全退出当前账户'}
              </div>
            </div>
            <Icon name='right' />
          </div>
        </div>
      )}

      <ResponsiveDialog isOpen={logoutOpen} onOpenChange={setLogoutOpen}>
        <div className={styles.logoutDialog}>
          <Icon
            name='close'
            size={20}
            className={styles.close}
            color='#00000073'
            onClick={() => setLogoutOpen(false)}
          />
          <div className={styles.title}>{t('confirmLogout')}</div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='lg'
              className='flex-1 rounded-full'
              onClick={() => setLogoutOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              variant='destructive'
              size='lg'
              className='flex-1 rounded-full'
              onClick={() => logout()}
            >
              {t('logout')}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
      <ResponsiveDialog
        isDialog
        isOpen={invoiceShow}
        onOpenChange={setInvoiceShow}
        title='开票管理'
        contentProps={{
          className: 'w-[330px]',
        }}
      >
        <div className=' p-4 text-base flex flex-col items-center justify-center'>
          移动端该功能会在后续上线。在此期间您的付费订单可前往PC端，如下地址进行发票开具:
          <br />
          <a
            style={{
              wordBreak: 'break-all',
            }}
          >
            http://maka.im/userinfo/myinvoice/invoicelist
          </a>
          <Button
            size='sm'
            onClick={() => {
              safeCopy(`http://maka.im/userinfo/myinvoice/invoicelist`);
              toast.success('复制成功');
            }}
          >
            复制地址
          </Button>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        isOpen={vipConvertOpen}
        onOpenChange={setVipConvertOpen}
        title='邀请码兑换'
      >
        <VipConvert />
      </ResponsiveDialog>
    </div>
  );
};

export default observer(Mine);
