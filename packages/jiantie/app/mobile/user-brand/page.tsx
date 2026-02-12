'use client';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import LibPicture from '@/components/LibPicture';
import { API, getAppId, getUid, request } from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { toVipPage } from '@/utils/jiantie';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ImageCropper from './ImageCropper';
import styles from './index.module.scss';

function Page() {
  const appid = getAppId();
  const { permissions } = useStore();
  const [hasCreated, setHasCreated] = useState(false);
  const [userBrand, setUserBrand] = useState({
    brandLogoUrl: '',
    brandText: '',
  });
  const [showExample, setShowExample] = useState(true);
  const [showPictureSelector, setShowPictureSelector] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const OssUploaderRef = useRef<any>(null);

  const getUserBrand = async () => {
    try {
      const uid = getUid();
      const res: any = await request.get(
        `${API('apiv10')}/user-brand/${appid}/${uid}`
      );
      if (res) {
        setHasCreated(true);
        setUserBrand({
          brandLogoUrl: res.brandLogoUrl,
          brandText: res.brandText,
        });
      }
    } catch (error) { }
  };

  useEffect(() => {
    getUserBrand();
  }, []);

  const onSave = async () => {
    if (!permissions?.custom_logo) {
      toVipPage({ openType: 'brand' });
      return;
    }
    try {
      if (hasCreated) {
        const res: any = await request.patch(
          `${API('apiv10')}/user-brand/${appid}/${getUid()}`,
          {
            brandLogoUrl: userBrand.brandLogoUrl,
            brandText: userBrand.brandText,
          }
        );

        toast.success('保存成功');

        console.log('res', res);
      } else {
        const res: any = await request.post(`${API('apiv10')}/user-brand`, {
          brandLogoUrl: userBrand.brandLogoUrl,
          brandText: userBrand.brandText,
        });
        if (res) {
          console.log('aaaaaa');
          toast.success('保存成功');
        }
      }
    } catch (error) {
      console.log('error', error);
      toast.error('发生错误');
    }
  };

  const onUploadClick = () => {
    // if (isMakaAppAndroid()) {
    //   APPBridge.appCall(
    //     {
    //       type: "MKAlbumAuthSetting",
    //       params: {},
    //       jsCbFnName: "appBridgeOnAppSetAuthCb",
    //     },
    //     (cbParams) => {
    //       console.log("cbParams", cbParams);
    //       if (cbParams?.authorized && cbParams?.authorized === "1") {
    //         OssUploaderRef.current?.upload();
    //       }
    //     },
    //     60000
    //   );
    // } else {
    //   OssUploaderRef.current?.upload();
    // }

    if (APPBridge.judgeIsInApp()) {
      setShowPictureSelector(true);
    } else {
      OssUploaderRef.current.click();
    }
  };

  const onChangeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxSize = 50;
    let files = e.target.files;
    if (files?.length) {
      const file = files[0];
      // if ((file as File).size * 0.001 > maxSize * 1024) {
      //   toast.error(`文件不能超过${maxSize}mb`);
      //   return;
      // }

      setCropImageUrl(URL.createObjectURL(file));
      setShowCrop(true);
    }
  };

  return (
    <div>
      <MobileHeader title='贴牌设置' />
      <div className='p-3 flex flex-col gap-[10px]'>
        {showExample && (
          <div className={styles.example}>
            <Icon
              name='close'
              size={16}
              className={styles.close}
              onClick={() => setShowExample(false)}
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
        )}

        <div className={styles.content}>
          <div className={styles.title}>更换加载页品牌信息</div>
          <div className={styles.fieldItem}>
            <div className={styles.label}>更换logo</div>
            {userBrand.brandLogoUrl ? (
              <div className={styles.picture}>
                <img src={userBrand.brandLogoUrl} alt='' />
                <div
                  className={styles.delete}
                  onClick={() =>
                    setUserBrand({ ...userBrand, brandLogoUrl: '' })
                  }
                >
                  <Icon name='close' size={16} />
                </div>
              </div>
            ) : (
              <div
                className={styles.upload_btn}
                onClick={() => onUploadClick()}
              >
                <Icon name='plus' size={32} color='#71717A' />
                <span>上传图片</span>
              </div>
            )}
            {/* <OssUploader
              className={styles.hiddenUpload}
              ref={OssUploaderRef}
              label="更换图片"
              accept="image/*"
              folderDir="thumb"
              onComplete={(url: string, ossPath: string) => {
                console.log(url, ossPath);
                setUserBrand({ ...userBrand, brandLogoUrl: url });
              }}
            /> */}
            <input
              className={styles.hiddenUpload}
              ref={OssUploaderRef}
              onChange={onChangeUpload}
              type='file'
              accept='image/*'
              multiple={false}
            />
          </div>
          <div className={styles.fieldItem}>
            <div className={styles.label}>品牌文案</div>
            <div className={styles.input}>
              <input
                type='tel'
                placeholder='请输入'
                value={userBrand.brandText}
                onChange={e => {
                  setUserBrand({ ...userBrand, brandText: e.target.value });
                }}
              />
            </div>
          </div>
          <Button className='w-full my-3' size='lg' onClick={() => onSave()}>
            更换信息
          </Button>
        </div>
      </div>
      <ResponsiveDialog
        isOpen={showCrop}
        onOpenChange={setShowCrop}
        handleOnly={true}
      >
        <ImageCropper
          imageUrl={cropImageUrl} // 使用 blob:url 也可以
          onClose={() => setShowCrop(false)}
          onChange={url => {
            setUserBrand({ ...userBrand, brandLogoUrl: url });
            setShowCrop(false);
          }}
        />
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={showPictureSelector}
        onOpenChange={setShowPictureSelector}
        title='更换封面'
        contentProps={{
          className: 'pt-2',
        }}
      >
        <LibPicture
          preUpload={false}
          onSelectItem={(url: string) => {
            setCropImageUrl(url);
            setShowCrop(true);
            setShowPictureSelector(false);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}

export default observer(Page);
