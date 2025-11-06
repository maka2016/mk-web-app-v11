'use client';
import {
  delCookie,
  getAppId,
  getIsOverSeas,
  getToken,
  getUid,
} from '@/services';
import { useStore } from '@/store';
import { safeCopy } from '@/utils';
import { navigateToVipPage } from '@/utils/jiantie';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import CommonLogger from '@mk/loggerv7/logger';
import { cdnApi } from '@mk/services';
import {
  isMakaAppAndroid,
  isMakaAppClient,
  isMakaAppIOS,
  setCookie,
} from '@mk/utils';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Progress } from '@workspace/ui/components/progress';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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
    setVipShow,
    vipABTest,
    isVip,
    isSVip,
  } = useStore();
  const [isApp, setIsApp] = useState(false);
  const router = useRouter();

  const [isMiniProgram, setIsMiniProgram] = useState(false);

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [invoiceShow, setInvoiceShow] = useState(false);
  const [total, setTotal] = useState(0);
  const [showVipInfo, setShowVipInfo] = useState(false);
  const t = useTranslations('Profile');
  const isOversea = getIsOverSeas();

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
    getTotal();
    setIsApp(isMakaAppClient());
    setIsMiniProgram(APPBridge.judgeIsInMiniP());
    setShowVipInfo(
      !(appid === 'jiantie' && isMakaAppIOS() && !APPBridge.isRN())
    );

    CommonLogger.track_pageview({
      page_type: 'mine_page',
      page_id: `mine_page`,
    });
  }, [props.active]);

  const setting = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({ url: `maka://home/mine/account`, type: 'NATIVE' });
    }
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
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/invoice/home?appid=${appid}`,
        type: 'URL',
      });
    } else {
      router.push(`/invoice/home?appid=${appid}`);
    }
    // setInvoiceShow(true);
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

  const vipInfoList = () => {
    if (appid === 'jiantie') {
      if (permissions?.export_share_svip_template_work) {
        return [
          `SVIP模板免费使用`,
          `${releaseNum}个作品`,
          `单链接${permissions.max_pv_per_work || 0}PV`,
        ];
      } else if (permissions?.export_share_vip_template_work) {
        return [
          `VIP模板免费使用`,
          `${releaseNum}个作品`,
          `单链接${permissions.max_pv_per_work || 0}PV`,
        ];
      }
      return ['免费模板', `${releaseNum}个作品`, '链接30天有效期'];
    }

    if (isVip) {
      return [`${releaseNum}个作品`, '所有商业模板', '高级分享'];
    } else {
      return [`${releaseNum}个作品`, '基础模版', '基础分享'];
    }
  };
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
          }}
        >
          <img
            src={
              userProfile?.avatar ||
              cdnApi('/cdn/webstore10/jiantie/default_avatar.png')
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
                  会员有效期至：
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
                {isVip ? customerVips?.[0]?.role?.name : '免费版'}
              </div>
              <div className={styles.endTime}>
                {isVip
                  ? `有效期至：
              ${dayjs(customerVips[0].validTo || '').format('YYYY.MM.DD')}`
                  : '升级尊享更多权益'}
              </div>
            </div>
            {showVipInfo && (
              <div
                className={styles.vipBtn}
                onClick={() =>
                  navigateToVipPage({
                    vipType: 'vip',
                  })
                }
              >
                升级会员
              </div>
            )}
          </div>
          <div className={styles.worksLimit}>
            <div className='flex items-center justify-between'>
              <span>作品额度</span>
              {releaseNum < 999999 ? (
                <span>
                  <span className={styles.num}>{total || 0}</span>/{releaseNum}
                </span>
              ) : (
                '无限制'
              )}
            </div>
            <Progress
              indicatorColor={isVip ? 'bg-[#FFC86A]' : 'bg-[#7780A6]'}
              className={isVip ? 'bg-[#F2EEE6]' : 'bg-white'}
              value={toPercentageNumerator(total, releaseNum)}
            />
          </div>
          <div className={styles.vipInfoList}>
            {vipInfoList().map((item, i) => {
              return (
                <div key={item}>
                  <div className={styles.vipInfoItem}>{item}</div>
                  {i !== vipInfoList().length - 1 && (
                    <div className={styles.line}></div>
                  )}
                </div>
              );
            })}
          </div>
          {!isVip && showVipInfo && (
            <div className={styles.vipUpgrade}>
              <Icon name='crown' size={16} />
              <div className='flex-1'>
                <p className={styles.tit}>立即升级享受更多功能</p>
                <p className={styles.desc}>
                  {appid === 'huiyao'
                    ? '无限作品升级、高级模板、品牌定制'
                    : '付费模板免费用、H5链接更高传播人数'}
                </p>
              </div>
              <div
                className={styles.btnUpgrade}
                onClick={() =>
                  navigateToVipPage({
                    vipType: 'vip',
                  })
                }
              >
                升级
              </div>
            </div>
          )}
        </div>
      )}
      {userProfile?.uid && (
        <div className={styles.menus}>
          <div className={styles.menusTitle}>账户管理</div>
          {!isMiniProgram && (
            <div className={styles.menuItem} onClick={() => setting()}>
              <Icon name='setting2' size={18} />
              <div className='flex-1'>
                <div className={styles.tit}>账户设置</div>
                <div className={styles.desc}>个人信息、社交绑定、密码安全</div>
              </div>
              <Icon name='right' />
            </div>
          )}

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
          </div>
          {appid === 'jiantie' && vipABTest === 'default' && (
            <div
              className={cls([styles.menuItem, styles.brand])}
              onClick={() => toUserBrand()}
            >
              <Icon name='ai-magic' size={18} color='#3358D4' />
              <div className='flex-1'>
                <div className={styles.tit}>
                  品牌专区
                  <div className={styles.tag}>贴牌</div>
                </div>
                <div className={styles.desc}>
                  在加载页设置个性化的品牌营销信息
                </div>
              </div>
              <Icon name='right' />
            </div>
          )}
        </div>
      )}

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
                <div className={styles.tit}>给我们好评</div>
                <div className={styles.desc}>在应用商店为我们评分</div>
              </div>
              <Icon name='right' />
            </div>
          )}
          <div className={styles.menuItem} onClick={toTerms}>
            <Icon name='fapiao' size={18} />
            <div className='flex-1'>
              <div className={styles.tit}>使用条款</div>
              <div className={styles.desc}>服务协议、隐私政策</div>
            </div>
            <Icon name='right' />
          </div>
        </div>
      )}

      {userProfile?.uid && (
        <div className={styles.menus}>
          <div className={styles.menuItem} onClick={onLogout}>
            <Icon name='logout' size={18} className={styles.red} />
            <div className='flex-1'>
              <div className={cls([styles.tit, styles.red])}>退出登录</div>
              <div className={styles.desc}>安全退出当前账户</div>
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
          <p>{`请在电脑端访问：https://jiantieapp.com/invoice/home?appid=${appid}`}</p>

          <Button
            size='sm'
            onClick={() => {
              safeCopy(`https://jiantieapp.com/invoice/home?appid=${appid}`);
              toast.success('复制成功');
            }}
          >
            复制地址
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default observer(Mine);
