'use client';
import {
  cdnApi,
  delCookie,
  getAppId,
  getIsOverSeas,
  getToken,
  getUid
} from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { safeCopy, setCookie } from '@/utils';
import { trpc } from '@/utils/trpc';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { mkWebStoreLogger } from '../../../../services/logger';
import styles from './index.module.scss';

function toPercentageNumerator(publishCount: number, releaseNum: number) {
  if (
    typeof publishCount !== 'number' ||
    typeof releaseNum !== 'number' ||
    isNaN(publishCount) ||
    isNaN(releaseNum)
  ) {
    return NaN; // 非数字输入处理[1,5](@ref)
  }

  if (releaseNum <= 0) return NaN; // 避免除零错误[6](@ref)

  return Math.min(Math.round((publishCount / releaseNum) * 100), 100); // [1,3](@ref)
}

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
    isVip,
    push,
    replace,
    environment,
  } = useStore();
  console.log('userProfile', userProfile);

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [invoiceShow, setInvoiceShow] = useState(false);
  const [total, setTotal] = useState(0);
  const [backDoorCount, setBackDoorCount] = useState(0);
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugUrl, setDebugUrl] = useState('');
  const t = useTranslations('Profile');
  const isOversea = getIsOverSeas();
  const { setVipShow, vipShow } = useStore();
  const invoiceUrl = `https://jiantieapp.com/invoice/home?appid=${appid}`;

  // 计算是否显示 VIP 信息（使用 env store 避免 SSR 问题）
  const showVipInfo =
    typeof window === 'undefined'
      ? true // SSR 时默认显示
      : !(appid === 'jiantie' && environment.isMakaAppIOS && !environment.isRN);

  // 判断是否为非生产环境
  const isNonProd = typeof window !== 'undefined' && process.env.ENV !== 'prod';

  // 处理调试跳转
  const handleDebugNavigate = () => {
    if (!debugUrl.trim()) {
      toast.error(t('debugInputUrl'));
      return;
    }

    try {
      // 如果输入的是完整URL，提取路径部分
      const path = debugUrl.trim();

      // 使用 push 进行跳转
      push(path);
      setDebugDialogOpen(false);
      toast.success(t('debugNavigateSuccess'));
    } catch (error) {
      console.error('跳转失败:', error);
      toast.error(t('debugNavigateError'));
    }
  };

  const getTotal = async () => {
    const uid = getUid();
    if (!uid) {
      return;
    }
    // uid 会自动从请求头中获取
    const count = await trpc.works.count.query({
      deleted: false,
    });

    setTotal(count || 0);
  };

  useEffect(() => {
    if (props.active) {
      getTotal();

      mkWebStoreLogger.track_pageview({
        page_type: 'mine_page',
        page_id: `mine_page`,
      });
    }
  }, [props.active]);

  const setting = () => {
    if (environment.isInApp) {
      APPBridge.navToPage({ url: `maka://home/mine/account`, type: 'NATIVE' });
    }
  };

  const onCopy = async () => {
    safeCopy(userProfile?.uid);
    toast.success(t('copySuccess'));
  };

  const login = () => {
    if (environment.isInApp) {
      APPBridge.appCall({
        type: 'MKLogOut',
        jsCbFnName: '', // 回传方法 Json值：
      });
    } else if (environment.isInMiniP) {
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

  const onLogout = () => {
    if (environment.isInApp) {
      APPBridge.appCall({
        type: 'MKLogOut',
        jsCbFnName: '', // 回传方法 Json值：
      });
    } else if (environment.isInMiniP) {
      logout();
      APPBridge.miniPlogin();
    } else {
      setLogoutOpen(true);
    }
  };

  //   let IAPPAYCheck = await APPBridge.featureDetect(["RNIAPPAY"]);
  //   if (IAPPAYCheck.RNIAPPAY) {
  //     setVipShow(true);
  //   } else if (isMakaAppIOS()) {
  //     APPBridge.navToPage({
  //       url: `maka://home/vip/vipActivity?templateType=poster`,
  //       type: "NATIVE",
  //     });
  //   } else if (isIOS() && isMiniProgram) {
  //     APPBridge.minipNav("navigate", `/pages/iosguide/index`);
  //   } else {
  //     setVipShow(true);
  //   }
  // };

  const kefu = () => {
    if (environment.isInApp) {
      APPBridge.appCall({
        type: 'MkOpenAppKefu',
        params: {},
      });
    } else {
      window.location.href =
        'https://work.weixin.qq.com/kfid/kfc815adea102660ae6';
    }
  };

  // const vipInfoList = () => {
  //   if (appid === 'jiantie') {
  //     if (permissions?.export_share_svip_template_work) {
  //       return [
  //         `SVIP模板免费使用`,
  //         `${releaseNum}个作品`,
  //         `单链接${permissions.max_pv_per_work || 0}PV`,
  //       ];
  //     } else if (permissions?.export_share_vip_template_work) {
  //       return [
  //         `VIP模板免费使用`,
  //         `${releaseNum}个作品`,
  //         `单链接${permissions.max_pv_per_work || 0}PV`,
  //       ];
  //     }
  //     return ['免费模板', `${releaseNum}个作品`, '链接30天有效期'];
  //   }

  //   if (isVip) {
  //     return [`${releaseNum}个作品`, '所有商业模板', '高级分享'];
  //   } else {
  //     return [`${releaseNum}个作品`, '基础模版', '基础分享'];
  //   }
  // };
  const releaseNum = +(permissions?.works_num || 0);

  return (
    <div className={cls([styles.mine, styles[appid]])}>
      <div className={styles.head}>
        <div
          className={styles.avatar}
          onClick={() => {
            if (!userProfile) {
              login();
            }

            // 连续点击6次跳转到staging
            if (backDoorCount >= 5) {
              replace('https://staging-jiantie-web.maka.im/mobile/home');
              setBackDoorCount(0);
            } else {
              setBackDoorCount(backDoorCount + 1);
            }
          }}
        >
          <img
            src={
              userProfile?.avatar ||
              cdnApi(`/assets/${appid}/pic/default_avatar.png`)
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
                  {t('expires')}
                  {dayjs(customerVips[0].validTo || '').format('YYYY.MM.DD')}
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
      {userProfile && (
        <div
          className={cls([
            styles.vipInfo,
            permissions?.export_share_vip_template_work && styles.vip,
            permissions?.export_share_svip_template_work && styles.svip,
          ])}
        >
          <div className='flex items-center justify-between'>
            <div>
              <div className={styles.vipName}>
                {isVip ? t(customerVips?.[0]?.role?.name ?? 'freeVersion') : t('freeVersion')}
              </div>
              <div className={styles.endTime}>
                {isVip
                  ? `${t('expires')}${dayjs(customerVips[0].validTo || '').format(
                    'YYYY.MM.DD'
                  )}`
                  : t('vipUpgradeSubTitle')}
              </div>
            </div>
            {showVipInfo && (
              <div
                className={styles.vipBtn}
                onClick={
                  () => {
                    setVipShow(true);
                  }
                  // navigateToVipPage({
                  //   vipType: 'vip',
                  // })
                }
              >
                {isVip ? t('renewVip') : t('upgradeVip')}
              </div>
            )}
          </div>


          {!isVip && showVipInfo && (
            <div className={styles.vipUpgrade}>
              <Icon name='crown' size={16} />
              <div className='flex-1'>
                <p className={styles.tit}>{t('vipUpgradeTitle')}</p>
                <p className={styles.desc}>
                  {appid === 'huiyao'
                    ? t('vipUpgradeDescHuiyao')
                    : t('vipUpgradeDescDefault')}
                </p>
              </div>
              <div
                className={styles.btnUpgrade}
                onClick={() => {
                  setVipShow(true);
                }}
              >
                {t('upgrade')}
              </div>
            </div>
          )}
        </div>
      )}
      {userProfile?.uid && (
        <div className={styles.menus}>
          <div className={styles.menusTitle}>{t('accountManage')}</div>
          {!environment.isInMiniP && (
            <div className={styles.menuItem} onClick={() => setting()}>
              <Icon name='setting2' size={18} />
              <div className='flex-1'>
                <div className={styles.tit}>{t('accountSettings')}</div>
                <div className={styles.desc}>{t('accountSettingsDesc')}</div>
              </div>
              <Icon name='right' />
            </div>
          )}

          {!isOversea && (
            <div
              className={styles.menuItem}
              onClick={() => {
                if (!userProfile?.auths?.phone?.loginid) {
                  setBindPhoneShow(true);
                }
              }}
            >
              <Icon name='iphone' size={18} />
              <div className='flex-1'>
                <div className={styles.tit}>{t('phoneVerify')}</div>
                <div className={styles.desc}>{t('phoneVerifyDesc')}</div>
              </div>
              <div className='flex gap-1 items-center'>
                {userProfile?.auths?.phone?.loginid ? (
                  <div className={styles.loginid}>{t('verified')}</div>
                ) : (
                  <div className={styles.loginid}>{t('unverified')}</div>
                )}

                <Icon name='right' />
              </div>
            </div>
          )}

        </div>
      )}

      <div className={styles.menus}>
        <div className={styles.menusTitle}>{t('helpAndSupport')}</div>
        {isNonProd && (
          <div
            className={styles.menuItem}
            onClick={() => {
              setDebugDialogOpen(true);
            }}
          >
            <Icon name='setting2' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>{t('appDebug')}</div>
              <div className={styles.desc}>{t('appDebugDesc')}</div>
            </div>
            <Icon name='right' />
          </div>
        )}
        {!isOversea && (
          <div
            className={styles.menuItem}
            onClick={() => {
              push('/works-order', {
                query: {
                  form_id: '85',
                  module: '会员拦截',
                  form_type: '功能缺陷',
                  uid: getUid(),
                  appid: getAppId(),
                  token: getToken(),
                  env: 'prod',
                  device: environment.isMakaAppAndroid ? 'Android' : 'web',
                  service: '1',
                },
              });
            }}
          >
            <Icon name='file-editing' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>{t('feedback')}</div>
              <div className={styles.desc}>{t('feedbackDesc')}</div>
            </div>
            <Icon name='right' />
          </div>
        )}
        {!isOversea && !environment.isInMiniP && (
          <div className={styles.menuItem} onClick={() => kefu()}>
            <Icon name='kefu' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>{t('contactService')}</div>
              <div className={styles.desc}>{t('contactServiceDesc')}</div>
            </div>
            <Icon name='right' />
          </div>
        )}
        {!environment.isInMiniP && !isOversea && (
          <div
            className={styles.menuItem}
            onClick={() => {
              push('/invoice/home', {
                query: { appid },
              });
            }}
          >
            <Icon name='dindan' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>{t('invoiceManage')}</div>
              <div className={styles.desc}>{t('invoiceManageDesc')}</div>
            </div>
            <Icon name='right' />
          </div>
        )}
        {environment.isInApp &&
          environment.isMakaAppAndroid &&
          !environment.isInMiniP && (
            <div
              className={styles.menuItem}
              onClick={() => {
                APPBridge.navToPage({
                  url: 'maka://store/comment',
                  type: 'NATIVE',
                });
              }}
            >
              <Icon name='thumbs' size={18} />
              <div className='flex-1'>
                <div className={styles.tit}>{t('rateUs')}</div>
                <div className={styles.desc}>{t('rateUsDesc')}</div>
              </div>
              <Icon name='right' />
            </div>
          )}
        {!environment.isInMiniP && (
          <div
            className={styles.menuItem}
            onClick={() => {
              push('/mobile/terms', {
                query: { appid },
              });
            }}
          >
            <Icon name='fapiao' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>{t('terms')}</div>
              <div className={styles.desc}>{t('termsDesc')}</div>
            </div>
            <Icon name='right' />
          </div>
        )}
      </div>

      {userProfile?.uid && (
        <div className={styles.menus}>
          <div className={styles.menuItem} onClick={onLogout}>
            <Icon name='logout' size={18} className={styles.red} />
            <div className='flex-1'>
              <div className={cls([styles.tit, styles.red])}>
                {environment.isInMiniP ? t('切换手机号') : t('logoutMenu')}
              </div>
              <div className={styles.desc}>
                {environment.isInMiniP ? t('使用其他手机号登录') : t('logoutDesc')}
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
        onOpenChange={open => {
          setInvoiceShow(open);
          if (!open) {
            // 弹窗关闭时重置计数
            setBackDoorCount(0);
          }
        }}
        title={t('invoiceManage')}
        contentProps={{
          className: 'w-[330px]',
        }}
      >
        <div className='p-4 text-base flex flex-col items-center justify-center'>
          <p>{t('invoicePcTip', { url: invoiceUrl })}</p>

          <Button
            size='sm'
            onClick={() => {
              safeCopy(invoiceUrl);
              toast.success(t('copySuccess'));

              // 连续点击6次跳转到staging
              if (backDoorCount >= 5) {
                replace('https://staging-jiantie-web.maka.im/maka/mobile/home');
                setBackDoorCount(0);
              } else {
                setBackDoorCount(backDoorCount + 1);
              }
            }}
          >
            {t('copyLink')}
          </Button>
        </div>
      </ResponsiveDialog>
      {isNonProd && (
        <ResponsiveDialog
          isOpen={debugDialogOpen}
          onOpenChange={setDebugDialogOpen}
          title={t('appDebug')}
          description={t('appDebugDesc')}
          showCloseIcon={true}
        >
          <div className='p-4 space-y-4 py-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                {t('debugUrlLabel')}
              </label>
              <Input
                variantSize='default'
                placeholder={t('debugUrlPlaceholder')}
                value={debugUrl}
                onChange={e => setDebugUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleDebugNavigate();
                  }
                }}
              />
            </div>
            <div className='flex gap-2 justify-end'>
              <Button
                variant='outline'
                onClick={() => {
                  setDebugDialogOpen(false);
                  setDebugUrl('');
                }}
              >
                {t('cancel')}
              </Button>
              <Button variant='default' onClick={handleDebugNavigate}>
                {t('navigate')}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      )}
    </div>
  );
};

export default observer(Mine);
