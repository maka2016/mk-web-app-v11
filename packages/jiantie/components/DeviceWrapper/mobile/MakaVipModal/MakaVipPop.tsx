'use client';
import {
  aliPay,
  API,
  checkBindPhone,
  checkOrderStatus,
  createOrderV3,
  getAppId,
  getUid,
  getUserRole,
  getWorkPricePackageV2,
  h5WxPay,
} from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { getShareUrl, useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { isAndroid, isMakaAppIOS, isWechat, queryToObj } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
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

interface Props {
  // works_type: string;
  // works_id: string;
  // uid: string;
  // showPosterWatermark: string;
  // up_to_vip_btn_text: string;
  // share_with_wm_btn_text: string;
  // templateType: string;
  // share_panel_title: string;
}

const COMPANY_INDEX = 999;

interface Props {
  urlParams?: {
    works_type?: string;
    works_id?: string;
    up_to_vip_btn_text?: string;
    showPosterWatermark?: string;
    share_with_wm_btn_text?: string;
  };
}

const MakaVipPop = (props: Props) => {
  const { urlParams } = props;
  const {
    setCustomerVips,
    shareWork,
    vipTrackData,
    setVipShow,
    setBindPhoneShow,
    activeTab,
    setActiveTab,
  } = useStore();

  const works_type = urlParams?.works_type || vipTrackData.works_type;
  const editor_version = vipTrackData.editor_version;
  const works_id = urlParams?.works_id || vipTrackData.works_id;
  const [activeType, setActiveType] = useState('poster_premium');
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
  const [loading, setLoading] = useState(false);
  const [supportRNIAP, setSupportRNIAP] = useState(false);
  const [supportRNWXPAY, setSupportRNWXPAY] = useState(false);
  const [supportRNALIPAY, setSupportRNALIPAY] = useState(false);
  const [isIOSApp, setIsIOSApp] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const checkPayStartTime = useRef<number>(0);
  const checkTimer = useRef<any>(null);
  const orderId = useRef('');
  const countdownTimer = useRef<any>(null);

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
    const res = (await getWorkPricePackageV2(198, works_id)) as any;
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
    setActiveType(type);
    setActiveTypeIndex(index);
    setSelected(0);
    const query = queryToObj();

    const extra = {
      object_type: 'top_vip_btn',
      object_id: type,
      page_type: 'vip_intercept_page_v2024q2',
      parent_page_type: query.parent_page_type || '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
    };
    mkWebStoreLogger.track_click(extra);
  };

  // 切换tab
  const onChangeTab = (key: 'full_site_vips' | 'post_vips', index: number) => {
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
      page_type: 'vip_intercept_page_v2024q2',
      parent_page_type: query.parent_page_type || '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
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
      page_type: 'vip_intercept_page_v2024q2',
      page_id: works_type,
      parent_page_type:
        query.parent_page_type ||
        (works_type === 'h5' ? 'site_promotional_page' : 'site_poster_page'),
      ref_page_type: '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
    });
    initPaySupport();
    initData();
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

    console.log('params', params);
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

  // 倒计时
  const countDown = () => {
    // if (getDiscountAmount() <= 0) {
    //   clearInterval(countdownTimer.current)
    //   return
    // }

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

  const toShare = async () => {
    const uid = getUid();
    if (editor_version === 10) {
      setShowShareDialog(true);
      return;
    }
    const hasBind = await checkBindPhone(uid, getAppId());
    if (hasBind) {
      if (APPBridge.judgeIsInApp()) {
        APPBridge.navToPage({
          url: `${location.origin}/maka/mobile/share?works_id=${works_id}&uid=${uid}&is_full_screen=1`,
          type: 'URL',
        });
      } else {
        location.href = `/maka/mobile/share?works_id=${works_id}&uid=${uid}&appid=${getAppId()}`;
      }
    } else {
      setBindPhoneShow(true);
    }
  };

  // 获取临时链接
  const getTempLink = () => {
    return getShareUrl(works_id || '');
  };

  // 分享到微信好友
  const handleShareToWechatForTemp = async () => {
    await shareWork({
      worksDetail: vipTrackData.vipWorksDetail,
      shareType: 'wechat',
      checkPermission: false, // 临时链接不需要权限检查
    });
  };

  // 复制链接
  const handleCopyLink = async () => {
    const link = getTempLink();
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(link);
        toast.success('链接已复制');
      } else {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('链接已复制');
      }
      setShowShareDialog(false);
    } catch (error: any) {
      toast.error(error.message || '复制失败');
    }
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

  const goBack = async () => {
    setVipShow(false);

    let suportHalfModal = await APPBridge.featureDetect(['MKAPPCloseModal']);

    console.log('suportHalfModal', suportHalfModal);

    if (suportHalfModal?.MKAPPCloseModal) {
      APPBridge.appCall({
        type: 'MKAPPCloseModal',
      });
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

  const packageList = () => {
    return vipPackages?.[activeTab]?.[activeTypeIndex]?.productSkus || [];
  };

  const topClassName = () => {
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

  if (!ready) {
    return (
      <div className='flex items-center justify-center p-4'>
        <Loading />
      </div>
    );
  }

  return (
    <>
      <div className={cls([styles.top, styles[topClassName()]])}>
        <div className={styles.header}>
          <Icon name='' />
          {activeTab === 'full_site_vips' ? (
            <span className={styles.tit}>
              海报<span className={styles.red}>无水印</span>下载+H5链接
              <span className='red'>有效</span>
            </span>
          ) : (
            <span className={styles.tit}>
              海报<span className={styles.red}>无水印</span>下载
            </span>
          )}
          <Icon name='close' onClick={goBack} />
        </div>

        <div
          style={{
            padding: '0 16px',
          }}
        >
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
        </div>

        <div
          className={cls([
            styles.tabWrap,
            works_type === 'h5' && styles.single,
          ])}
        >
          {works_type !== 'h5' ? (
            <div className={styles.tabs}>
              {tabs.map((item, index) => (
                <div
                  key={item.key}
                  className={cls(
                    styles.tabItem,
                    activeTab === item.key && styles.active
                  )}
                  onClick={() =>
                    onChangeTab(
                      item.key as 'full_site_vips' | 'post_vips',
                      index
                    )
                  }
                >
                  {item.label}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.tabs}>
              <div className={cls(styles.tabItem)}>全站会员</div>
            </div>
          )}
          <div className={styles.main}>
            {vipPackages?.[activeTab].length && (
              <div className={styles.vipType}>
                {vipPackages[activeTab].map((item, index) => {
                  return (
                    <div
                      key={index}
                      onClick={() => onChangeVipType(item.name, index)}
                      className={cls([
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
                    className={cls([
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
                      className={cls([
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
                      {item.desc && (
                        <div className={styles.tip}>{item.desc}</div>
                      )}
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

                    <span className={styles.price}>
                      -{getDiscountAmount()}元
                    </span>
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
                          <Icon
                            name='danxuan-yixuan'
                            color='#1A87FF'
                            size={24}
                          />
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
              </>
            ) : (
              <img
                src='https://img2.maka.im/cdn/webstore7/assets/payment/vip_company.png'
                className='my-4'
                alt='企业定制服务'
              />
            )}

            <div className={styles.footer}>
              {!isIOSApp && getDiscountAmount() > 0 && (
                <div className={styles.activity}>
                  <div className={styles.countdown}>
                    活动抢购倒计时：
                    <span className={styles.time}>{time.hour}</span>
                    <span className={styles.split}>:</span>
                    <span className={styles.time}>{time.min}</span>
                    <span className={styles.split}>:</span>
                    <span className={styles.time}>{time.sec}</span>
                  </div>
                  <span>限时优惠{getDiscountAmount()}元</span>
                </div>
              )}
              <div className='flex'>
                {vipTrackData.showPosterWatermark === '1' &&
                  works_type !== 'h5' && (
                    <div className={styles.btn} onClick={() => toShare()}>
                      {vipTrackData.share_with_wm_btn_text || '带水印下载'}
                    </div>
                  )}
                {works_type === 'h5' && (
                  <div className={styles.btn} onClick={() => toShare()}>
                    {vipTrackData.share_with_wm_btn_text || '发布临时链接'}
                  </div>
                )}
                {activeTypeIndex !== COMPANY_INDEX && (
                  <div
                    className={cls([styles.btn, styles.vip])}
                    onClick={() => toPay()}
                  >
                    {vipTrackData.up_to_vip_btn_text || '立即开通会员'}
                  </div>
                )}
              </div>
              <div className={styles.service}>
                如有疑问 <span onClick={kefu}>点此联系专属客服</span>
                <Icon name='right' size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 分享弹窗 */}
      <ResponsiveDialog
        isOpen={showShareDialog}
        onOpenChange={setShowShareDialog}
        contentProps={{}}
        title='选择分享方式'
      >
        <div className='p-4 pb-16'>
          <div className='mb-4 bg-white rounded-xl p-4 shadow-lg border border-[#f3f4f6]'>
            {/* 标题 */}
            <h3 className='m-0 mb-3 text-[#111827] text-lg font-bold'>
              临时链接说明
            </h3>

            {/* 详细说明 */}
            <div className='text-[#4b5563] text-sm leading-relaxed'>
              <p className='m-0'>
                此链接为您的专属临时链接。请在{' '}
                <strong className='text-[#dc2626]'>3天 (72小时)</strong>{' '}
                内完成支付。
              </p>
              <div className='mt-4 text-[#6b7280] text-[13px]'>
                <div>
                  ✅ <strong>付费即时生效</strong>
                  ：支付成功后，权限秒级开通，无需更换链接。
                </div>
              </div>
            </div>
          </div>
          <div className='flex flex-col gap-3'>
            <button
              onClick={() => handleShareToWechatForTemp()}
              className='flex items-center justify-center gap-2 h-12 bg-[#07c160] text-white rounded-lg font-medium active:opacity-80'
            >
              <img
                src='https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png'
                alt='微信'
                className='w-6 h-6'
              />
              <span>微信好友</span>
            </button>
            <button
              onClick={handleCopyLink}
              className='flex items-center justify-center gap-2 h-12 bg-[#f5f5f5] text-[#333] rounded-lg font-medium active:opacity-80'
            >
              <img
                src='https://img2.maka.im/cdn/webstore10/jiantie/icon_lianjie.png'
                alt='链接'
                className='w-6 h-6'
              />
              <span>复制链接</span>
            </button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
};

export default MakaVipPop;
