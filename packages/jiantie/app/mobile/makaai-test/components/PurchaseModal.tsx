'use client';

import supabaseService, { getToken, getUid } from '@/services/supabase';
import APPBridge from '@mk/app-bridge';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface PurchaseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  language?: string;
  moduleId?: number;
}

export default function PurchaseModal({
  isOpen,
  onOpenChange,
  language = 'zh-CN',
  moduleId = 100,
}: PurchaseModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [pricePackData, setPricePackData] = useState<any>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [selectedSku, setSelectedSku] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [supportRNIAP, setSupportRNIAP] = useState<boolean>(false);
  const [iapPrices, setIapPrices] = useState<Record<string, any>>({});

  // 检测是否支持内购支付（苹果/安卓）
  useEffect(() => {
    const initPaySupport = async () => {
      const featureCheck = await APPBridge.featureDetect(['RNIAPPAY']);
      if (featureCheck?.RNIAPPAY) {
        setSupportRNIAP(true);
      }
    };
    initPaySupport();
  }, []);

  // 获取IAP价格
  const fetchIapPrices = async (productIds: string[]) => {
    if (productIds.length === 0) return {};

    try {
      const data = (await APPBridge.appCall(
        {
          type: 'RNGETIAPPRICES' as any,
          params: { productIds },
          jsCbFnName: 'purchaseModalIapPricesCb',
        },
        (callbackData: any) => callbackData,
        5000
      )) as any;

      console.log('1获取IAP价格成功:', data);

      // 处理返回的数据结构 {data: {[productId]: {价格包信息}}}
      // if (data && data.data && typeof data.data === 'object') {
      //   return data.data as Record<string, any>;
      // }

      return data?.data || {};
    } catch (error) {
      console.error('获取IAP价格失败:', error);
      return {};
    }
  };

  // 当弹窗打开时，拉取价格包数据
  useEffect(() => {
    if (isOpen && !hasFetched) {
      setLoading(true);
      setPricePackData(null);

      const fetchPricePackages = async () => {
        try {
          const result = await supabaseService.getProductPackages(
            moduleId,
            language
          );
          if (result.success) {
            setPricePackData(result.data);
            setHasFetched(true);

            // 提取类型并设置默认选中第一个类型
            const types = new Set<string>();
            result.data?.forEach((pkg: any) => {
              pkg.skus?.forEach((sku: any) => {
                if (sku.type) types.add(sku.type);
              });
            });
            const typesArray = Array.from(types);
            if (typesArray.length > 0) {
              setActiveTab(typesArray[0]);
            }

            // 如果支持内购支付，获取IAP价格（苹果和安卓）
            if (supportRNIAP) {
              console.log('1支持内购支付');
              const productIds = new Set<string>();
              result.data?.forEach((pkg: any) => {
                pkg.skus?.forEach((sku: any) => {
                  // 收集苹果和安卓的产品ID
                  if (sku.apple_id) {
                    productIds.add(sku.apple_id);
                  }
                  if (sku.google_id) {
                    productIds.add(sku.google_id);
                  }
                });
              });

              if (productIds.size > 0) {
                const prices = await fetchIapPrices(Array.from(productIds));
                console.log('2获取IAP价格成功:', prices);
                setIapPrices(prices);
              }
            }
          } else {
            console.error('获取价格包失败:', result.error);
          }
        } catch (error) {
          console.error('获取价格包异常:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchPricePackages();
    }
  }, [isOpen, hasFetched, moduleId, language, supportRNIAP]);

  // 提取所有不同的 SKU type
  const getSkuTypes = () => {
    if (!pricePackData) return [];
    const types = new Set<string>();
    pricePackData.forEach((pkg: any) => {
      if (pkg.skus) {
        pkg.skus.forEach((sku: any) => {
          if (sku.type) {
            types.add(sku.type);
          }
        });
      }
    });
    return Array.from(types);
  };

  // 根据当前 tab 过滤 SKU
  const getFilteredPackages = () => {
    if (!pricePackData || !activeTab) return pricePackData;

    return pricePackData
      .map((pkg: any) => ({
        ...pkg,
        skus: pkg.skus?.filter((sku: any) => sku.type === activeTab) || [],
      }))
      .filter((pkg: any) => pkg.skus.length > 0);
  };

  const handlePurchase = async () => {
    if (!selectedSku) {
      toast.error('请先选择一个套餐');
      return;
    }

    console.log('购买 SKU:', selectedSku);
    toast.loading('正在提交购买请求...', { duration: 5000 });

    const webUid = await getUid();
    const webToken = await getToken();
    // 如果支持内购支付（苹果或安卓）
    if (supportRNIAP) {
      // 优先使用 apple_id，其次使用 google_id
      const productId = selectedSku.apple_id || selectedSku.google_id;
      if (!productId) {
        toast.dismiss();
        toast.error('该套餐暂不支持内购支付');
        return;
      }

      APPBridge.appCall(
        {
          type: 'RNIAPPAY' as any,
          params: {
            productId: productId,
            trackData: {
              workId: '123',
            },
            webHeaders: {
              uid: webUid,
              token: webToken,
            },
          },
          jsCbFnName: 'RNIAPPAYCb',
        },
        cbParams => {
          const { success, msg = '支付失败' } = cbParams;
          console.log('内购支付回调:', cbParams);

          toast.dismiss();

          if (success) {
            toast.success(msg || '购买成功！');
            // 关闭弹窗
            onOpenChange(false);
            // 可以在这里刷新用户VIP状态或其他操作
          } else {
            toast.error(msg);
          }
        },
        60 * 60 * 1000 // 60分钟超时
      );
    } else {
      // 如果不支持内购支付，提示用户
      toast.dismiss();
      toast.error('当前设备不支持内购支付，请使用其他支付方式');
      console.log('不支持内购支付，SKU信息:', selectedSku);
    }
  };

  const skuTypes = getSkuTypes();
  const filteredPackages = getFilteredPackages();

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentProps={{
        className: 'max-w-2xl h-[85vh] flex flex-col p-0',
      }}
    >
      {/* 头部 - 固定 */}
      <div className='flex-shrink-0'>
        <div className='flex items-center justify-between p-6 pb-4 border-b border-gray-200'>
          <h2 className='text-xl font-bold text-gray-900'>选择套餐</h2>
          <button
            onClick={() => onOpenChange(false)}
            className='text-gray-500 hover:text-gray-700 transition-colors'
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab 导航栏 */}
        {!loading && skuTypes.length > 0 && (
          <div className='px-6 pt-4 pb-2 border-b border-gray-200'>
            <div className='flex gap-2 overflow-x-auto'>
              {skuTypes.map((type: string) => (
                <button
                  key={type}
                  onClick={() => {
                    setActiveTab(type);
                    setSelectedSku(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === type
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 内容区 - 可滚动 */}
      <div className='flex-1 overflow-y-auto px-6 py-4'>
        {/* 加载状态 */}
        {loading && (
          <div className='flex flex-col items-center justify-center py-20'>
            <div className='w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4'></div>
            <p className='text-sm text-gray-600'>加载价格包中...</p>
          </div>
        )}

        {/* 价格包列表 */}
        {!loading && filteredPackages && (
          <div className='space-y-4'>
            {filteredPackages.length === 0 ? (
              <div className='text-center py-12'>
                <p className='text-gray-500'>该分类暂无套餐</p>
              </div>
            ) : (
              filteredPackages.map((pkg: any, index: number) => (
                <div
                  key={index}
                  className='border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors'
                >
                  {/* SKU 列表 */}
                  {pkg.skus && pkg.skus.length > 0 && (
                    <div className='space-y-2'>
                      {pkg.skus.map((sku: any, skuIndex: number) => {
                        const i18nData = sku.i18n || {};
                        const displayName = i18nData.name || sku.alias;
                        const labels = i18nData.labels || [];
                        const corner = i18nData.corner;
                        const isSelected = selectedSku?.alias === sku.alias;

                        console.log('sku:', sku);
                        // 获取IAP价格信息（优先使用apple_id，其次google_id）
                        const iapPrice = sku.apple_id
                          ? iapPrices[sku.apple_id]
                          : sku.google_id
                            ? iapPrices[sku.google_id]
                            : null;

                        console.log('iapPrices:', iapPrices);
                        const displayPrice =
                          iapPrice?.displayPrice ?? `$${sku.default_price}`;

                        console.log('IAP价格信息:', iapPrice);
                        console.log('显示价格:', displayPrice);

                        return (
                          <div
                            key={skuIndex}
                            onClick={() => setSelectedSku(sku)}
                            className={`relative rounded-lg p-4 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-2 border-blue-500 shadow-md'
                                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                            }`}
                          >
                            {/* 角标 */}
                            {corner && (
                              <div className='absolute -top-2 -right-2 px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-md'>
                                {corner}
                              </div>
                            )}

                            <div className='flex items-start justify-between gap-4'>
                              {/* 选中指示器 */}
                              {isSelected && (
                                <div className='absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center'>
                                  <svg
                                    className='w-3 h-3 text-white'
                                    fill='none'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth='2'
                                    viewBox='0 0 24 24'
                                    stroke='currentColor'
                                  >
                                    <path d='M5 13l4 4L19 7'></path>
                                  </svg>
                                </div>
                              )}

                              {/* 左侧内容区 */}
                              <div className='flex-1'>
                                {/* 名称 */}
                                <div className='flex items-center gap-2 mb-2'>
                                  <span className='font-semibold text-gray-900 text-base'>
                                    {displayName}
                                  </span>
                                </div>

                                {/* Labels 标签数组 */}
                                {labels.length > 0 && (
                                  <div className='flex flex-wrap gap-1.5'>
                                    {labels.map(
                                      (label: string, labelIndex: number) => (
                                        <span
                                          key={labelIndex}
                                          className='px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium'
                                        >
                                          {label}
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* 右侧价格区 */}
                              <div className='text-right flex-shrink-0'>
                                {displayPrice !== undefined && (
                                  <div className='text-xl font-bold text-orange-600'>
                                    {displayPrice}
                                  </div>
                                )}
                                {sku.original_price &&
                                  sku.original_price > sku.default_price && (
                                    <div className='text-sm text-gray-400 line-through mt-0.5'>
                                      ${sku.original_price}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 底部按钮区 - 固定 */}
      <div className='border-t border-gray-200 p-4 flex gap-3 flex-shrink-0 bg-white'>
        <button
          onClick={() => onOpenChange(false)}
          className='flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium'
        >
          取消
        </button>
        <button
          onClick={handlePurchase}
          disabled={!selectedSku}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
            selectedSku
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {selectedSku
            ? (() => {
                const iapPrice = selectedSku.apple_id
                  ? iapPrices[selectedSku.apple_id]
                  : selectedSku.google_id
                    ? iapPrices[selectedSku.google_id]
                    : null;
                const displayPrice =
                  iapPrice?.displayPrice ?? `$${selectedSku.default_price}`;
                return `购买 - ${displayPrice}`;
              })()
            : '请选择套餐'}
        </button>
      </div>
    </ResponsiveDialog>
  );
}
