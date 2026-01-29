'use client';
import CustomerService from '@/components/CustomerService';
import {
  cdnApi,
  checkOrderStatus,
  createOrderV3,
  getAppId,
  getIsOverSeas,
  getLocale,
  getUid,
  getUserRole,
  getWorkData2,
} from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import {
  EventEmitter,
  isAndroid,
  isIOS,
  isMakaAppClient,
  queryToObj,
} from '@/utils';
import { trpcReact } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
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
import { useTranslations } from 'next-intl';
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

const AviteVip = (props: Props) => {
  const appid = props.appid || getAppId();
  const [isApp, setIsApp] = useState(false);
  const { setCustomerVips, setVipShow, vipTrackData } = useStore();
  const activeTab = 'personal';
  const [, setSelectedIndex] = useState(0);
  const [servicesOpen, setServicesOpen] = useState(false);
  const orderId = useRef('');
  const checkTimer = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [isIosMiniProgram, setIsIosMiniProgram] = useState(false);
  const [paymentType, setPaymentType] = useState<'annual' | 'single'>('annual');
  const retryCount = useRef<number>(0);
  const t = useTranslations('VipAvite');

  const isOversea = getIsOverSeas();
  const locale = getLocale();

  const [supportRNIAP, setSupportRNIAP] = useState(false);
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

  // 价格包从 v11 库通过 tRPC 拉取（苹果走苹果支付，安卓走谷歌支付，无需微信/支付宝）
  const { data: pricePackagesRes, isLoading: pricePackagesLoading } =
    trpcReact.vip.getPricePackages.useQuery(
      {
        modulo: props.modulo,
        worksId: vipTrackData?.works_id,
        appid,
        locale,
      },
      { enabled: !!props.modulo }
    );

  const vipPackage = (() => {
    if (!pricePackagesRes?.products) return undefined;
    return formatVipPackages(pricePackagesRes.products as Array<VipPackage>);
  })();



  const initPaySupport = async () => {
    const featureCheck = await APPBridge.featureDetect(['RNIAPPAY']);
    if (featureCheck?.RNIAPPAY) {
      setSupportRNIAP(true);
    }
  };

  const getWorkInfo = async () => {
    if (!vipTrackData?.works_id) {
      return;
    }
    setPaymentType('single');
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
      // initData();
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
      toast.error((res as any).message || t('createOrderFailed'));
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
      toast.success(t('paymentSuccess'));
      setVipShow(false);
    } else {
      checkTimer.current = setTimeout(() => {
        retryCount.current += 1;
        checkPayStatus();
      }, 1000);
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
    }

    // 非 App 内无法使用苹果/谷歌支付，需在 App 内完成购买
    if (!APPBridge.judgeIsInApp()) {
      toast.error(t('paymentInAppRequired'));
      return;
    }

    toast.loading(t('submitting'), {
      duration: 5000,
    });

    const cuPackage = getCurrentPackage();
    if (!cuPackage) {
      return;
    }

    // 苹果走苹果支付（IAP）
    if (supportRNIAP && isIOS()) {
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
          setVipShow(false);
          if (success) {
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
      return;
    }

    // 安卓走谷歌支付（海外）
    if (isAndroid() && isOversea) {
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
          if (cbParams?.status === '1') {
            getUserVip();
            toast.dismiss();
            setVipShow(false);
          }
        },
        60000
      );
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
      item => item.skuCode.indexOf('vip') > -1
    );
  };

  const getSinglePackage = () => {
    return vipPackage?.[activeTab]?.find(
      item => item.skuCode.indexOf('work') > -1
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
                  {vipTrackData?.works_id && workTitle ? workTitle : t('openMembership')}
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
                <div className={styles.singleTitle}>{t('singlePayment')}</div>
                <div className={styles.singleDesc}>
                  {t('singlePaymentDesc')}
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
                        <span>{t('allTemplatesFree')}</span>
                        <span className={styles.limitedTag}>{t('limitedTimePurchase')}</span>
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
                        <span>{t('featureWedding')}</span>
                      </div>
                      <div className={styles.featureItem}>
                        <Baby size={18} />
                        <span>{t('featureBaby')}</span>
                      </div>
                      <div className={styles.featureItem}>
                        <GraduationCap size={18} />
                        <span>{t('featureGraduation')}</span>
                      </div>
                      <div className={styles.featureItem}>
                        <House size={18} />
                        <span>{t('featureHousewarming')}</span>
                      </div>
                    </div>

                    <div className={styles.annualSlogan}>
                      <Sparkles size={14} className={styles.sloganIcon} />
                      <div className={styles.sloganText}>
                        <span className='font-bold'>{t('sloganTitle')}</span>
                        {t('sloganDesc')}
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
                    <span>{t('allTemplatesFree')}</span>
                    <span className={styles.limitedTag}>{t('limitedTime')}</span>
                  </div>
                  <div className={styles.singleDesc}>{t('allScenariosDesc')}</div>
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
            ? t('payNowAnnual', { price: annualPackage.price / 100 })
            : singlePackage
              ? t('payNowSingle', { price: singlePackage.price / 100 })
              : t('upgradeNow')}
        </Button>

        {isApp ? (
          <div className={styles.footerLinks}>
            <div className={styles.agreementLink}>
              {t('agreementPrefix')}
              <span className={styles.link} onClick={userAgreement}>
                {t('userAgreement')}
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
      {(loading || pricePackagesLoading) && (
        <div
          className={styles.uploadLoading}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Loading size={30} />
          <span>{loading ? t('paymentProcessing') : t('loadingPrices')}</span>
        </div>
      )}
    </div>
  );
};

export default observer(AviteVip);
