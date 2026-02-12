'use client';
import Vip from '@/app/mobile/vip-popup/components/vip';
import AviteVip from '@/app/mobile/vip-popup/components/vip_avite';
import JTVip from '@/app/mobile/vip-popup/components/vip_jt';
import JTVip2 from '@/app/mobile/vip-popup/components/vip_jt2';
import {
  getAppId,
  getIsOverSeas,
  getPromptApiHost,
  getUid,
  request,
} from '@/services';
import { abtest } from '@/services/abtest';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { isIOS, isMakaAppAndroid } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import MakaVip from '../MakaVipModal/MakaVipPop';

const options = ['操作不便', '效果不好', '定价不合理'];

const VipModalForJiantie = () => {
  const { vipShow, setVipShow, vipTrackData } = useStore();
  const [worksOrderShow, setWorksOrderShow] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const isOverSea = getIsOverSeas();
  const appid = getAppId();
  const { vipABTest } = useStore();

  const [showJTVip, setShowJTVip] = useState(false);

  const handleComponentSettingClose = () => {
    // const worksId = vipTrackData?.works_id;
    // const localStorageKey = `works_order_${worksId}`;
    // if (worksId && !localStorage.getItem(localStorageKey)) {
    //   setLoading(false);
    //   setSelectedOptions([]);
    //   setInputValue("");
    //   setWorksOrderShow(true);
    //   localStorage.setItem(localStorageKey, "1");
    // }
  };

  useEffect(() => {
    if (appid === 'jiantie' && !isIOS()) {
      setShowJTVip(true);
    }
    if (appid === 'jiantie' && APPBridge.judgeIsInMiniP()) {
      setShowJTVip(true);
    }
  }, [appid]);

  /**
   * 原生工单接口，对应飞书表格中的中文字段
   */
  const createWorkOrder2 = async () => {
    if (loading) return;
    if (!selectedOptions.length && !inputValue) {
      toast('请选择一个选项或者输入其他建议');
      return;
    }
    setLoading(true);
    const fields = {
      处理状态: '待处理',
      用户ID: getUid(),
      工单日期: Date.now(),
      工单类型: '功能缺陷',
      标题: `${selectedOptions.join(',')} ${inputValue}`,
      功能模块: '会员拦截',
      应用: getAppId(),
      终端: isMakaAppAndroid() ? 'Android' : 'web',
      截图地址: '',
    };
    await request.post(`${getPromptApiHost()}/work-order/v2/create`, {
      fields,
    });

    toast.success('感谢您的建议～');
    setWorksOrderShow(false);
  };

  const renderContent = () => {

    if (appid === 'maka') {
      return <MakaVip />;
    }

    if (appid === 'jiantie' && showJTVip) {
      // jiantie 且非 iOS，命中 newVip1/newVip2 实验时渲染新简帖 JTVip 弹窗
      // const worksModule = 315;
      const isMonthVip = abtest('monthVip');
      if (isMonthVip) {
        return <JTVip2 modulo={317} />;
      }
      return <JTVip modulo={315} />;
    }

    if (appid === 'janur') {
      return <AviteVip modulo={1} />;
    }

    return <Vip vipABTest={vipABTest} />;
  };

  return (
    <>
      <ResponsiveDialog
        isOpen={vipShow}
        handleOnly
        contentProps={{
          className: 'rounded-t-xl',
          style: {
            willChange: 'auto',
          },
        }}
        onOpenChange={value => {
          if (!value) {
            handleComponentSettingClose();
          }

          setVipShow(value);
        }}
      >
        {renderContent()}
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={worksOrderShow}
        isDialog
        onOpenChange={setWorksOrderShow}
        contentProps={{
          className: 'w-[330px] p-4',
        }}
      >
        <div>
          <div className='font-[PingFang_SC] font-[var(--font-semibold)] text-base leading-6 text-center text-black/88 mb-4'>
            您的体验对我们很重要！
            <br />
            请给我们一些优化建议～👇
          </div>
          <div className='flex items-center gap-3 mb-3'>
            {options.map(item => {
              const active = selectedOptions.includes(item);
              return (
                <div
                  key={item}
                  className={cls([
                    'flex-1 bg-[#fafafa] font-[PingFang_SC] font-normal text-sm leading-[44px] text-center text-black/88 rounded-lg h-11 border-2',
                    active ? 'border-black' : 'border-[#fafafa]',
                  ])}
                  onClick={() => {
                    if (active) {
                      setSelectedOptions(
                        selectedOptions.filter(it => it !== item)
                      );
                    } else {
                      setSelectedOptions([...selectedOptions, item]);
                    }
                  }}
                >
                  {item}
                </div>
              );
            })}
          </div>
          <Input
            placeholder='输入其他建议'
            type='text'
            max={200}
            maxLength={200}
            className='border border-black/6 h-[46px] text-sm [&::placeholder]:text-black/25'
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
          <div className='flex mt-4 gap-2'>
            <Button
              className='flex-1'
              variant='outline'
              size='lg'
              onClick={() => setWorksOrderShow(false)}
            >
              取消
            </Button>
            <Button
              className='flex-1'
              size='lg'
              onClick={() => createWorkOrder2()}
            >
              {loading ? '提交中...' : '提交'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
};

export default observer(VipModalForJiantie);
