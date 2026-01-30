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
  isPc,
  safeCopy,
  setCookie,
} from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { mkWebStoreLogger } from '../../../../services/logger';
import VipConvert from './VipConvert';

export interface Props {
  appid?: string;
  active: boolean;
  onChangeTab: (index: number) => void;
}

const Mine = (props: Props) => {
  const appid = props.appid || getAppId();
  const { userProfile, customerVips, setLoginShow, push, environment } =
    useStore();
  const [isApp, setIsApp] = useState(false);

  const [vipConvertOpen, setVipConvertOpen] = useState(false);

  const [isMiniProgram, setIsMiniProgram] = useState(false);

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [invoiceShow, setInvoiceShow] = useState(false);
  const [kefuOpen, setKefuOpen] = useState(false);
  const [worksOrderOpen, setWorksOrderOpen] = useState(false);
  const [worksOrderUrl, setWorksOrderUrl] = useState('');
  const t = useTranslations('Profile');
  const isOversea = getIsOverSeas();

  useEffect(() => {
    // 运行环境需要在客户端首屏完成判断
    setIsApp(isMakaAppClient());
    setIsMiniProgram(APPBridge.judgeIsInMiniP());

    mkWebStoreLogger.track_pageview({
      page_type: 'mine_page',
      page_id: `mine_page`,
    });
  }, [props.active]);

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
      hideHeader: '1',
    };
    const queryStr = new URLSearchParams(queryObj).toString();
    const url = `${location.origin}/works-order?${queryStr}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      setWorksOrderUrl(url);
      setWorksOrderOpen(true);
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
    // setInvoiceShow(true);
    push('https://www.maka.im/userinfo/historybill', {
      newWindow: isPc(),
      query: { appid },
    });
    // push('/invoice/home', {
    //   newWindow: isPc(),
    //   query: { appid },
    // });
  };

  const toPage = (url: string) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${url}?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      // location.href = url + `?appid=${appid}`;
      push(url, {
        newWindow: isPc(),
        query: { appid },
      });
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
      setKefuOpen(true);
    }
  };

  const mineBgMap: Record<string, string> = {
    jiantie:
      "bg-[url('https://img1.maka.im/cdn/webstore10/jiantie/mine_bg_v3.png')] bg-[length:100%_243px] bg-no-repeat",
    xueji:
      "bg-[url('https://img1.maka.im/cdn/webstore10/xueji/mine_bg.png')] bg-[length:100%_280px] bg-no-repeat",
  };

  const menuBaseCls =
    'border border-[#e4e4e7] rounded-[10px] overflow-hidden bg-white';
  const menuItemBaseCls =
    'flex items-center gap-3 px-4 py-3 border-b border-[#e4e4e7] last:border-b-0';
  const titleCls =
    'font-semibold text-[14px] leading-[20px] text-[#09090b] flex items-center';
  const descCls = 'font-normal text-[12px] leading-[18px] text-[#00000099]';

  return (
    <div
      className={cls(
        'flex flex-col gap-4 px-4 py-3 pt-[var(--safe-area-inset-top)] h-full overflow-y-auto bg-white',
        mineBgMap[appid]
      )}
    >
      <div className='flex items-center gap-2 pt-4'>
        <div
          className='flex-shrink-0 w-10 h-10 rounded-full border border-[#0000000f] overflow-hidden'
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
            className='h-full w-full'
          />
        </div>
        {userProfile ? (
          <div className='flex-1 overflow-hidden'>
            <div className='flex items-center gap-1 font-semibold text-[18px] leading-[26px] text-[rgba(0,0,0,0.88)]'>
              <span className='whitespace-nowrap overflow-hidden text-ellipsis'>
                {userProfile?.username}
              </span>
            </div>
            <div className='flex items-center'>
              {customerVips.length > 0 && (
                <div className='mr-1.5 h-[18px] px-1.5 rounded-full bg-[#fed4a5] text-[#652318] font-semibold text-[10px] leading-[18px]'>
                  {customerVips[0].role.name}：
                  {dayjs(customerVips[0].validTo || '').format('YYYY.MM.DD')}
                  到期
                </div>
              )}
              <div
                className='flex items-center font-normal text-[11px] leading-[15.4px] text-[rgba(0,0,0,0.6)]'
                onClick={() => onCopy()}
              >
                ID: {userProfile?.uid}
                <Icon className='ml-2' name='copy' size={12} />
              </div>
            </div>
          </div>
        ) : (
          <div className='flex-1 overflow-hidden' onClick={() => login()}>
            <div className='flex items-center gap-1 font-semibold text-[18px] leading-[26px] text-[rgba(0,0,0,0.88)]'>
              {t('login')}
            </div>
          </div>
        )}
      </div>

      {userProfile?.uid && (
        <div className={menuBaseCls}>
          <div className='px-4 pt-3 pb-2 text-[16px] leading-[24px] font-semibold text-[#09090b]'>
            账户管理
          </div>

          <div
            className={menuItemBaseCls}
            onClick={() => {
              if (isPc()) {
                toPage('https://www.maka.im/userinfo');
              } else {
                toPage('/maka-v2/settings');
              }
            }}
          >
            <Icon name='setting2' size={18} className='text-[#71717a]' />
            <div className='flex-1'>
              <div className={titleCls}>账户设置</div>
              <div className={descCls}>个人信息、社交绑定、密码安全</div>
            </div>
            <Icon name='right' />
          </div>
        </div>
      )}

      <div className={menuBaseCls}>
        <div
          className={menuItemBaseCls}
          onClick={() => toPage('/maka-v2/user-templates')}
        >
          <Icon name='star' size={18} className='text-[#71717a]' />
          <div className='flex-1'>
            <div className={titleCls}>模板中心</div>
            <div className={descCls}>收藏模板、已购模板</div>
          </div>
          <Icon name='right' />
        </div>
        <div
          className={menuItemBaseCls}
          onClick={() => toPage('/maka-v2/recycle-bin')}
        >
          <Icon name='inbox' size={18} className='text-[#71717a]' />
          <div className='flex-1'>
            <div className={titleCls}>回收站</div>
            <div className={descCls}>恢复已删除的作品</div>
          </div>
          <Icon name='right' />
        </div>
        <div
          className={menuItemBaseCls}
          onClick={() => setVipConvertOpen(true)}
        >
          <Icon name='duihuanma' size={18} className='text-[#71717a]' />
          <div className='flex-1'>
            <div className={titleCls}>会员卡兑换</div>
            <div className={descCls}>邀请码兑换</div>
          </div>
          <Icon name='right' />
        </div>
      </div>

      {!isMiniProgram && (
        <div className={menuBaseCls}>
          <div className='px-4 pt-3 pb-2 text-[16px] leading-[24px] font-semibold text-[#09090b]'>
            帮助与支持
          </div>
          {!isOversea && (
            <div className={menuItemBaseCls} onClick={() => worksOrder()}>
              <Icon name='file-editing' size={18} className='text-[#71717a]' />
              <div className='flex-1'>
                <div className={titleCls}>意见反馈</div>
                <div className={descCls}>问题报告、功能建议</div>
              </div>
              <Icon name='right' />
            </div>
          )}
          {!isOversea && (
            <div className={menuItemBaseCls} onClick={() => kefu()}>
              <Icon name='kefu' size={18} className='text-[#71717a]' />
              <div className='flex-1'>
                <div className={titleCls}>联系客服</div>
                <div className={descCls}>周一至周五9:00～18:30在线</div>
              </div>
              <Icon name='right' />
            </div>
          )}
          <div className={menuItemBaseCls} onClick={toInvoice}>
            <Icon name='dindan' size={18} className='text-[#71717a]' />
            <div className='flex-1'>
              <div className={titleCls}>开票管理</div>
              <div className={descCls}>发票申请、开票记录查询</div>
            </div>
            <Icon name='right' />
          </div>
          {isApp && isMakaAppAndroid() && (
            <div className={menuItemBaseCls} onClick={() => toComment()}>
              <Icon name='thumbs' size={18} className='text-[#71717a]' />
              <div className='flex-1'>
                <div className={titleCls}>鼓励MAKA</div>
                <div className={descCls}>在应用商店为我们评分</div>
              </div>
              <Icon name='right' />
            </div>
          )}
        </div>
      )}

      {userProfile?.uid && (
        <div className={menuBaseCls}>
          <div className={menuItemBaseCls} onClick={onLogout}>
            <Icon name='logout' size={18} className='text-[#ef4444]' />
            <div className='flex-1'>
              <div className={cls(titleCls, 'text-[#ef4444]')}>退出登录</div>
              <div className={descCls}>安全退出当前账户</div>
            </div>
            <Icon name='right' />
          </div>
        </div>
      )}

      <ResponsiveDialog isOpen={logoutOpen} onOpenChange={setLogoutOpen}>
        <div className='relative px-4 pt-4 pb-11'>
          <Icon
            name='close'
            size={20}
            className='absolute top-5 right-5 text-[#00000073]'
            onClick={() => setLogoutOpen(false)}
          />
          <div className='mb-5 text-center text-[16px] leading-[24px] font-semibold text-[rgba(0,0,0,0.88)] font-[PingFang_SC]'>
            {t('confirmLogout')}
          </div>
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
        <div className='p-4 text-base flex flex-col items-center justify-center'>
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

      <ResponsiveDialog
        isDialog
        isOpen={kefuOpen}
        onOpenChange={setKefuOpen}
        title='联系客服'
      >
        <div className='w-full h-full p-4'>
          {environment.isMobile ? (
            <iframe
              src='https://work.weixin.qq.com/kfid/kfc815adea102660ae6'
              className='w-full h-full border-0 rounded'
              title='客服'
            />
          ) : (
            <div className='flex flex-col items-center justify-center'>
              <p>联系我的客服</p>
              <p>微信扫一扫，添加MAKA客服</p>
              <img
                src='https://img2.maka.im/pic/GHC2LL1C07.png'
                width={174}
                height={174}
                alt=''
              />
            </div>
          )}
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        isDialog
        isOpen={worksOrderOpen}
        onOpenChange={setWorksOrderOpen}
        title='意见反馈'
        contentProps={{
          className: 'w-full max-w-[600px] h-[80vh]',
        }}
      >
        <div className='w-full h-full p-4'>
          <iframe
            src={worksOrderUrl}
            className='w-full h-full border-0 rounded'
            title='意见反馈'
          />
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default observer(Mine);
