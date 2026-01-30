import { BehaviorBox } from '@/components/BehaviorTracker';
import { API, getAppId, getWorkPricePackageV2 } from '@/services';
import { ProductItem, ProductSku } from '@/services/vip';
import { SerializedWorksEntity } from '@/utils';
import styled from '@emotion/styled';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { cn } from '@workspace/ui/lib/utils';
import axios from 'axios';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const TempLinkBarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 1);
  /* backdrop-filter: blur(10px); */
  border-top: 1px solid #e2e8f0;
  padding: 12px 16px;
  font-size: 12px;
  display: flex;
  align-items: center;
  /* justify-content: space-between; */
  z-index: 111;
  /* box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05); */
  color: #64748b;
  gap: 6px;
  display: flex;
  flex-wrap: wrap;

  .tempLinkText {
    /* flex: 1; */
  }

  .upgradeBtn {
    margin-left: 12px;
    font-family: PingFang SC;
    font-weight: 500;
    font-size: 12px;
    line-height: 18px;
    color: #020617;
    padding: 6px 12px;
    background-color: #f1f5f9;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    transition: background-color 0.2s;

    &:hover {
      background-color: #e2e8f0;
    }
  }
`;

const WechatPayButton = styled.button<{ disabled: boolean }>`
  width: 100%;
  padding: 10px 16px;
  background-color: ${props => (props.disabled ? '#e2e8f0' : '#07c160')};
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: #06ad56;
  }
`;

interface TempLinkBarProps {
  isTempLink?: boolean;
  worksDetail: SerializedWorksEntity;
}

const TempLinkBar = ({ isTempLink, worksDetail }: TempLinkBarProps) => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [pricePackages, setPricePackages] = useState<ProductSku[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hideBar, setHideBar] = useState(false);

  // 计算临时链接过期时间（创建时间+3天）
  const getExpireDate = () => {
    if (!isTempLink || !worksDetail?.create_time) {
      return null;
    }
    const createTime = new Date(worksDetail.create_time);
    const expireTime = new Date(createTime);
    expireTime.setDate(expireTime.getDate() + 3);
    return expireTime;
  };

  const expireDate = getExpireDate();
  const formatExpireDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  // 获取作品价格包
  const fetchPricePackage = async () => {
    try {
      const appid = getAppId();
      // 根据appid确定modulo，默认为1（国内作品）
      let worksModule = 198;
      if (appid === 'xueji') {
        worksModule = 3;
      }

      const res = await getWorkPricePackageV2(worksModule, worksDetail.id);
      if (res && res.products?.length > 0) {
        // 根据 appid 判断取哪个产品
        const productIndex = appid === 'maka' ? 1 : 0;
        const selectedProduct = res.products[productIndex];
        if (selectedProduct?.productSkus?.length > 0) {
          setPricePackages(selectedProduct.productSkus);
          setSelectedProduct(selectedProduct);
        }
      }
    } catch (error) {
      console.error('获取价格包失败:', error);
    }
  };

  // 调用服务端 API 生成临时 token
  const genTempToken = async () => {
    const appid = getAppId();
    const uid = worksDetail.uid;

    try {
      const res = await axios.post('/api/temp-token', {
        appid,
        uid,
      });

      if (res.data?.token) {
        return res.data.token;
      } else {
        throw new Error('获取临时 token 失败');
      }
    } catch (error) {
      console.error('生成临时 token 失败:', error);
      throw error;
    }
  };

  // 创建订单
  const onCreateOrder = async () => {
    const selectedPackage = pricePackages[selectedIndex];
    if (!selectedPackage) {
      toast.error('价格信息加载中，请稍候');
      return null;
    }

    try {
      const token = await genTempToken();
      const params: any = {
        products: [
          {
            skuCode: selectedPackage.skuCode,
            quantity: 1,
          },
        ],
        traceMetadata: {
          workId: worksDetail.id,
          forwardPageName: '',
          refPageType: '',
          refPageId: '',
          refPageInstId: '',
          refPageviewEventId: '',
          refObjectType: '',
          refObjectId: '',
          refObjectInstId: '',
          refEventId: '',
        },
      };

      console.log('params', params);
      const res: any = (
        await axios.post(`${API('apiv10')}/orders/by-sku`, params, {
          headers: {
            'Content-Type': 'application/json',
            token: token,
            uid: worksDetail.uid,
          },
        })
      ).data;
      if (res?.orderNo) {
        return res;
      } else {
        console.log('res', res);
        toast.error((res as any).message || '创建订单失败');
        return null;
      }
    } catch (error: any) {
      console.log('error', error);
      toast.error(error?.message || '创建订单失败');
      return null;
    }
  };

  // 处理微信支付
  const handleWechatPay = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const order = await onCreateOrder();
      if (!order) {
        setLoading(false);
        return;
      }

      const { orderNo } = order;

      // 在微信浏览器中，跳转到收银台
      window.location.href = `${API('根域名')}/syt/wappay?order_id=${orderNo}`;
    } catch (error: any) {
      toast.error(error?.message || '支付失败');
      setLoading(false);
    }
  };

  // 当弹窗打开时，获取价格包
  useEffect(() => {
    if (showUpgradeDialog && pricePackages.length === 0) {
      fetchPricePackage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUpgradeDialog]);

  if (!isTempLink || !expireDate || hideBar) {
    return null;
  }

  return (
    <>
      <TempLinkBarContainer>
        <div className='tempLinkText'>
          预览链接，将于{formatExpireDate(expireDate)}过期，或
        </div>
        <BehaviorBox
          behavior={{
            object_type: 'temp_link_bar_upgrade_btn',
            object_id: worksDetail.id,
          }}
          className='underline text-blue-600 font-medium text-xs'
          onClick={() => setShowUpgradeDialog(true)}
        >
          升级
        </BehaviorBox>
        <span>为长期链接</span>
        <span className='flex-1'></span>
        <X size={12} onClick={() => setHideBar(true)} />
      </TempLinkBarContainer>
      <ResponsiveDialog
        isDialog
        isOpen={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        contentProps={{
          className: 'w-[90%] max-w-[400px] p-6',
        }}
      >
        <div>
          <div className='font-semibold text-lg leading-[26px] text-slate-950 mb-4'>
            升级说明
          </div>
          <div className='text-sm leading-[22px] text-slate-600'>
            <div className='mb-4'>
              <div className='font-medium mb-1'>1. 为本作品付费</div>
              <div className='text-slate-500 text-[13px]'>
                为本作品付费后，立即升级为对应期限的有效链接。
              </div>
            </div>
            <div>
              <div className='font-medium mb-1'>2. 付费方式</div>
              <div className='text-slate-950 text-base font-medium mb-2'>
                {selectedProduct?.name}
              </div>
              {pricePackages.length > 0 && (
                <div className='flex flex-col gap-2 mb-3'>
                  {pricePackages.map((pkg, index) => {
                    console.log('pkg', pkg);
                    return (
                      <div
                        key={pkg.skuCode}
                        onClick={() => setSelectedIndex(index)}
                        className={cn(
                          'p-2.5 px-3 rounded-md cursor-pointer transition-all border-2',
                          selectedIndex === index
                            ? 'border-[#07c160] bg-green-50'
                            : 'border-slate-200 bg-white'
                        )}
                      >
                        <div className='flex justify-between items-center'>
                          <div className='flex-1'>
                            <div className='font-medium text-sm text-slate-950 mb-0.5'>
                              {pkg.name}
                            </div>
                            {pkg.desc && (
                              <div className='text-xs text-slate-500 leading-snug'>
                                {pkg.desc}
                              </div>
                            )}
                          </div>
                          <div className='font-semibold text-base text-[#07c160] ml-3'>
                            ¥{pkg.price / 100}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <WechatPayButton
                onClick={handleWechatPay}
                disabled={loading || pricePackages.length === 0}
              >
                {loading ? (
                  <span>处理中...</span>
                ) : (
                  <>
                    <svg
                      width='18'
                      height='18'
                      viewBox='0 0 24 24'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 4.007-1.98 6.133-1.838-.576-3.583-4.265-6.35-8.678-6.35zM5.785 6.659c.642 0 1.162.532 1.162 1.188 0 .655-.52 1.187-1.162 1.187-.642 0-1.162-.532-1.162-1.187 0-.656.52-1.188 1.162-1.188zm5.813 0c.642 0 1.162.532 1.162 1.188 0 .655-.52 1.187-1.162 1.187-.642 0-1.162-.532-1.162-1.187 0-.656.52-1.188 1.162-1.188zm6.673 2.118c-2.588 0-4.683 2.117-4.683 4.735 0 2.617 2.095 4.734 4.683 4.734.578 0 1.13-.095 1.643-.255a.722.722 0 0 1 .6.082l1.533.896a.27.27 0 0 0 .14.045c.133 0 .24-.11.24-.246 0-.06-.023-.12-.04-.177l-.325-1.23a.49.49 0 0 1 .178-.555c1.654-1.2 2.7-3.02 2.7-5.05 0-2.618-2.095-4.735-4.683-4.735zm-.987 2.704c.5 0 .906.41.906.915a.92.92 0 0 1-.906.916.92.92 0 0 1-.906-.916c0-.505.405-.915.906-.915zm-3.8 0c.5 0 .906.41.906.915a.92.92 0 0 1-.906.916.92.92 0 0 1-.906-.916c0-.505.405-.915.906-.915z'
                        fill='currentColor'
                      />
                    </svg>
                    <span>微信支付</span>
                  </>
                )}
              </WechatPayButton>
            </div>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
};

export default TempLinkBar;
