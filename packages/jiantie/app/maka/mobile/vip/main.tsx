'use client';
import {
  aliPay,
  API,
  checkOrderStatus,
  createOrderV3,
  getAppId,
  getUid,
  getUserRole,
  getWorkPricePackageV2,
  h5WxPay,
} from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import {
  isAndroid,
  isMakaAppIOS,
  isWechat,
  queryToObj,
  safeCopy,
} from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { cn } from '@workspace/ui/lib/utils';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

interface WorkPricePackage {
  name: string;
  desc: string;
  price: number;
  originalPrice: number;
  skuCode: string;
  iapProductId: string;
  currency: string;
  duration: string;
  privileges?: Array<{
    text: string;
  }>;
  style: {
    corePrivileges: string;
    cornerColor: string;
    cornerText: string;
    payTip: string;
    priceBadge: string;
  };
}

interface VipPackage {
  name: string;
  desc: string;
  productSkus: Array<WorkPricePackage>;
  privileges: string;
  spuCode: string;
}

const vipIntro: Record<
  string,
  {
    list?: any[];
    icon: string;
    desc?: string;
    backgroundColor?: string;
    color?: string;
    highlight?: number[];
    vipDesc?: string;
  }
> = {
  poster_economy_vip: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
  },
  poster_premium_vip: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
  },
  h5_promotion: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
  },
  tiantianhuodong: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
  },
  app_standard: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
  },
  app_premium: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
  },
  enterprise_flagship: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_company.png',
  },
  senior: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
  },
  super: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_super.png',
  },
  busi: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_busi.png',
  },
  company: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_company.png',
  },
};

const PayType = [
  {
    name: '微信支付',
    icon: 'https://img2.maka.im/cdn/webstore7/assets/payment/icon_wxpay.png',
    type: 'wechat',
  },
  {
    name: '支付宝支付',
    icon: 'https://img2.maka.im/cdn/webstore7/assets/payment/icon_alipay.png',
    type: 'ali',
  },
];

const tabs = [
  {
    key: 'post_vips',
    label: '平面会员',
    rule: (item: VipPackage) =>
      ['maka.vip.poster_economy', 'maka.vip.poster_premium'].includes(
        item.spuCode
      ),
    sort: ['maka.vip.poster_economy', 'maka.vip.poster_premium'],
  },
  {
    key: 'full_site_vips',
    label: '全站会员',
    rule: (item: VipPackage) =>
      ['maka.vip.full_site_senior', 'maka.vip.enterprise_flagship'].includes(
        item.spuCode
      ),
    sort: ['maka.vip.full_site_senior', 'maka.vip.enterprise_flagship'],
  },
];

const COMPANY_INDEX = 999;

const Payment = () => {
  const { isVip, userProfile, customerVips, setCustomerVips } = useStore();
  const [activeTab, setActiveTab] = useState('full_site_vips');
  const [activeTypeIndex, setActiveTypeIndex] = useState(0);
  const [vipPackages, setVipPackages] =
    useState<Record<string, Array<VipPackage>>>();
  const [selected, setSelected] = useState(0);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState({
    hour: '00',
    min: '00',
    sec: '00',
  });

  const [activePayType, setActivePayType] = useState('wechat');

  const countdownTimer = useRef<any>(null);
  const checkTimer = useRef<any>(null);
  const orderId = useRef('');

  const [loading, setLoading] = useState(false);
  const [supportRNIAP, setSupportRNIAP] = useState(false);
  const [supportRNWXPAY, setSupportRNWXPAY] = useState(false);
  const [supportRNALIPAY, setSupportRNALIPAY] = useState(false);
  const [isIOSApp, setIsIOSApp] = useState(false);
  const checkPayStartTime = useRef<number>(0);
  const [showDialog, setShowDialog] = useState(false);

  const router = useRouter();

  const formatVipPackages = (products: Array<VipPackage>) => {
    if (!tabs) return {};

    // 初始化容器
    const data: Record<string, Array<VipPackage>> = {};
    tabs.forEach(({ key }) => (data[key] = []));

    products.forEach((item: VipPackage) => {
      item.productSkus.forEach(pack => {
        try {
          pack.privileges = JSON.parse(item.privileges);
        } catch (error) {
          pack.privileges = [];
        }
      });
      for (const { key, rule } of tabs) {
        if (rule(item)) {
          // 特殊处理 full_site_vips + enterprise_flagship
          if (
            key === 'full_site_vips' &&
            item.spuCode === 'maka.vip.enterprise_flagship'
          ) {
            const filteredSkus = item.productSkus.filter(
              sku =>
                sku.skuCode ===
                'maka.vip.enterprise_flagship.p12m.once.none.mainland.11185'
            );

            data[key].push(item);

            if (filteredSkus.length > 0) {
              data[key].push({
                ...item,
                name: '企业多人版',
                productSkus: filteredSkus, // 只保留需要的 sku
              });
            }
          } else {
            data[key].push(item);
          }
          break;
        }
      }
    });

    // 按照 sort 排序
    tabs.forEach(({ key, sort }) => {
      if (sort?.length) {
        data[key].sort(
          (a, b) => sort.indexOf(a.spuCode) - sort.indexOf(b.spuCode)
        );
      }
    });

    return data;
  };

  const fetchVipPackages = async () => {
    const res = (await getWorkPricePackageV2(198)) as any;
    if (res) {
      const data = formatVipPackages(res.products);
      setVipPackages(data);
    }
  };

  const initData = async () => {
    await Promise.all([fetchVipPackages()]);
    setReady(true);
  };

  const getCurrentPackage = () => {
    return vipPackages?.[activeTab]?.[activeTypeIndex]?.productSkus?.[selected];
  };

  // 切换价格包
  const onChangePackage = (index: number) => {
    setSelected(index);
  };

  // 切换会员类型
  const onChangeVipType = (type: string, index: number) => {
    setActiveTypeIndex(index);
    setSelected(0);
    const query = queryToObj();

    const extra = {
      object_type: 'top_vip_btn',
      object_id: type,
      page_type: 'vip_page_v2024q2',
      parent_page_type: query.parent_page_type || '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
      page_inst_id: decodeURIComponent(query.page_inst_id || ''),
    };
    mkWebStoreLogger.track_click(extra);
  };

  // 切换tab
  const onChangeTab = (key: string, index: number) => {
    if (!vipPackages) {
      return;
    }
    setActiveTab(key);
    setActiveTypeIndex(0);

    const query = queryToObj();
    let object_type = 'vip_tab_poster_btn';
    if (index === 0) {
      object_type = 'vip_tab_poster_btn';
    } else if (index === 1) {
      object_type = 'vip_tab_full_site_btn';
    }

    const extra = {
      object_type: object_type,
      object_id: object_type,
      page_type: 'vip_page_v2024q2',
      parent_page_type: query.parent_page_type || '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
      page_inst_id: decodeURIComponent(query.page_inst_id || ''),
    };
    mkWebStoreLogger.track_click(extra);
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

  useEffect(() => {
    if (ready) {
      countDown();
    }
  }, [ready]);

  useEffect(() => {
    const query = queryToObj();
    mkWebStoreLogger.track_pageview({
      page_type: 'vip_page_v2024q2',
      page_id: 'vip_page_v2024q2',
      parent_page_type: query.parent_page_type || '',
      ref_page_type: '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
      page_inst_id: decodeURIComponent(query.page_inst_id || ''),
    });
    initPaySupport();
    initData();
    return () => {
      clearInterval(countdownTimer.current);
      clearTimeout(checkTimer.current);
    };
  }, []);

  useEffect(() => {
    setIsIOSApp(isMakaAppIOS());
  }, []);

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
        workId: query.works_id, // 购买作品必传
        forwardPageName: query.parent_page_type || '', // 可选
        refPageType: '', // 可选
        refPageId: decodeURIComponent(query.ref_page_id || ''), // 可选
        refPageInstId: decodeURIComponent(query.page_inst_id || ''), // 可选
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
    const appid = getAppId();
    if (uid) {
      const res: any = await getUserRole(appid, uid);
      setCustomerVips(res);
    }
  };

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
      // EventEmitter.emit("paySuccess", "");
      clearTimeout(checkTimer.current);
      setLoading(false);
      toast.success('支付成功！');
      // setVipShow(false);
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

  const toPay = async () => {
    if (isWechat()) {
      // 如果在微信浏览器
      //跳去收银台
      const order = await onCreateOrder();
      const { orderNo } = order;
      window.location.href = `${API('根域名')}/syt/wappay?order_id=${orderNo}`;
      return;
    }

    toast.loading('提交中.....', {
      duration: 5000,
    });

    const cuPackage = getCurrentPackage();
    if (!cuPackage) {
      return;
    }

    // 在安卓且支持RNWXPAY且选择微信支付时，调用RNIAPPAYCb
    if (supportRNIAP) {
      APPBridge.appCall(
        {
          type: 'RNIAPPAY' as any,
          params: {
            productId: cuPackage.iapProductId,
            trackData: {},
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

            // setVipShow(false);
          } else {
            toast.dismiss();
            toast.error(msg);
          }
        },
        60 * 60 * 1000
      );
    } else {
      const order = await onCreateOrder();
      const { orderNo, amount } = order;
      const WINDOW = window as any;
      orderId.current = orderNo;
      clearTimeout(checkTimer.current);

      // 安卓原生支持支付宝支付
      if (isAndroid() && supportRNALIPAY && activePayType === 'ali') {
        APPBridge.appCall(
          {
            type: 'RNALIPAY' as any,
            params: {
              orderNo: orderNo,
            },
            jsCbFnName: 'RNALIPAY',
          },
          cbParams => {
            console.log('RNALIPAYCb1', cbParams);
            const { success, msg = '支付错误' } = cbParams;
            console.log('RNALIPAYCb2', cbParams);
            if (success) {
              payResult();
              checkPayStartTime.current = Date.now();
              // setLoading(true);
              checkPayStatus();
            } else {
              toast.dismiss();
              toast.error(msg);
            }
          },
          60 * 60 * 1000
        );
      } else if (isAndroid() && supportRNWXPAY && activePayType === 'wechat') {
        //先下单获取订单号
        //然后根据订单号换取微信支付参数
        APPBridge.appCall(
          {
            type: 'RNWXPAY' as any,
            params: {
              orderNo: orderNo,
            },
            jsCbFnName: 'RNWXPAYCb',
          },
          cbParams => {
            const { success, msg = '支付错误' } = cbParams;
            console.log('RNIAPPAYCb for WeChat', cbParams);
            if (success) {
              payResult();
              checkPayStartTime.current = Date.now();
              // setLoading(true);
              checkPayStatus();
            } else {
              toast.dismiss();
              toast.error(msg);
            }
          },
          60 * 60 * 1000
        );
      }
      // 原有的RNIAP支付逻辑
      else if (APPBridge.judgeIsInApp()) {
        WINDOW?.nativeApi?.pay?.(activePayType, orderNo, amount, '');
        payResult();
        checkPayStartTime.current = Date.now();
        setLoading(true);
        checkPayStatus();
      } else {
        if (activePayType === 'wechat') {
          handleWechatPay(orderNo);
        } else {
          handleAliPay(orderNo);
        }
      }
    }
  };

  const countDown = () => {
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
        'https://work.weixin.qq.com/kfid/kfcd1ce1104a143d720';
    }
  };

  // 实付金额
  const realTotal = () => {
    const currentPackage = getCurrentPackage();
    const total = currentPackage?.price || 0;

    return total / 100;
  };

  // 优惠金额
  const getDiscountAmount = () => {
    let total = 0;
    const currentPackage = getCurrentPackage();
    if (!currentPackage) {
      return 0;
    }

    if (currentPackage.originalPrice) {
      total = (+currentPackage.originalPrice - +currentPackage.price) / 100;
    }

    return total;
  };

  const getAvatarUrl = (url: string) => {
    if (url?.indexOf('//') === 0) {
      return `https:${url}`;
    }
    return (
      url ||
      'https://res.maka.im/assets/store4/workspace/team_default_thumb%402x.png'
    );
  };

  const userAgreement = () => {
    if (APPBridge.judgeIsInApp()) {
      // (window as any).androidApi?.openUrl?.('https://www.maka.im/app/member-policy.html', "_blank", "")
      APPBridge.navToPage({
        url: 'https://www.maka.im/app/member-policy.html?a=1',
        type: 'URL',
      });
    } else {
      window.open('https://www.maka.im/app/member-policy.html');
    }
  };

  const privacyPolicy = () => {
    if (APPBridge.judgeIsInApp()) {
      // (window as any).androidApi?.openUrl?.('https://www.maka.im/datastory/privacy/privacy.html', "_blank", "")

      APPBridge.navToPage({
        url: 'https://www.maka.im/datastory/privacy/privacy.html?a=1',
        type: 'URL',
      });
    } else {
      window.open('https://www.maka.im/datastory/privacy/privacy.html');
    }
  };

  const licenseAgreement = () => {
    if (APPBridge.judgeIsInApp()) {
      // (window as any).androidApi?.openUrl?.('https://www.maka.im/doc/copyright-policy.html', "_blank", "")

      APPBridge.navToPage({
        url: 'https://www.maka.im/doc/copyright-policy.html?a=1',
        type: 'URL',
      });
    } else {
      window.open('https://www.maka.im/doc/copyright-policy.html');
    }
  };

  const toPricing = () => {
    if (APPBridge.judgeIsInApp()) {
      // (window as any).androidApi?.openUrl?.(`${API("根域名")}/mk-web-store-v7/mobile/pricing`, "_blank", "")

      APPBridge.navToPage({
        url: `${API('根域名')}/mk-web-store-v7/mobile/pricing?is_full_screen=1&isStatusBarHidden=1`,
        type: 'URL',
      });
    } else {
      window.open(`${API('根域名')}/mk-web-store-v7/mobile/pricing`);
    }
  };

  const goBack = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navAppBack();
    } else {
      router.back();
    }
  };

  const renderHead = () => {
    const { back } = queryToObj();
    if (back === 'true') {
      return (
        <div className={styles.head}>
          <Icon name='left' size={24} onClick={goBack} />
          <span>会员中心</span>
          <Icon name='' />
        </div>
      );
    }

    return null;
  };

  const packageList = () => {
    return vipPackages?.[activeTab]?.[activeTypeIndex]?.productSkus || [];
  };

  const topClassName = () => {
    if (!vipPackages) {
      return 'company';
    }
    return vipPackages &&
      Object.keys(vipPackages).findIndex(item => item === activeTab)
      ? 'company'
      : 'senior';
  };

  const getPrivilegeList = () => {
    try {
      let list: any = [];
      if (activeTypeIndex === COMPANY_INDEX) {
        list = vipPackages
          ? JSON.parse(
              vipPackages['full_site_vips'].find(
                item => item.spuCode === 'maka.vip.enterprise_flagship'
              )?.privileges || '[]'
            )
          : [];
      } else {
        const currentPackage = getCurrentPackage();
        list = currentPackage?.privileges || [];
      }

      const num = Math.ceil(list.length / 2);
      const result: any[][] = Array.from({ length: num }).map(_i => []);
      list?.forEach((item: any, i: number) => {
        const index = i % num;
        result[index].push(item);
      });

      return result;
    } catch (error) {
      return [];
    }
  };

  return (
    <div className={cn([styles.top, styles[topClassName()]])}>
      {renderHead()}
      <div className={styles.userInfo}>
        <div className={styles.left}>
          <div className={styles.avatar}>
            <img src={getAvatarUrl(userProfile?.avatar)} alt='' />
          </div>
          <div>
            <div className={styles.username}>
              <div className={styles.name}>{userProfile?.username}</div>
              {isVip && (
                <div className={styles.vipIcon}>
                  <img
                    src={
                      vipIntro[customerVips?.[0]?.role?.alias as string]?.icon
                    }
                  />
                </div>
              )}
            </div>
            <div className={styles.endTime}>
              {customerVips?.[0]?.role?.name || '普通用户'}
              {isVip
                ? dayjs(customerVips?.[0]?.validTo || '').format('YYYY.MM.DD') +
                  '到期'
                : ''}
            </div>
          </div>
        </div>
        <div className={styles.service} onClick={kefu}>
          <Icon name='kefu' size={16} />
          <span>客服</span>
        </div>
      </div>
      <div className={styles.tabWrap}>
        <div className={styles.tabs}>
          {tabs.map((item, index) => (
            <div
              key={item.key}
              className={cn(
                styles.tabItem,
                activeTab === item.key && styles.active
              )}
              onClick={() => onChangeTab(item.key, index)}
            >
              {item.label}
            </div>
          ))}
        </div>
        <div className={styles.main}>
          <div className='flex items-center justify-between'>
            <div className={styles.title}>会员尊享权益</div>
            <div className={styles.more} onClick={toPricing}>
              权益详情 <Icon name='right' size={14} />
            </div>
          </div>
          <div className={styles.vipRights}>
            {getPrivilegeList().map((line: any, index: number) => (
              <div key={index} className={styles.line}>
                {line.map((item: any, idx: number) => (
                  <div className={styles.rightItem} key={idx}>
                    <Icon color='#1A87FF' size={16} name='quanyidian' />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {vipPackages?.[activeTab].length && (
            <div className={styles.vipType}>
              {vipPackages[activeTab].map((item, index) => {
                return (
                  <div
                    key={index}
                    onClick={() => onChangeVipType(item.name, index)}
                    className={cn([
                      styles.typeItem,
                      activeTypeIndex === index && styles.active,
                    ])}
                  >
                    <div> {item.name}</div>
                    {/* <div className={styles.desc}>{item.desc}</div> */}
                  </div>
                );
              })}
              {activeTab === 'full_site_vips' && (
                <div
                  onClick={() => onChangeVipType('custom', COMPANY_INDEX)}
                  className={cn([
                    styles.typeItem,
                    activeTypeIndex === COMPANY_INDEX && styles.active,
                  ])}
                >
                  <div>企业定制服务</div>
                </div>
              )}
            </div>
          )}
          {activeTypeIndex !== COMPANY_INDEX ? (
            <>
              <div className={styles.packages}>
                {packageList().map((item, index) => (
                  <div
                    key={index}
                    className={cn([
                      styles.packageItem,
                      index === selected && styles.active,
                    ])}
                    onClick={() => onChangePackage(index)}
                  >
                    {item?.style?.cornerText && (
                      <div className={styles.corner}>
                        {item?.style?.cornerText}
                      </div>
                    )}
                    <span className={styles.name}>{item.name}</span>
                    <span className={styles.price}>
                      ¥ <span className={styles.num}>{item.price / 100}</span>
                    </span>
                    {item.originalPrice > 0 && (
                      <span className={styles.original}>
                        原价 ¥{+item.originalPrice / 100}
                      </span>
                    )}
                    {item.desc && <div className={styles.tip}>{item.desc}</div>}
                  </div>
                ))}
              </div>

              {!isIOSApp && getDiscountAmount() > 0 && (
                <div className={styles.coupon}>
                  <div>
                    <span className={styles.name}>限时优惠</span>
                    <span className={styles.countdown}>
                      {time.hour}时{time.min}分{time.sec}秒 后失效
                    </span>
                  </div>

                  <span className={styles.price}>-{getDiscountAmount()}元</span>
                </div>
              )}

              {!isIOSApp && (
                <div className={styles.payType}>
                  {PayType.map((item, index) => (
                    <div key={index} className={styles.payTypeItem}>
                      <div className={styles.name}>
                        <img src={item.icon} alt='' />
                        <span>{item.name}</span>
                      </div>
                      {item.type === activePayType ? (
                        <Icon name='danxuan-yixuan' color='#1A87FF' size={24} />
                      ) : (
                        <Icon
                          name='danxuan-weixuan'
                          color='#DCDCDC'
                          size={24}
                          onClick={() => setActivePayType(item.type)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.clause}>
                支付表示您同意<a onClick={privacyPolicy}>《隐私政策》</a>
                <a onClick={userAgreement}>《使用条款》</a>
                <a onClick={licenseAgreement}>《授权许可协议》</a>
              </div>
            </>
          ) : (
            <img
              src='https://img2.maka.im/cdn/webstore7/assets/payment/vip_company.png'
              className='my-4'
            />
          )}

          <div className={styles.title}>常见问题</div>
          <div className={styles.questions}>
            <div className={styles.item}>
              <div className={styles.question}>
                平面会员和全站会员有什么区别？
              </div>
              <div className={styles.answer}>
                平面会员可去除海报作品水印，下载高清原图；而
                <b>
                  全站会员除了包含全部平面会员权益外，还可以享受H5有效分享链接，
                </b>
                具体区别可查看“会员尊享权益”右侧的「权益详情」
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.question}>
                我要做海报/长图/印刷物，应该开通什么会员？
              </div>
              <div className={styles.answer}>
                如果仅需制作上述平面物料，可以选择开通<b>「平面会员」</b>
                ；不过需要注意，“个人商用”和“企业商用”的授权范围有所区别，请根据实际用途进行选择，以免产生侵权风险哦！
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.question}>
                个人商用授权和企业商用授权的范围分别是什么？
              </div>
              <div className={styles.answer}>
                使用范围：
                <br />
                个人版权通常用于个人目的，比如个人博客、社交媒体账户、个人作品集等。这些作品可能不会用于商业用途，而是分享给朋友、家人或公众。
                <br />
                商用版权则适用于商业目的，比如广告、营销、品牌推广、产品包装等。这些作品可能会用于盈利目的，或者与商业实体相关联。
                目的：
                <br />
                个人版权主要是为了个人创作者保护自己的作品免受未经授权的复制或使用。这种版权通常用于非营利性目的，重点在于保护创作者的权益和作品的完整性。
                <br />
                商用版权则更加关注作品的商业利用价值。商业用途通常意味着作品的使用可以为企业或个人带来经济利益，因此商用版权更加重视作品的商业价值和盈利潜力。
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.question}>
                · 我想制作H5作品，获取分享链接，怎么做？
              </div>
              <div className={styles.answer}>
                开通「全站会员特惠版」即可，且可以畅享平面会员所有权益
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.question}>会员到期后，作品还有效吗？</div>
              <div className={styles.answer}>
                平面作品：已导出的海报到期后仍受到MAKA的版权保护，可继续浏览和传播该作品；但如需对该作品进行编辑、修改，重新导出的海报将带有MAKA水印；
                <br />
                H5作品：作品的分享链接将失效，链接失效后的作品被访问后将收到失效通知。
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <div className={styles.btn} onClick={() => setShowDialog(true)}>
              开具发票
            </div>
            <div className={styles.btn} onClick={kefu}>
              <Icon name='kefu' size={16} />
              <span className='ml-1'>咨询客服</span>
            </div>
          </div>
        </div>
        {activeTypeIndex !== COMPANY_INDEX && (
          <div className={styles.fixedButton}>
            <div>
              <p className={styles.total}>
                合计：<span>¥</span>
                <span className={styles.num}>{realTotal()}</span>
              </p>
              {!isIOSApp && getDiscountAmount() > 0 && (
                <p className={styles.discount}>
                  限时优惠{getDiscountAmount()}元
                </p>
              )}
            </div>
            <div className={styles.btnBuy} onClick={() => toPay()}>
              立即支付
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className='w-[330px] overflow-hidden'>
          <AlertDialogHeader className='w-full'>
            <AlertDialogTitle>温馨提示 </AlertDialogTitle>
            <AlertDialogDescription className='text-black/0.88 text-base'>
              移动端该功能会在后续上线。在此期间您的付费订单可前往PC端，如下地址进行发票开具:
              <br />
              <a
                style={{
                  wordBreak: 'break-all',
                }}
              >
                http://maka.im/userinfo/myinvoice/invoicelist
              </a>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className='rounded-xl flex-1 bg-primary text-primary-btn hover:bg-primary/90 flex-shrink-0 p-0'
              onClick={() => {
                safeCopy('http://maka.im/userinfo/myinvoice/invoicelist');
                setShowDialog(false);
              }}
            >
              我知道了
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default observer(Payment);
