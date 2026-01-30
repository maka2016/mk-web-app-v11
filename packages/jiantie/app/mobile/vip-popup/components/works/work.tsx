'use client';
import { BehaviorBox } from '@/components/BehaviorTracker';
import CustomerService from '@/components/CustomerService';
import {
  aliPay,
  cdnApi,
  checkOrderStatus,
  createOrderV3,
  getAppId,
  getCmsApiHost,
  getIsOverSeas,
  getLocale,
  getUid,
  getUserRole,
  getWorkPricePackageV2,
  h5WxPay,
  requestCMS,
} from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import {
  EventEmitter,
  isMakaAppClient,
  isMakaAppIOS,
  queryToObj,
} from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import qs from 'qs';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { mkWebStoreLogger } from '../../../../../services/logger';
import styles from './index.module.scss';
dayjs.extend(duration);

interface WorkPricePackage {
  name: string;
  desc: string;
  price: number;
  originalPrice: number;
  skuCode: string;
  iapProductId: string;
  currency: string;
  duration: string;
}

interface VipPackage {
  name: string;
  desc: string;
  productSkus: Array<WorkPricePackage>;
  privilege: string;
}

interface Props {
  onClose?: () => void;
}

const payTypes = [
  {
    icon: 'https://img2.maka.im/cdn/webstore10/education/icon_wxpay.png',
    name: '微信支付',
    value: 'wechat',
  },
  {
    icon: 'https://img2.maka.im/cdn/webstore10/education/icon_alipay.png',
    name: '支付宝支付',
    value: 'ali',
  },
];

const Vip = (props: Props) => {
  const appid = getAppId();
  const { setCustomerVips, setVipShow, vipTrackData } = useStore();
  const [vipPackage, setVipPackage] = useState<VipPackage>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [payType, setPayType] = useState('wechat');
  const [ready, setReady] = useState(false);
  const countdownTimer = useRef<any>(null);
  const [time, setTime] = useState({
    hour: '00',
    min: '00',
    sec: '00',
  });
  const [servicesOpen, setServicesOpen] = useState(false);
  const [vipBackground, setVipBackground] = useState('');
  const [isApp, setIsApp] = useState(false);
  const [loading, setLoading] = useState(false);
  const orderId = useRef('');
  const checkTimer = useRef<any>(null);
  const checkPayStartTime = useRef<number>(0);

  const [supportRNIAP, setSupportRNIAP] = useState(false);
  const [supportRNWXPAY, setSupportRNWXPAY] = useState(false);
  const [supportRNALIPAY, setSupportRNALIPAY] = useState(false);

  const t = useTranslations('Vip');
  const locale = getLocale();
  const isOversea = getIsOverSeas();

  const getAppInfo = async () => {
    const query = qs.stringify(
      {
        populate: {
          vip_background: {
            fields: ['url'],
          },
        },
        filters: {
          appid: {
            $eq: appid,
          },
        },
      },
      { encodeValuesOnly: true }
    );

    const promptGroupRes = (
      await requestCMS.get(`${getCmsApiHost()}/api/template-apps?${query}`)
    ).data.data;

    if (promptGroupRes.length > 0) {
      setVipBackground(promptGroupRes[0].vip_background?.url);
    }
  };

  const getPackages = async () => {
    let worksModule = !isOversea ? 1 : 2;
    if (appid === 'xueji') {
      worksModule = 3;
    }
    const res = await getWorkPricePackageV2(worksModule);
    if (res) {
      const data = (res as any).products[0];
      setVipPackage(data);
    }
  };

  const initPaySupport = async () => {
    const featureCheck = await APPBridge.featureDetect([
      'RNIAPPAY',
      'RNWXPAY',
      'RNALIPAY',
    ]);
    // ✅ 如果原生支持 IAPPAY
    if (featureCheck?.RNIAPPAY) {
      setSupportRNIAP(true);
    }
    // ✅ 如果原生支持 RNWXPAY (微信支付)
    if (featureCheck?.RNWXPAY) {
      setSupportRNWXPAY(true);
    }
    if (featureCheck?.RNALIPAY) {
      setSupportRNALIPAY(true);
    }
  };

  const initData = async () => {
    await getPackages();
    setReady(true);
  };

  const getCurrentPackage = () => {
    return vipPackage?.productSkus[selectedIndex];
  };

  // 倒计时
  const countDown = () => {
    if (payDiscount() <= 0) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
      return;
    }

    if (countdownTimer.current) {
      return;
    }

    const endOfDayTimestamp = new Date(
      new Date().setHours(23, 59, 59, 999)
    ).getTime();
    let duration = Math.floor(endOfDayTimestamp / 1000 - Date.now() / 1000);

    if (duration <= 0) {
      return;
    }
    countdownTimer.current = setInterval(() => {
      duration--;
      if (duration <= 0) {
        clearInterval(countdownTimer.current);
        setTime({
          hour: '00',
          min: '00',
          sec: '00',
        });
        return;
      }
      const newValue = {
        hour: Math.floor(duration / 60 / 60),
        min: Math.floor((duration / 60) % 60),
        sec: duration % 60,
      };
      setTime({
        hour: newValue.hour < 10 ? `0${newValue.hour}` : `${newValue.hour}`,
        min: newValue.min < 10 ? `0${newValue.min}` : `${newValue.min}`,
        sec: newValue.sec < 10 ? `0${newValue.sec}` : `${newValue.sec}`,
      });
    }, 1000);
  };

  useEffect(() => {
    countDown();
  }, [selectedIndex, ready]);

  useEffect(() => {
    if (appid) {
      getAppInfo();
      initData();
      if (!APPBridge.judgeIsInApp()) {
        setPayType('ali');
      }
    }
  }, [appid]);

  useEffect(() => {
    setIsApp(isMakaAppClient());
    initPaySupport();
  }, []);

  useEffect(() => {
    mkWebStoreLogger.track_pageview({
      page_type: 'vip_intercept_page',
      page_id: 'vip_intercept_page',
      parent_page_type: vipTrackData.parent_page_type || '',
      ref_page_type: '',
      ref_page_id: decodeURIComponent(vipTrackData.ref_page_id || ''),
      page_inst_id: decodeURIComponent(vipTrackData.page_inst_id || ''),
      ref_object_id: vipTrackData.ref_object_id || '',
    });
  }, []);

  const onChangePackage = (index: number) => {
    setSelectedIndex(index);
  };

  const onCreateOrder = async () => {
    const cuPackage = getCurrentPackage();
    if (!cuPackage) {
      return;
    }

    const query = queryToObj();
    let params: any = {
      products: [
        {
          skuCode: cuPackage.skuCode,
          quantity: 1,
        },
      ],
      traceMetadata: {
        workId: vipTrackData.works_id, // 购买作品必传
        forwardPageName: vipTrackData.parent_page_type || '', // 可选
        refPageType: '', // 可选
        refPageId: decodeURIComponent(vipTrackData.ref_page_id || ''), // 可选
        refPageInstId: decodeURIComponent(vipTrackData.page_inst_id || ''), // 可选
        refPageviewEventId: '', // 可选
        refObjectType: '', // 可选
        refObjectId: '', // 可选
        refObjectInstId: '', // 可选
        refEventId: query.clickid || '', // 可选
      },
    };

    const res: any = await createOrderV3(params);
    toast.dismiss();

    if (res?.orderNo) {
      return res;
    } else {
      toast.error((res as any).message || '创建订单失败');
      return false;
    }
  };

  const getUserVip = async () => {
    const uid = getUid();
    if (uid) {
      const res: any = await getUserRole(appid, uid);
      setCustomerVips(res);
    }
  };

  // const checkPayStatus = async () => {
  //   const order_id = orderId.current;
  //   const data = (await checkOrderStatusV3(order_id)) as any;
  //   if (data.paid === true) {
  //     clearTimeout(checkTimer.current);
  //     setLoding(false);
  //   } else {
  //     checkTimer.current = setTimeout(() => {
  //       checkPayStatus();
  //     }, 1000);
  //   }
  // };

  const checkPayStatus = async () => {
    const order_id = orderId.current;
    const uid = getUid();
    if (Date.now() - checkPayStartTime.current > 15000) {
      clearTimeout(checkTimer.current);
      setLoading(false);
      return;
    }
    const { data } = (await checkOrderStatus(uid, order_id)) as any;

    if (data.status === '1') {
      EventEmitter.emit('paySuccess', '');
      clearTimeout(checkTimer.current);
      setLoading(false);
      toast.success('支付成功！');
      setVipShow(false);
    } else {
      checkTimer.current = setTimeout(() => {
        checkPayStatus();
      }, 1000);
    }
  };

  const payResult = () => {
    (window as any)._onNativeMessage = (name: string, param: any) => {
      toast.dismiss();
      if (name === 'pay_result') {
        if (param.code === 0) {
          checkPayStartTime.current = Date.now();
          if (checkTimer.current) {
            clearTimeout(checkTimer.current);
          }
          setLoading(true);
          checkPayStatus();
        } else {
          setLoading(false);
          toast.error(param.message || '支付失败');
        }
      }
    };
  };

  const handleWechatPay = async (orderId: string) => {
    const res: any = await h5WxPay({
      orderId,
      wapUrl: 'https://www.jiantieapp.com/mobile/home',
      wapName: '简贴',
    });

    if (res.appid) {
      window.location.href = `${res.mwebUrl}&redirect_url=${encodeURIComponent(location.href)}`;
    }
  };

  const handleAliPay = async (orderId: string) => {
    try {
      const res: any = await aliPay({
        orderId,
        returnUrl: location.href,
      });
      const div = document.createElement('div');
      div.innerHTML = res.html;
      document.body.appendChild(div);
      document.forms[0].submit();
    } catch (error) {
      toast.error('支付失败');
    }
  };

  const toPay = async () => {
    toast.loading('提交中.....', {
      duration: 5000,
    });

    const cuPackage = getCurrentPackage();
    if (!cuPackage) {
      return;
    }

    // 海外
    if (isOversea) {
      APPBridge.appCall(
        {
          type: 'MKGooglePay',
          params: {
            productId: cuPackage.iapProductId,
            workId: vipTrackData.works_id,
          },
          jsCbFnName: 'appBridgeOnMKGooglePayCb',
        },
        cbParams => {
          if (cbParams && cbParams?.status === '1') {
            getUserVip();
            toast.dismiss();
            setVipShow(false);
          }
        },
        60000
      );
    } else if (supportRNIAP) {
      console.log('supportRNIAP', supportRNIAP);
      APPBridge.appCall(
        {
          type: 'RNIAPPAY' as any,
          params: {
            productId: cuPackage.iapProductId,
            trackData: {
              ...vipTrackData,
              workId: vipTrackData.works_id,
            },
          },
          jsCbFnName: 'RNIAPPAYCb',
        },
        cbParams => {
          const { success, msg = '支付错误' } = cbParams;
          console.log('RNIAPPAYCb', cbParams);
          if (success) {
            // checkPayStatus();
            toast.dismiss();
            toast.success(msg);
            getUserVip();

            setVipShow(false);
          } else {
            toast.dismiss();
            toast.error(msg);
          }
        },
        60 * 60 * 1000
      );
      return;
    }

    {
      const order = await onCreateOrder();
      const { orderNo, amount } = order;
      const WINDOW = window as any;
      orderId.current = orderNo;
      clearTimeout(checkTimer.current);

      if (APPBridge.judgeIsInApp()) {
        WINDOW?.nativeApi?.pay?.(payType, orderNo, amount, '');
        payResult();
        checkPayStartTime.current = Date.now();
        setLoading(true);
        checkPayStatus();
      } else {
        if (payType === 'wechat') {
          handleWechatPay(orderNo);
        } else {
          handleAliPay(orderNo);
        }
      }
    }
  };

  // 使用政策
  const userAgreement = () => {
    const url =
      'https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/%E7%AE%80%E5%B8%96%E7%94%A8%E6%88%B7%E6%9C%8D%E5%8A%A1%E5%8D%8F%E8%AE%AE.html';
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
    const url =
      'https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/%E7%AE%80%E5%B8%96%E4%B8%AA%E4%BA%BA%E4%BF%A1%E6%81%AF%E4%BF%9D%E6%8A%A4%E6%94%BF%E7%AD%96_.html';
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: url,
        type: 'URL',
      });
    } else {
      window.open(url);
    }
  };

  const payTotal = () => {
    const currentPackage = getCurrentPackage();
    return `${currentPackage?.currency === 'CNY' ? '¥' : '$'}${(currentPackage?.price || 0) / 100}`;
  };

  const payDiscount = () => {
    const currentPackage = getCurrentPackage();
    if (!currentPackage) {
      return 0;
    }

    return (
      (+(currentPackage.originalPrice || 0) - (currentPackage.price || 0)) / 100
    );
  };

  const kefu = () => {
    const userAgent = navigator.userAgent;
    const isDouyin = /aweme/gi.test(userAgent);

    if (isDouyin) {
      setServicesOpen(true);
      return;
    }
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
    <>
      <div
        className={cls([styles.vip])}
        style={{
          backgroundImage: `url("${vipBackground || 'https://img2.maka.im/cdn/webstore10/jiantie/vip_bg.png'}")`,
        }}
      >
        {/* <MobileHeader title='会员' /> */}
        <Icon
          name='close'
          className={styles.close}
          color='#fff'
          size={20}
          onClick={() => {
            props.onClose?.();
            if (isMakaAppIOS() && !supportRNIAP) {
              APPBridge.navAppBack();
            } else {
              setVipShow(false);
            }
          }}
        />
        <div className={styles.title}>
          <p className='flex items-center mb-[1px]'>
            <img src='/assets/lightning.png'></img>
            {t('title')}
          </p>
          <p>{t('desc')}</p>
        </div>
        <div
          style={{
            width: '100%',
            height: 4,
            background: '#FFD2A0',
          }}
        ></div>

        <div className={styles.main}>
          <div className={styles.packages}>
            {vipPackage?.productSkus.map((item, index) => (
              <div
                className={cls([
                  styles.packageItem,
                  selectedIndex === index && styles.active,
                ])}
                key={index}
                onClick={() => onChangePackage(index)}
              >
                <div className={styles.content}>
                  <div className='flex items-center'>
                    <div className={styles.name}>{item.name}</div>
                    {locale === 'zh-CN' &&
                      item.duration === 'P99Y' &&
                      appid !== 'xueji' && (
                        <div className={styles.tip}>
                          <img src='https://img2.maka.im/cdn/webstore10/jiantie/vip_tip_icon.png' />
                          <span>为多年后的您存档这份完美</span>
                        </div>
                      )}
                  </div>
                  <div className={styles.desc}>{item.desc}</div>
                </div>
                <div className={styles.price}>
                  {item.originalPrice &&
                    !isMakaAppIOS() &&
                    +item.originalPrice !== +item.price && (
                      <div className={styles.originalPrice}>
                        {item.currency === 'CNY' ? '¥' : '$'}
                        {+(item.originalPrice || 0) / 100}
                      </div>
                    )}
                  <div className={styles.totalPrice}>
                    {item.currency === 'CNY' ? '¥' : '$'}
                    <span>{item.price / 100}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isOversea && payDiscount() > 0 && !isMakaAppIOS() && (
            <div className={styles.coupon}>
              <div className={styles.tag}>
                <img
                  src={cdnApi('/cdn/webstore10/jiantie/icon_coupon.png')}
                  className='w-4'
                />
              </div>
              <div className={styles.name}>{t('coupon')}</div>
              <div className={styles.countdown}>
                <span>
                  {t('expired', {
                    time: `${time.hour}:${time.min}:${time.sec}`,
                  })}
                </span>
              </div>
              <div className={styles.amount}>
                <span>-¥{payDiscount()}</span>
              </div>
            </div>
          )}

          {locale === 'zh-CN' ? (
            <div className={styles.contact}>
              <div className={cls([styles.btnItem])} onClick={() => kefu()}>
                <span className='border-b border-black'>
                  <span className='text-black'>🧑🏻‍💼</span>
                  {t('contact')}
                </span>
              </div>
              <div className={styles.line}></div>
              <div className={styles.btnItem}>7天不满意可退款</div>
            </div>
          ) : (
            <div className='text-center text-[12px] text-[#000] my-2'>
              <p>{t('guarantee1')}</p>
              <p>{t('guarantee2')}</p>
            </div>
          )}
          {!isOversea && !isMakaAppIOS() && (
            <div className={styles.payTypes}>
              {payTypes.map((item, index) => {
                if (!isApp && item.value === 'wechat') {
                  return null;
                }

                return (
                  <div
                    key={index}
                    className={cls([
                      styles.payItem,
                      payType === item.value && styles.active,
                    ])}
                    onClick={() => setPayType(item.value)}
                  >
                    {payType === item.value ? (
                      <Icon name='danxuan-yixuan' size={24} color='#995423' />
                    ) : (
                      <Icon name='danxuan-weixuan' size={24} color='#E6E6E6' />
                    )}
                    <div className={styles.name}>
                      <img src={item.icon} alt='' />
                      <span>{item.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <BehaviorBox
            behavior={{
              object_type: 'vip_intercept_pay',
              object_id: vipTrackData.works_id || '',
              parent_id: 'vip_intercept_page',
            }}
            className={styles.payButton}
            onClick={() => toPay()}
          >
            {t('publish')} | {payTotal()}
            {/* {payDiscount() > 0 && (
            <span className={styles.discount}>{t('off', { price: payDiscount() })}</span>
          )} */}
          </BehaviorBox>

          {locale === 'zh-CN' ? (
            <div className={styles.clause}>
              支付表示您同意<a onClick={privacyPolicy}>《隐私政策》</a>
              <a onClick={userAgreement}>《使用条款》</a>
            </div>
          ) : (
            <div className={cls([styles.footBtn, 'mt-2'])}>
              {/* <div className={cls([styles.btnItem])} onClick={() => kefu()}>
            <span className="border-b border-black">🧑🏻‍💼{t('contact')}</span>
          </div> */}
              <div className={styles.btnItem} onClick={userAgreement}>
                <span className='border-b border-black'>{t('terms')}</span>
              </div>
            </div>
          )}
        </div>
        <ResponsiveDialog
          isDialog
          isOpen={servicesOpen}
          onOpenChange={setServicesOpen}
          contentProps={{
            className: 'bg-transparent max-w-[320px]',
          }}
        >
          <CustomerService onClose={() => setServicesOpen(false)} />
        </ResponsiveDialog>
      </div>
      {loading && (
        <div
          className={styles.uploadLoading}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Loading size={30} />
          <span>订单支付中...</span>
        </div>
      )}
    </>
  );
};

export default observer(Vip);
