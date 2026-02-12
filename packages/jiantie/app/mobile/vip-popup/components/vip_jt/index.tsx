'use client';
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
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import {
  EventEmitter,
  isAndroid,
  isIOS,
  isMakaAppClient,
  isWechat,
  queryToObj,
} from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import axios from 'axios';
import cls from 'classnames';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import {
  Baby,
  GraduationCap,
  HeartHandshake,
  House,
  Sparkles,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
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
  desc: string | null;
  productSkus: Array<any>;
  privileges?: string | null;
  spuCode: string;
}

interface Props {
  onClose?: () => void;
  className?: string;
  hideHeader?: boolean;
  vipABTest?: string;
  appid?: string;
  modulo: number;
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

const JTVip = (props: Props) => {
  const appid = props.appid || getAppId();
  const [isApp, setIsApp] = useState(false);
  const { setCustomerVips, setVipShow, vipTrackData, userProfile } = useStore();
  const activeTab = 'personal';
  const [vipPackage, setVipPackage] =
    useState<Record<string, Array<WorkPricePackage>>>();
  const [, setSelectedIndex] = useState(0);
  const [payType, setPayType] = useState('wechat');
  const [servicesOpen, setServicesOpen] = useState(false);
  const orderId = useRef('');
  const checkTimer = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [isIosMiniProgram, setIsIosMiniProgram] = useState(false);
  const [paymentType, setPaymentType] = useState<'annual' | 'single'>('single');
  const retryCount = useRef<number>(0);

  const isOversea = getIsOverSeas();

  const [supportRNIAP, setSupportRNIAP] = useState(false);
  const [supportRNWXPAY, setSupportRNWXPAY] = useState(false);
  const [supportRNALIPAY, setSupportRNALIPAY] = useState(false);
  const [workCover, setWorkCover] = useState<string>('');
  const [workTitle, setWorkTitle] = useState<string>('');
  const [workUpdateTime, setWorkUpdateTime] = useState<string>('');

  // 将接口返回的 products 转成页面使用的数据结构
  const formatVipPackages = (products: Array<VipPackage>) => {
    const data: Record<string, Array<WorkPricePackage>> = {
      personal: [],
    };

    products.forEach((item: VipPackage) => {
      let privileges: Array<{ text: string }> = [];
      if (item.privileges) {
        try {
          privileges = JSON.parse(item.privileges);
        } catch {
          privileges = [];
        }
      }

      item.productSkus.forEach((sku: any) => {
        const style = sku.style || {};

        const pack: WorkPricePackage = {
          name: sku.name || item.name,
          desc: sku.desc || item.desc || '',
          price: sku.price,
          originalPrice: sku.originalPrice ?? sku.price,
          skuCode: sku.skuCode,
          iapProductId: sku.iapProductId || '',
          currency: sku.currency,
          duration: sku.duration,
          privileges,
          style: {
            corePrivileges: style.corePrivileges || '',
            cornerColor: style.cornerColor || '',
            cornerText: style.cornerText || '',
            payTip: style.payTip || '',
            priceBadge: style.priceBadge || '',
          },
        };

        // 目前 jiantie 只有一个 tab，全部归到 personal 里
        data.personal.push(pack);
      });
    });

    return data;
  };

  const getPackages = async () => {
    let worksModule = props.modulo;

    const res = await getWorkPricePackageV2(
      worksModule,
      vipTrackData?.works_id
    );
    if (res) {
      const data = formatVipPackages((res as any).products);
      setVipPackage(data);

      // 设置默认支付类型为单份购，没有单份才选中annual
      const singlePkg = data[activeTab]?.find(
        item => item.skuCode.indexOf('jiantie.work') > -1
      );
      if (singlePkg) {
        const index = data[activeTab].findIndex(
          item => item.skuCode === singlePkg.skuCode
        );
        if (index !== -1) {
          setSelectedIndex(index);
          setPaymentType('single');
        }
      } else {
        // 如果没有单份购，则选择年会员
        const annualPkg = data[activeTab]?.find(
          item => item.skuCode.indexOf('vip') > -1
        );
        if (annualPkg) {
          const index = data[activeTab].findIndex(
            item => item.skuCode === annualPkg.skuCode
          );
          if (index !== -1) {
            setSelectedIndex(index);
            setPaymentType('annual');
          }
        }
      }

      if (vipTrackData.spuCode) {
        const index = data[activeTab].findIndex(
          item => item.skuCode.indexOf(vipTrackData.spuCode) !== -1
        );
        if (index !== -1) {
          setSelectedIndex(index);
          // 根据spuCode设置支付类型
          if (data[activeTab][index].skuCode.indexOf('jiantie.vip') > -1) {
            setPaymentType('annual');
          } else if (
            data[activeTab][index].skuCode.indexOf('jiantie.work') > -1
          ) {
            setPaymentType('single');
          }
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

  const initData = async () => {
    getPackages();

    // 如果是小程序，请打点 VIEW_CONTENT
    if (getAppId() === 'jiantie' && APPBridge.judgeIsInMiniP()) {
      try {
        const uid = getUid();
        if (uid) {
          await axios.post('/api/track-conv', {
            event: 'VIEW_CONTENT',
            uid: +uid,
            data: {
              params: {
                object: 'products',
              },
            },
          });
        }
      } catch (error) {
        console.error('打点 VIEW_CONTENT 失败:', error);
      }
    }
  };

  const getWorkInfo = async () => {
    if (!vipTrackData?.works_id) {
      return;
    }
    try {
      const res = await getWorkData2(vipTrackData.works_id);
      if (res?.detail) {
        const coverSrc = res.detail.cover
          ? cdnApi(res.detail.cover, {
            resizeWidth: 200,
            format: 'webp',
          })
          : '';
        setWorkCover(coverSrc);

        setWorkTitle(res.detail.title || '');
        setWorkUpdateTime((res.detail as any).update_time || '');
      }
    } catch (error) {
      console.error('获取作品信息失败:', error);
    }
  };

  const getCurrentPackage = () => {
    if (paymentType === 'annual') {
      return annualPackage;
    } else {
      return singlePackage;
    }
  };

  useEffect(() => {
    if (appid) {
      initData();
      getWorkInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appid]);

  useEffect(() => {
    setIsIosMiniProgram(!!isIOS() && APPBridge.judgeIsInMiniP());
    initPaySupport();
    setIsApp(isMakaAppClient());
  }, []);

  useEffect(() => {
    mkWebStoreLogger.track_pageview({
      page_type: 'vip_intercept_page',
      page_id: vipTrackData.works_id || '',
      parent_page_type: vipTrackData.parent_page_type || '',
      ref_page_type: '',
      ref_page_id: decodeURIComponent(vipTrackData.ref_page_id || ''),
      page_inst_id: decodeURIComponent(vipTrackData.page_inst_id || ''),
      ref_object_id: vipTrackData.ref_object_id || '',
    });
  }, []);

  const onCreateOrder = async () => {
    toast.loading('创建订单中...', {
      duration: 5000,
    });
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
    if (retryCount.current >= 15) {
      clearTimeout(checkTimer.current);
      setLoading(false);
      retryCount.current = 0;
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
        retryCount.current += 1;
        checkPayStatus();
      }, 1000);
    }
  };

  const payResult = () => {
    (window as any)._onNativeMessage = (name: string, param: any) => {
      toast.dismiss();
      if (name === 'pay_result') {
        if (param.code === 0) {
          retryCount.current = 0;
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
    } catch {
      toast.error('支付失败');
    }
  };

  const toPay = async () => {
    // 小程序支付
    if (isIosMiniProgram) {
      APPBridge.minipNav(
        'navigate',
        `/pages/iosguide/index?works_id=${vipTrackData.works_id}&trk_str=${encodeURIComponent(JSON.stringify(vipTrackData))}`
      );
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
      toast.loading('IAP支付调用中...', {
        duration: 1000,
      });
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
    // else if (isOversea) {
    //   toast.loading('g支付调用中...', {
    //     duration: 5000,
    //   });
    //   APPBridge.appCall(
    //     {
    //       type: 'MKGooglePay',
    //       params: {
    //         productId: cuPackage.iapProductId,
    //         workId: vipTrackData.works_id,
    //       },
    //       jsCbFnName: 'appBridgeOnMKGooglePayCb',
    //     },
    //     cbParams => {
    //       if (cbParams && cbParams?.status === '1') {
    //         getUserVip();
    //         toast.dismiss();
    //         setVipShow(false);
    //       }
    //     },
    //     60000
    //   );
    // }

    else {
      // toast.loading('支付调用中...', {
      //   duration: 1000,
      // });
      const order = await onCreateOrder();

      // toast.loading('创建订单完成', {
      //   duration: 1000,
      // });

      const { orderNo, amount } = order;
      const WINDOW = window as any;
      orderId.current = orderNo;
      clearTimeout(checkTimer.current);

      // 安卓原生支持支付宝支付
      if (isAndroid() && supportRNALIPAY && payType === 'ali') {
        toast.loading('支付宝调用中...', {
          duration: 5000,
        });
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
              retryCount.current = 0;
              checkPayStatus();
            } else {
              toast.dismiss();
              toast.error(msg);
            }
          },
          60 * 60 * 1000
        );
      } else if (isAndroid() && supportRNWXPAY && payType === 'wechat') {
        toast.loading('微信支付调用中...', {
          duration: 5000,
        });
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
              retryCount.current = 0;
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
        retryCount.current = 0;
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
      'https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/简帖用户服务协议.html?v5';
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      window.open(url);
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

  const getAnnualPackage = () => {
    return vipPackage?.[activeTab]?.find(
      item => item.skuCode.indexOf('jiantie.vip') > -1
    );
  };

  const getSinglePackage = () => {
    return vipPackage?.[activeTab]?.find(
      item => item.skuCode.indexOf('jiantie.work') > -1
    );
  };

  const annualPackage = getAnnualPackage();
  const singlePackage = getSinglePackage();

  return (
    <div className={cls([styles.container, props.className, styles[appid]])}>
      {!props.hideHeader && (
        <>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              {vipTrackData?.works_id && (
                <div className={styles.avatar}>
                  <img
                    className='w-full h-full object-cover object-top'
                    src={workCover}
                    alt=''
                  />
                </div>
              )}
              <div className={styles.headerInfo}>
                <div className={styles.headerTitle}>
                  {vipTrackData?.works_id && workTitle ? workTitle : '开通会员'}
                </div>
                {workUpdateTime && (
                  <div className={styles.headerTime}>
                    {dayjs(workUpdateTime).format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className={styles.main}>
        {/* 单份支付选项 */}
        {singlePackage && (
          <div
            className={cls([
              styles.singlePackage,
              paymentType === 'single' && styles.selected,
            ])}
            onClick={() => {
              setPaymentType('single');
              const index = vipPackage?.[activeTab]?.findIndex(
                item => item.skuCode === singlePackage.skuCode
              );
              if (index !== undefined && index !== -1) {
                setSelectedIndex(index);
              }
            }}
          >
            <div className={styles.singleContent}>
              <div className={styles.radioButton}>
                {paymentType === 'single' && (
                  <div className={styles.radioCheck}>✓</div>
                )}
              </div>
              <div className={styles.singleInfo}>
                <div className={styles.singleTitle}>单份支付</div>
                <div className={styles.singleDesc}>
                  仅支持当前作品无水印下载分享
                </div>
              </div>
              <div className={styles.singlePrice}>
                {singlePackage.currency === 'CNY' ? '¥' : '$'}
                {singlePackage.price / 100}
              </div>
            </div>
          </div>
        )}
        {/* 年会员选项 */}
        {annualPackage && (
          <div
            className={cls([
              paymentType === 'annual'
                ? styles.annualPackage
                : styles.singlePackage,
              paymentType === 'annual' && styles.selected,
            ])}
            onClick={() => {
              setPaymentType('annual');
              const index = vipPackage?.[activeTab]?.findIndex(
                item => item.skuCode === annualPackage.skuCode
              );
              if (index !== undefined && index !== -1) {
                setSelectedIndex(index);
              }
            }}
          >
            {paymentType === 'annual' ? (
              <div className={styles.annualContent}>
                <div className={styles.annualLeft}>
                  <div className={styles.annualInfo}>
                    <div className={styles.annualHeader}>
                      <div className={styles.radioButton}>
                        {paymentType === 'annual' && (
                          <div className={styles.radioCheck}>✓</div>
                        )}
                      </div>
                      <div className={styles.annualTitle}>
                        <span>全部模板终身免费</span>
                        <span className={styles.limitedTag}>限时买断</span>
                      </div>
                      {annualPackage.originalPrice &&
                        annualPackage.originalPrice !== annualPackage.price && (
                          <div className={styles.annualPriceInline}>
                            <div className={styles.originalPrice}>
                              {annualPackage.currency === 'CNY' ? '¥' : '$'}
                              {annualPackage.originalPrice / 100}
                            </div>
                            <div className={styles.currentPrice}>
                              <span className={styles.currency}>
                                {annualPackage.currency === 'CNY' ? '¥' : '$'}
                              </span>
                              <span className={styles.priceNum}>
                                {annualPackage.price / 100}
                              </span>
                            </div>
                          </div>
                        )}
                    </div>

                    <div className={styles.annualFeatures}>
                      <div className={styles.featureItem}>
                        <HeartHandshake size={18} />
                        <span>婚礼/订婚</span>
                      </div>
                      <div className={styles.featureItem}>
                        <Baby size={18} />
                        <span>满月/百日</span>
                      </div>
                      <div className={styles.featureItem}>
                        <GraduationCap size={18} />
                        <span>升学/成人</span>
                      </div>
                      <div className={styles.featureItem}>
                        <House size={18} />
                        <span>乔迁/寿宴</span>
                      </div>
                    </div>

                    <div className={styles.annualSlogan}>
                      <Sparkles size={14} className={styles.sloganIcon} />
                      <div className={styles.sloganText}>
                        <span className='font-bold'>一次开通，终身受用。</span>
                        覆盖婚礼、满月、寿宴、升学等人生所有重要时刻，再无二次收费。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.singleContent}>
                <div className={styles.radioButton}></div>
                <div className={styles.singleInfo}>
                  <div className={styles.singleTitle}>
                    <span>全部模板终身免费</span>
                    <span className={styles.limitedTag}>限时买断</span>
                  </div>
                  <div className={styles.singleDesc}>一次开通，终身受用</div>
                </div>
                <div className={styles.singlePrice}>
                  {annualPackage.originalPrice &&
                    annualPackage.originalPrice !== annualPackage.price ? (
                    <div className={styles.priceWrapper}>
                      <div className={styles.originalPrice}>
                        {annualPackage.currency === 'CNY' ? '¥' : '$'}
                        {annualPackage.originalPrice / 100}
                      </div>
                      <div className={styles.currentPrice}>
                        {annualPackage.currency === 'CNY' ? '¥' : '$'}
                        {annualPackage.price / 100}
                      </div>
                    </div>
                  ) : (
                    <>
                      {annualPackage.currency === 'CNY' ? '¥' : '$'}
                      {annualPackage.price / 100}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <Button className={styles.btnPay} size='lg' onClick={() => toPay()}>
          {paymentType === 'annual' && annualPackage
            ? `¥${annualPackage.price / 100} 立即开通`
            : singlePackage
              ? `¥${singlePackage.price / 100} 立即支付`
              : '立即升级'}
        </Button>

        {isApp && !isIOS() && !isIosMiniProgram ? (
          <div className={styles.footerLinks}>
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
                  <img src={item.icon} alt={item.name} />
                  <span className={styles.name}>{item.name}</span>
                </div>
              ))}
            </div>
            <div className={styles.agreementLink}>
              购买即表示同意
              <span className={styles.link} onClick={userAgreement}>
                《用户协议》
              </span>
            </div>
          </div>
        ) : null}
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

export default observer(JTVip);
