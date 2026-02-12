/* eslint-disable react-hooks/purity */
'use client';
import { BehaviorBox } from '@/components/BehaviorTracker';
import CustomerService from '@/components/CustomerService';
import {
  aliPay,
  API,
  cdnApi,
  checkOrderStatus,
  createOrderV3,
  getAppId,
  getIsOverSeas,
  getUid,
  getUserRole,
  getWorkData2,
  getWorkPricePackageV2,
  h5WxPay,
} from '@/services';
import { getVipABTest } from '@/services/abtest';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import {
  EventEmitter,
  isAndroid,
  isIOS,
  isMakaAppClient,
  isMakaAppIOS,
  isWechat,
  queryToObj,
} from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
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

interface Props {
  onClose?: () => void;
  className?: string;
  hideHeader?: boolean;
  vipABTest?: string;
  appid?: string;
}

const payTypes = [
  {
    icon: 'https://img2.maka.im/cdn/webstore10/education/icon_wxpay.png',
    name: '微信',
    value: 'wechat',
  },
  {
    icon: 'https://img2.maka.im/cdn/webstore10/education/icon_alipay.png',
    name: '支付宝',
    value: 'ali',
  },
];

type Tab = Array<{
  key: string;
  label: string;
  rule: (item: VipPackage, pack: WorkPricePackage, worksId?: string) => boolean;
  tag?: string;
  showVipName?: boolean;
}>;

const tabsList: Record<string, Tab> = {
  jiantie: [
    {
      key: 'personal',
      label: '个人版',
      rule: (item, pack, worksId) =>
        item.spuCode === 'jiantie.vip.personal' ||
        !!(worksId && item.spuCode === 'jiantie.work.publish'),
    },
    {
      key: 'business',
      label: '商业版',
      rule: item =>
        item.spuCode !== 'jiantie.vip.personal' &&
        item.spuCode !== 'jiantie.work.publish',
      tag: '贴牌',
    },
  ],
  jiantie311: [
    {
      key: 'personal',
      label: '个人版',
      rule: (item: VipPackage, pack: WorkPricePackage, worksId?: string) => {
        if (worksId) {
          return !!item;
        } else {
          return item.spuCode !== 'jiantie.work.template';
        }
      },
    },
  ],
  xueji: [
    {
      key: 'personal',
      label: '按月付费',
      rule: (_, pack) => pack.duration === 'P1M',
      showVipName: true,
    },
    {
      key: 'business',
      label: '按年付费',
      rule: (_, pack) => pack.duration === 'P1Y',
      showVipName: true,
    },
  ],
  xueji308: [
    {
      key: 'personal',
      label: '海报会员',
      rule: item => item.spuCode === 'xueji.vip.poster',
    },
    {
      key: 'business',
      label: '全站会员',
      rule: item => item.spuCode !== 'xueji.vip.poster',
      tag: 'H5',
    },
  ],
  huiyao: [
    {
      key: 'personal',
      label: '按月付费',
      rule: (_, pack) => pack.duration === 'P1M',
      showVipName: true,
    },
    {
      key: 'business',
      label: '按年付费',
      rule: (_, pack) => pack.duration === 'P1Y',
      showVipName: true,
    },
  ],
};

const Vip = (props: Props) => {
  const appid = props.appid || getAppId();
  const { setCustomerVips, setVipShow, vipTrackData } = useStore();
  const [activeTab, setActiveTab] = useState(vipTrackData.tab || 'personal');
  const [vipPackage, setVipPackage] =
    useState<Record<string, Array<WorkPricePackage>>>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandIndex, setExpandIndex] = useState(-1);
  const [payType, setPayType] = useState('wechat');
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isApp, setIsApp] = useState(false);
  const orderId = useRef('');
  const checkTimer = useRef<any>(null);
  const [comparison, setComparison] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userBrandOpen, setUserBrandOpen] = useState(false);
  const [hasShowUserBrand, setHasShowUserBrand] = useState(false);
  const [isIosMiniProgram, setIsIosMiniProgram] = useState(false);
  const [isFromBrand, setIsFromBrand] = useState(false);
  const [canTrial, setCanTrial] = useState(false);
  const [specType, setSpecType] = useState('');
  const [tabs, setTabs] = useState<Tab>();
  const checkPayStartTime = useRef<number>(0);

  const t = useTranslations('Vip');
  const isOversea = getIsOverSeas();
  const router = useRouter();

  const [supportRNIAP, setSupportRNIAP] = useState(false);
  const [supportRNWXPAY, setSupportRNWXPAY] = useState(false);
  const [supportRNALIPAY, setSupportRNALIPAY] = useState(false);

  const formatVipPackages = (products: Array<VipPackage>, config: Tab) => {
    if (!config) return {};

    // 初始化容器
    const data: Record<string, Array<WorkPricePackage>> = {};
    config.forEach(({ key }) => (data[key] = []));

    products.forEach((item: VipPackage) => {
      item.productSkus.forEach(pack => {
        try {
          pack.privileges = JSON.parse(item.privileges);
        } catch (error) {
          pack.privileges = [];
        }

        // 找到符合的 tab rule
        for (const { key, rule, showVipName } of config) {
          if (showVipName) {
            pack.name = item.name;
            pack.desc = item.desc;
          }
          if (rule(item, pack, vipTrackData.works_id)) {
            data[key].push(pack);
            break;
          }
        }
      });
    });

    return data;
  };

  const getPackages = async (vipABTest?: string) => {
    let worksModule = 307;
    let currentTabs = tabsList[appid];

    if (appid === 'xueji') {
      worksModule = 304;
      if (vipABTest === 'test') {
        currentTabs = tabsList.xueji308;
        worksModule = 308;
      }
    } else if (appid === 'huiyao') {
      worksModule = 303;
    } else if (appid === 'jiantie' && vipABTest === 'test') {
      currentTabs = tabsList.jiantie311;
      worksModule = 311;
    }

    if (
      appid === 'xueji' &&
      vipTrackData.tab === 'business' &&
      vipABTest === 'work_vip'
    ) {
      setActiveTab('business');
      setIsFromBrand(true);
    }

    setTabs(currentTabs);

    const res = await getWorkPricePackageV2(
      worksModule,
      vipTrackData?.works_id
    );
    if (res) {
      const data = formatVipPackages((res as any).products, currentTabs);
      setVipPackage(data);

      if (vipTrackData.spuCode) {
        const index = data[activeTab].findIndex(
          item => item.skuCode.indexOf(vipTrackData.spuCode) !== -1
        );
        if (index !== -1) {
          setSelectedIndex(index);
        }
      }
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

  const fetchVipABTest = async (): Promise<string | undefined> => {
    const uid = getUid();
    let vipABTest = props.vipABTest;

    if (!vipABTest && uid) {
      vipABTest = getVipABTest(uid);
    }

    return vipABTest;
  };

  const initData = async () => {
    const group = await fetchVipABTest();
    getPackages(group);
  };

  const getCurrentPackage = () => {
    return vipPackage?.[activeTab]?.[selectedIndex];
  };

  const getWorksData = async (worksId: string) => {
    const res = await getWorkData2(worksId);
    const worksData = res?.work_data;
    const worksDetail = res?.detail;

    return {
      worksData,
      worksDetail,
    };
  };

  const checkTrial = async () => {
    if (!vipTrackData.works_id) {
      return;
    }

    const { worksDetail } = await getWorksData(vipTrackData.works_id);
    if (worksDetail) {
      const isWebsite = worksDetail.specInfo?.export_format?.includes('html');
      const isVideo = worksDetail.specInfo?.export_format?.includes('video');
      const isPoster = worksDetail.specInfo?.export_format?.includes('image');

      if (isWebsite) {
        setSpecType('h5');
      } else if (isVideo) {
        setSpecType('video');
      } else if (isPoster) {
        setSpecType('poster');
      }

      const query = queryToObj();

      if (query.disable_trial || vipTrackData.disable_trial) {
        setCanTrial(false);
      } else if (appid === 'jiantie') {
        setCanTrial(false);
      } else {
        setCanTrial(true);
      }
    }
  };

  useEffect(() => {
    if (appid) {
      initData();
      checkTrial();
      if (!APPBridge.judgeIsInApp()) {
        setPayType('ali');
      }
    }
  }, [appid]);

  useEffect(() => {
    setIsApp(isMakaAppClient());
    setIsIosMiniProgram(!!isIOS() && APPBridge.judgeIsInMiniP());
    initPaySupport();
    if (vipTrackData.openType === 'brand') {
      setActiveTab('business');
      setIsFromBrand(true);
    }
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

  const checkPayStatus = async () => {
    const order_id = orderId.current;
    const uid = getUid();
    const now = Date.now();
    if (now - checkPayStartTime.current > 15000) {
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
    // 小程序支付
    if (isIosMiniProgram) {
      APPBridge.minipNav('navigate', `/pages/iosguide/index`);
      return;
    } else if (APPBridge.judgeIsInMiniP()) {
      const order = await onCreateOrder();
      const { orderNo, amount } = order;
      const curPak = getCurrentPackage();
      orderId.current = orderNo;
      setLoading(true);
      checkPayStatus();

      APPBridge.minipNav(
        'navigate',
        `/pages/pay/index?orderId=${orderNo}&payAmount=${amount}&productName=${curPak?.name}`
      );
      return;
    } else if (isWechat()) {
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
            trackData: {
              workId: vipTrackData.works_id,
              ...vipTrackData,
            },
          },
          jsCbFnName: 'RNIAPPAYCb',
        },
        cbParams => {
          const { success, msg = '支付错误' } = cbParams;
          console.log('RNIAPPAYCb', cbParams);
          setVipShow(false);
          if (success) {
            // checkPayStatus();
            toast.dismiss();
            toast.success(msg);
            getUserVip();
          } else {
            toast.dismiss();
            toast.error(msg);
          }
        },
        60 * 60 * 1000
      );
    }

    // 海外
    else if (isOversea) {
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
    } else {
      const order = await onCreateOrder();
      const { orderNo, amount } = order;
      const WINDOW = window as any;
      orderId.current = orderNo;
      clearTimeout(checkTimer.current);

      // 安卓原生支持支付宝支付
      if (isAndroid() && supportRNALIPAY && payType === 'ali') {
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
      } else if (isAndroid() && supportRNWXPAY && payType === 'wechat') {
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

  const vipPolicy = () => {
    const urls: Record<string, string> = {
      jiantie:
        'https://res.maka.im/assets/jiantie/%E4%BC%9A%E5%91%98%E5%8D%8F%E8%AE%AE.html?1',
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

  const payTotal = () => {
    const currentPackage = getCurrentPackage();

    return (
      <>
        <span className={styles.color}>
          {currentPackage?.currency === 'CNY' ? '¥' : '$'}
        </span>
        <span className={styles.num}>{(currentPackage?.price || 0) / 100}</span>
      </>
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

  const toExport = () => {
    // if (specType === 'h5') {
    //   toShare(vipTrackData.works_id);
    // } else if (specType === 'video') {
    //   toVideoShare(vipTrackData.works_id);
    // } else if (specType === 'poster') {
    //   toPosterShare(vipTrackData.works_id);
    // }
    setVipShow(false);
  };

  const renderCorePrivileges = (corePrivileges: string) => {
    try {
      const list = JSON.parse(corePrivileges);
      return (
        <div className={styles.tags}>
          {list.map((item: any, index: number) => (
            <div
              key={index}
              className={styles.tagItem}
              style={{ backgroundColor: item.bg_color, color: item.text_color }}
            >
              {item.text}
            </div>
          ))}
        </div>
      );
    } catch (error) { }
  };

  const duration = (value: string) => {
    if (value === 'P99Y') {
      return '/终身';
    } else if (value === 'P1M') {
      return '/月';
    } else if (value === 'P1Y') {
      return '/年';
    }

    return '';
  };

  const title = () => {
    if (vipTrackData.openType === 'brand') {
      return '商业版定制品牌营销信息';
    }
    if (vipTrackData.vipType === 'h5') {
      return '当前作品需购买才能发布';
    }

    return '升级会员后即可无水印高清导出';
  };

  return (
    <div className={cls([styles.container, props.className, styles[appid]])}>
      {!props.hideHeader && (
        <>
          <Icon
            name='close'
            className={styles.close}
            color='#fff'
            size={18}
            onClick={async () => {
              props.onClose?.();
              if (isMakaAppIOS() && !APPBridge.isRN()) {
                APPBridge.navAppBack();
              } else if (APPBridge.isRN()) {
                setVipShow(false);

                let suportHalfModal = await APPBridge.featureDetect([
                  'MKAPPCloseModal',
                ]);

                console.log('suportHalfModal', suportHalfModal);

                if (suportHalfModal?.MKAPPCloseModal) {
                  APPBridge.appCall({
                    type: 'MKAPPCloseModal',
                  });
                }
              } else {
                setVipShow(false);
              }
            }}
          />
          <div className={styles.head}>{title()}</div>
          <div className={styles.headLine}></div>
        </>
      )}

      <div className={styles.main}>
        {!isFromBrand && tabs && tabs.length > 1 && (
          <div className={styles.tabs}>
            {tabs?.map(item => (
              <div
                key={item.key}
                className={cls([
                  styles.tabItem,
                  activeTab === item.key && styles.active,
                ])}
                onClick={() => {
                  setActiveTab(item.key as 'personal' | 'business');
                  if (
                    !hasShowUserBrand &&
                    item.key === 'business' &&
                    appid === 'jiantie'
                  ) {
                    setUserBrandOpen(true);
                    setHasShowUserBrand(true);
                  }
                }}
              >
                {item.label}
                {item.tag && (
                  <div
                    className={styles.tag}
                    onClick={() => {
                      if (item.tag === '贴牌') {
                        setUserBrandOpen(true);
                      }
                    }}
                  >
                    {item.tag}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {appid === 'huiyao' && (
          <div className={styles.btnVip} onClick={() => setComparison(true)}>
            <Icon name='list-checkbox' size={16} />
            <span>功能对比表</span>
          </div>
        )}
        <div className={styles.packages}>
          {vipPackage?.[activeTab]?.map((item, index) => (
            <div
              className={cls([
                styles.packageItem,
                selectedIndex === index && styles.active,
              ])}
              key={index}
              onClick={() => onChangePackage(index)}
            >
              <div className='flex items-center justify-between gap-2'>
                {item?.style?.cornerText && (
                  <div
                    className={styles.corner}
                    style={{
                      backgroundColor: item.style.cornerColor,
                    }}
                  >
                    {item.style.cornerText}
                  </div>
                )}
                <div className={styles.content}>
                  <div className='flex items-center gap-1'>
                    {item.skuCode.indexOf('jiantie.work') > -1 && (
                      <div className={styles.tag}>单次</div>
                    )}
                    {item.skuCode.indexOf('vip_senior') > -1 && (
                      <div className={cls([styles.tag, styles.vip])}>VIP</div>
                    )}
                    {item.skuCode.indexOf('vip_super') > -1 && (
                      <div className={cls([styles.tag, styles.svip])}>SVIP</div>
                    )}
                    <div className={styles.name}>{item.name}</div>
                    <div className={styles.desc}>{item.desc}</div>
                  </div>
                  {item.style?.corePrivileges &&
                    renderCorePrivileges(item.style?.corePrivileges)}
                </div>
                {!isIosMiniProgram && (
                  <div className={styles.price}>
                    {/* {item.style.priceBadge ? (
                      <div className={styles.priceBadge}>
                        {item.style.priceBadge}
                      </div>
                    ) : (
                      <>
                        {item.originalPrice &&
                          +item.originalPrice !== +item.price && (
                            <div className={styles.originalPrice}>
                              {item.currency === 'CNY' ? '¥' : '$'}
                              {+(item.originalPrice || 0) / 100}
                            </div>
                          )}
                      </>
                    )} */}

                    <div className={styles.totalPrice}>
                      <span className={styles.color}>
                        {item.currency === 'CNY' ? '¥' : '$'}
                      </span>
                      <span className={styles.num}>{item.price / 100}</span>
                      <span>{duration(item.duration)}</span>
                    </div>
                  </div>
                )}

                {item.privileges && item.privileges.length > 0 && (
                  <>
                    {expandIndex === index ? (
                      <Icon
                        name='up-bold'
                        size={18}
                        onClick={() => setExpandIndex(-1)}
                      />
                    ) : (
                      <Icon
                        name='down-bold'
                        size={18}
                        onClick={() => setExpandIndex(index)}
                      />
                    )}
                  </>
                )}
              </div>

              {expandIndex === index && (
                <div className={styles.privilege}>
                  {item.privileges?.map((priv, index) => (
                    <div className={styles.privilegeItem} key={index}>
                      <Icon name='check1' size={14} color='#00C950' />
                      <span>{priv.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.footer}>
        {!isIosMiniProgram && (
          <div className='flex items-center justify-between mb-3'>
            {isApp && !isIOS() ? (
              <div className={styles.payTypes}>
                {payTypes.map(item => (
                  <div
                    key={item.value}
                    className={cls([
                      styles.payItem,
                      payType === item.value && styles.active,
                    ])}
                    onClick={() => setPayType(item.value)}
                  >
                    <img src={item.icon} />
                    <span className={styles.name}>{item.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div></div>
            )}
            <div className={styles.total}>{payTotal()}</div>
          </div>
        )}
        <div className='flex align-center gap-2'>
          {canTrial && (
            <BehaviorBox
              behavior={{
                object_type: 'watermark_next_btn',
                object_id: vipTrackData.works_id,
              }}
            >
              <Button
                size='lg'
                variant='outline'
                className='p-3 relative text-base font-semibold'
                onClick={() => toExport()}
              >
                {vipTrackData.tab === 'business' ? '带水印分享' : '带水印导出'}
              </Button>
            </BehaviorBox>
          )}
          <Button className={styles.btnPay} size='lg' onClick={() => toPay()}>
            {isIosMiniProgram ? '立即前往' : '立即升级'}{' '}
            {getCurrentPackage()?.name}
          </Button>
        </div>

        <div className={styles.contact}>
          <div className={cls([styles.btnItem])} onClick={() => kefu()}>
            <span className='border-b border-[#D9D9D9]'>
              <span className='text-black'>🧑🏻‍💼</span>
              {t('contact')}
            </span>
          </div>
          <div className={styles.line}></div>
          <div className={styles.btnItem}>7天退款</div>
          <div className={styles.line}></div>
          <div className={styles.btnItem}>开专票</div>
          <div className={styles.line}></div>

          <a className={styles.btnItem} onClick={vipPolicy}>
            《会员服务协议》
          </a>
        </div>
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
      <ResponsiveDialog isOpen={comparison} onOpenChange={setComparison}>
        <div className={styles.comparison}>
          <Icon
            name='close'
            className={styles.close}
            color='#09090B'
            size={18}
            onClick={() => {
              setComparison(false);
            }}
          />
          <div className={styles.tit}>
            <Icon name='list-checkbox' size={20} />
            <span>套餐功能对比</span>
          </div>
          <div className={styles.desc}>对比不同套餐的功能和价格差异</div>
          <div className={styles.img}>
            <img src={cdnApi('/cdn/webstore10/huiyao/对比.png')} alt='' />
          </div>
        </div>
      </ResponsiveDialog>
      <ResponsiveDialog
        isDialog
        isOpen={userBrandOpen}
        onOpenChange={setUserBrandOpen}
        contentProps={{
          className: 'bg-transparent max-w-[320px]',
        }}
      >
        <div className={styles.example}>
          <Icon
            name='close'
            size={16}
            className={styles.close}
            onClick={() => setUserBrandOpen(false)}
          />
          <div className={styles.tit}>贴牌 效果示例</div>
          <div className={styles.desc}>
            加载页可自动替换为您的专属 Logo
            与品牌文案，让客户自营销融入到每一次的服务中。
          </div>
          <div className='flex gap-2 justify-center'>
            <div className={styles.exampleItem}>
              <img
                src='https://img1.maka.im/cdn/webstore10/jiantie/brand_example_1.png'
                alt=''
              />
              <div className={styles.label}>默认模式</div>
            </div>
            <div className={styles.exampleItem2}>
              <img
                src='https://img1.maka.im/cdn/webstore10/jiantie/brand_example_2.png'
                alt=''
              />
              <div className={styles.label}>贴牌模式</div>
            </div>
          </div>
        </div>
      </ResponsiveDialog>
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
    </div>
  );
};

export default observer(Vip);
