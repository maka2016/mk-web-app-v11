'use client';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import OssUploader from '@/components/OssUpload';
import { getPromptApiHost, request } from '@/services';
import { useStore } from '@/store';
import APPBridge from '@mk/app-bridge';
import { getAppId, getUid } from '@mk/services';
import { isMakaAppAndroid } from '@mk/utils';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { observer } from 'mobx-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

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
  const [type, setType] = useState('产品缺陷');
  const [value, setValue] = useState('');
  const [needReture, setNeedReture] = useState(false);
  const [picture, setPicture] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const OssUploaderRef = useRef<any>(null);
  const searchParams = useSearchParams();
  const hideHeader = searchParams.get('hideHeader');

  useEffect(() => {
    setPhone(userProfile?.auths?.phone?.loginid || '');
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
      toast.success('感谢您的反馈！');
      if (!hideHeader) {
        setTimeout(() => {
          onClosePage();
        }, 500);
      }
      setValue('');
      setPicture('');
      setPhone('');
      setSubmitting(false);
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
    <div className={styles.container}>
      {!hideHeader && (
        <MobileHeader
          title='意见反馈'
          rightText='在线客服'
          onRightClick={() => kefu()}
        />
      )}
      <div className={styles.content}>
        <div>
          <div className={styles.title}>反馈类型</div>
          <div className={styles.types}>
            {types.map(item => (
              <div
                key={item.value}
                className={cls([
                  styles.typeItem,
                  item.value === type && styles.active,
                ])}
                onClick={() => setType(item.value)}
              >
                <div className={styles.icon}>{item.icon}</div>
                <div className={styles.label}>{item.label}</div>
                <div className={styles.desc}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className={styles.title}>详细描述</div>
          <div className={styles.textarea}>
            <textarea
              value={value}
              placeholder={types.find(item => item.value === type)?.placeholder}
              onChange={e => {
                setValue(e.target.value);
              }}
            />
            <div className={styles.wordLimit}>{value.length}/100</div>
          </div>
          <div className={styles.tip}>
            建议详细描述，帮助我们更好地理解您的需求
          </div>
        </div>
        <div>
          <div className={styles.title}>图片附件</div>
          {picture ? (
            <div className={styles.picture}>
              <img src={picture} alt='' />
              <div className={styles.delete} onClick={() => setPicture('')}>
                <Icon name='close' size={16} />
              </div>
            </div>
          ) : (
            <div className={styles.upload_btn} onClick={() => onUploadClick()}>
              <Icon name='plus' size={32} color='#71717A' />
              <span>上传图片</span>
            </div>
          )}

          <OssUploader
            className={styles.hiddenUpload}
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
        <div className={styles.return}>
          <div
            className={styles.text}
            onClick={() => setNeedReture(!needReture)}
          >
            {needReture ? (
              <Icon name='check-one' color='#3358D4' />
            ) : (
              <Icon name='danxuan3' />
            )}
            希望产品团队联系我
          </div>
          <div className={styles.desc}>
            勾选后我们可能会主动联系您进行深度交流
          </div>

          {needReture && (
            <div className='mt-2'>
              <div className={styles.title}>联系电话</div>
              <div className={styles.input}>
                <input
                  type='tel'
                  placeholder='请输入您的联系电话'
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className={styles.footer}>
        <div className={styles.kefu}>客服在线时间：周一至周五9:00～18:30</div>

        <div className={styles.btn_submit} onClick={() => onSubmit()}>
          提交反馈
        </div>
      </div>
    </div>
  );
}

export default observer(Page);
