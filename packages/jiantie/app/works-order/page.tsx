'use client';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import OssUploader from '@/components/OssUpload';
import { getAppId, getPromptApiHost, getUid, request } from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { isMakaAppAndroid } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { cn } from '@workspace/ui/lib/utils';
import { observer } from 'mobx-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

// 功能建议 产品缺陷
const types = [
  {
    icon: '🤔',
    label: '问题反馈',
    value: '产品缺陷',
    desc: '使用中的问题',
    placeholder: '请详细描述遇到的问题，包括操作步骤...',
  },
  {
    icon: '💡',
    label: '产品建议',
    value: '功能建议',
    desc: '功能优化想法',
    placeholder: '请描述您的建议，我们会认真考虑...',
  },
  {
    icon: '🧩',
    label: '模板提需',
    value: '模板提需',
    desc: '催更新或不满意',
    placeholder:
      '请描述您需要的模板类型，包括不限于行业、用途、规格（例如海报、H5、折页等）...',
  },
];

function Page() {
  const { userProfile } = useStore();
  const searchParams = useSearchParams();
  const hideHeader = searchParams.get('hideHeader');
  const defaultType = searchParams.get('default_type');

  // 从 URL 参数获取默认类型，如果参数值在 types 中存在则使用，否则使用第一个类型
  const getInitialType = () => {
    if (defaultType) {
      const foundType = types.find(item => item.value === defaultType);
      if (foundType) {
        return foundType.value;
      }
    }
    return types[0].value;
  };

  const [type, setType] = useState(getInitialType);
  const [value, setValue] = useState('');
  const [needReture, setNeedReture] = useState(false);
  const [picture, setPicture] = useState('');
  const [phone, setPhone] = useState(userProfile?.auths?.phone?.loginid || '');
  const [submitting, setSubmitting] = useState(false);
  const [showThankDialog, setShowThankDialog] = useState(false);
  const OssUploaderRef = useRef<any>(null);

  useEffect(() => {
    if (userProfile?.auths?.phone?.loginid) {
      setPhone(userProfile.auths.phone.loginid);
    }
  }, [userProfile]);

  const uploadToGetFileToken = async (url: string) => {
    const res = await request.post(
      `${getPromptApiHost()}/work-order/v3/upload-file`,
      {
        url,
      }
    );
    return res;
  };

  const onClosePage = () => {
    if (APPBridge.judgeIsInApp()) {
      // 关闭页面
      APPBridge.appCall({
        type: 'MKPageClose',
      });
    } else {
      //如果没有的回去则跳转
      if (history.length <= 1) {
        window.location.href = '/';
        return;
      }
      history.back();
    }
  };

  const onSubmit = async () => {
    if (submitting) {
      return;
    }

    if (!value) {
      toast.error('请输入反馈内容');
      return;
    }

    mkWebStoreLogger.track_click({
      page_type: 'work_order_page',
      page_id: 'work_order_page',
      object_id: JSON.stringify(value),
    });

    setSubmitting(true);
    toast.loading('提交中...');
    try {
      let file_token = '';
      if (picture) {
        file_token = (await uploadToGetFileToken(picture)) as unknown as string;
      }

      const res = await request.post(
        `${getPromptApiHost()}/work-order/v3/create`,
        {
          content: value,
          appid: getAppId(),
          type,
          needReture,
          uid: getUid(),
          file_token: file_token ? [{ file_token }] : undefined,
          phone,
        }
      );

      toast.dismiss();
      setValue('');
      setPicture('');
      setPhone('');
      setSubmitting(false);
      setShowThankDialog(true);
    } catch (error) {
      toast.dismiss();
      toast.error('提交失败, 请稍后重试');
    }
  };

  const onUploadClick = () => {
    if (isMakaAppAndroid()) {
      APPBridge.appCall(
        {
          type: 'MKAlbumAuthSetting',
          params: {},
          jsCbFnName: 'appBridgeOnAppSetAuthCb',
        },
        cbParams => {
          console.log('cbParams', cbParams);
          if (cbParams?.authorized && cbParams?.authorized === '1') {
            OssUploaderRef.current?.upload();
          }
        },
        60000
      );
    } else {
      OssUploaderRef.current?.upload();
    }
  };

  const kefu = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall({
        type: 'MkOpenAppKefu',
        params: {},
      });
    } else if (APPBridge.judgeIsInMiniP()) {
      APPBridge.minipNav('navigate', '/pages/kefu/index');
    } else {
      window.location.href =
        'https://work.weixin.qq.com/kfid/kfc815adea102660ae6';
    }
  };

  return (
    <div className='h-screen h-dvh bg-white flex flex-col'>
      {!hideHeader && (
        <MobileHeader
          title='意见反馈'
          rightText='在线客服'
          onRightClick={() => kefu()}
        />
      )}
      <div
        className='flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-white'
        style={{
          backgroundImage:
            "url('https://img2.maka.im/cdn/webstore10/jiantie/works_order_bg.png')",
          backgroundSize: '100% 290px',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div>
          <div className='font-semibold text-sm leading-5 text-foreground mb-1.5'>
            反馈类型
          </div>
          <div className='flex items-center gap-3'>
            {types.map(item => (
              <div
                key={item.value}
                className={cn(
                  'flex-1 border-2 rounded-md flex flex-col items-center py-3 bg-white',
                  item.value === type ? 'border-zinc-900' : 'border-zinc-200'
                )}
                onClick={() => setType(item.value)}
              >
                <div className='text-xl leading-[30px]'>{item.icon}</div>
                <div className='my-2 mb-0.5 font-semibold text-sm leading-5 text-foreground'>
                  {item.label}
                </div>
                <div className='text-xs leading-[18px] text-foreground'>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className='font-semibold text-sm leading-5 text-foreground mb-1.5'>
            详细描述
          </div>
          <div className='relative border border-zinc-200 rounded-md bg-white'>
            <textarea
              value={value}
              placeholder={types.find(item => item.value === type)?.placeholder}
              onChange={e => {
                setValue(e.target.value);
              }}
              className='w-full h-[92px] resize-none p-2 px-3 border-none outline-none bg-transparent'
            />
            <div className='p-1 px-1.5 text-xs leading-[18px] text-zinc-500 text-right'>
              {value.length}/100
            </div>
          </div>
          <div className='mt-1.5 text-sm leading-5 text-zinc-500'>
            建议详细描述，帮助我们更好地理解您的需求
          </div>
        </div>
        <div>
          <div className='font-semibold text-sm leading-5 text-foreground mb-1.5'>
            图片附件
          </div>
          {picture ? (
            <div className='relative border border-zinc-200 w-[88px] h-[88px] rounded-md'>
              <img
                src={picture}
                alt=''
                className='w-full h-full object-contain'
              />
              <div
                className='absolute top-2 right-2 w-6 h-6 bg-black/60 flex items-center justify-center z-10 text-white rounded-full'
                onClick={() => setPicture('')}
              >
                <Icon name='close' size={16} />
              </div>
            </div>
          ) : (
            <div
              className='border border-zinc-200 w-[88px] h-[88px] rounded-md flex items-center justify-center flex-col'
              onClick={() => onUploadClick()}
            >
              <Icon name='plus' size={32} color='#71717A' />
              <span className='text-[13px] leading-5 text-center text-zinc-500'>
                上传图片
              </span>
            </div>
          )}

          <OssUploader
            className='absolute left-[-999999px]'
            ref={OssUploaderRef}
            label='更换图片'
            accept='image/*'
            folderDir='thumb'
            onComplete={(url: string, ossPath: string) => {
              console.log(url, ossPath);
              setPicture(url);
            }}
          />
        </div>
        <div className='border-t border-zinc-200 py-3'>
          <div
            className='flex items-center gap-1.5 font-semibold text-sm leading-5 text-foreground'
            onClick={() => setNeedReture(!needReture)}
          >
            {needReture ? (
              <Icon name='check-one' color='#3358D4' />
            ) : (
              <Icon name='danxuan3' />
            )}
            希望产品团队联系我
          </div>
          <div className='text-xs leading-[18px] text-zinc-500 mt-1.5'>
            勾选后我们可能会主动联系您进行深度交流
          </div>

          {needReture && (
            <div className='mt-2'>
              <div className='font-semibold text-sm leading-5 text-foreground mb-1.5'>
                联系电话
              </div>
              <div className='relative border border-zinc-200 rounded-md bg-white h-10 w-full'>
                <input
                  type='tel'
                  placeholder='请输入您的联系电话'
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                  }}
                  className='w-full h-full outline-none border-none p-2 px-3 bg-transparent'
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className='flex-shrink-0 p-2 px-4 pb-4 border-t border-zinc-200'>
        <div className='text-xs leading-[18px] text-zinc-500 mb-2 text-center'>
          客服在线时间：周一至周五9:00～18:30
        </div>

        <Button
          className='h-12 w-full rounded-md bg-[#3358d4] text-zinc-50 font-semibold text-base leading-[48px] text-center cursor-pointer'
          onClick={() => onSubmit()}
          disabled={submitting}
        >
          提交反馈
        </Button>
      </div>
      <ResponsiveDialog
        isOpen={showThankDialog}
        onOpenChange={isOpen => {
          setShowThankDialog(isOpen);
          if (!isOpen) {
            if (!hideHeader) {
              setTimeout(() => {
                // onClosePage();
              }, 300);
            }
          }
        }}
        title='感谢您的反馈'
        showCloseIcon={true}
        isDialog={true}
        contentProps={{
          className: 'm-1 w-full max-w-[320px]',
        }}
      >
        <div className='px-6 pb-6 pt-4'>
          <p className='text-sm text-muted-foreground leading-6 mb-6'>
            感谢您的支持！我们会认真对待每一条反馈。如遇登录异常、会员未到账等紧急问题，点击下方联系客服可快速解决。
          </p>
          <div className='flex gap-3 justify-center'>
            <Button
              variant='outline'
              size='lg'
              onClick={() => {
                setShowThankDialog(false);
                if (!hideHeader) {
                  setTimeout(() => {
                    // onClosePage();
                  }, 300);
                }
              }}
            >
              取消
            </Button>
            <Button
              variant='outline'
              size='lg'
              style={{
                backgroundColor: '#3358d4',
                color: 'white',
              }}
              onClick={() => {
                setShowThankDialog(false);
                kefu();
              }}
            >
              联系客服
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

export default observer(Page);
