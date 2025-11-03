import ImageCropper from '@/app/mobile/share/components/ImageCropper';
import { checkBindPhone, getAppId, getUid } from '@/services';
import { updateWorksDetail2 } from '@/services/works2';
import { useStore } from '@/store';
import { API, cdnApi, getWorksDetailStatic } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

const pageWidth = 375;
const pageHeight = 667;
const innerWidth = 375;

const Preview = (props: { worksId: string; onClose: () => void }) => {
  const { worksId, onClose } = props;
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cover, setCover] = useState('');
  const [showCrop, setShowCrop] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { permissions, setBindPhoneShow } = useStore();
  const [hasBindPhone, setHasBindPhone] = useState(false);

  const handleKeyDown = (event: any) => {
    const ESC_KEY = 27;
    if (event.keyCode === ESC_KEY) {
      onClose();
    }
  };

  const onCheckBindPhone = async () => {
    const hasBind = await checkBindPhone(getUid(), getAppId());
    setHasBindPhone(hasBind);
  };

  useEffect(() => {
    onCheckBindPhone();
    setTitle(getWorksDetailStatic().title);
    setDesc(getWorksDetailStatic().desc || '');
    setCover(getWorksDetailStatic().cover || '');
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const onChangeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxSize = 50;
    let files = e.target.files;
    if (files?.length) {
      const file = files[0];
      if ((file as File).size * 0.001 > maxSize * 1024) {
        toast.error(`文件不能超过${maxSize}mb`);
        return;
      }

      setCropImageUrl(URL.createObjectURL(file));
      setShowCrop(true);
    }
  };

  const showVipModal = () => {
    // window.open('https://www.maka.im/mk-web-store-v7/makapc/pricing');
    window.parent.postMessage({ type: 'vip', data: true }, API('根域名'));
  };

  const canShare =
    permissions?.tiantianhuodong_sharing ||
    permissions?.H5_wenzhangH5_work_sharing;

  return (
    <div className={styles.previewContainer}>
      <div className='flex items-center justify-between w-full h-14 bg-white border-b border-[#E5E5E5] px-4'>
        <span className={styles.esc_preview}>按 ESC 退出预览</span>
        <Button size='sm' onClick={() => onClose()}>
          返回编辑
        </Button>
      </div>
      <div className={styles.content}>
        <div className={styles.iframeContainer}>
          <iframe
            src={`https://www.jiantieapp.com/viewer2/${worksId}?appid=maka`}
            height='100%'
            width='100%'
            style={{
              width: innerWidth,
              height: Math.floor(pageHeight / (pageWidth / innerWidth)),
              transform: `scale(${pageWidth / innerWidth})`,
            }}
          ></iframe>
        </div>
        <div className={styles.worksSetting}>
          <div className='p-4 flex flex-col gap-3'>
            <Label>作品名称</Label>
            <div className={styles.inputWrap}>
              <Input
                value={title}
                className={styles.input}
                onChange={e => {
                  setTitle(e.target.value);
                }}
                onBlur={() => {
                  updateWorksDetail2(worksId, {
                    title: title,
                  });
                }}
                placeholder='请输入作品名称'
              />
            </div>

            <div className={styles.shareContent}>
              <input
                className={styles.uploadInput}
                ref={inputRef}
                onChange={onChangeUpload}
                type='file'
                accept='image/*'
                multiple={false}
              />

              <div className={styles.textarea}>
                <Textarea
                  value={desc}
                  onChange={e => {
                    setDesc(e.target.value);
                  }}
                  onBlur={() => {
                    updateWorksDetail2(worksId, {
                      desc: desc,
                    });
                  }}
                  placeholder='请输入作品描述'
                />
              </div>

              <div
                className={styles.shareImg}
                onClick={async () => {
                  inputRef.current?.click();
                }}
              >
                <img src={cdnApi(cover)} alt='cover' />
                <div className={styles.btn}>修改封面</div>
              </div>
            </div>
            {!hasBindPhone && (
              <div className={styles.share_reject_content}>
                <div className={styles.reject_warning}>
                  <Icon name='info' size={22} color='#F5222D' />
                  <span>根据国家网络安全法规定，内容发布需绑定实名手机号</span>
                </div>
                <div className='flex justify-end'>
                  <Button size='xs' onClick={() => setBindPhoneShow(true)}>
                    去绑定
                  </Button>
                </div>
              </div>
            )}

            {hasBindPhone && (
              <>
                {canShare && (
                  <div className='flex flex-col gap-2 mt-2'>
                    <Label>扫码分享</Label>
                    <div className='flex items-center gap-3'>
                      <QRCodeCanvas
                        size={90}
                        value={`https://www.jiantieapp.com/viewer2/${worksId}?appid=maka`}
                      ></QRCodeCanvas>
                      <Textarea
                        className='h-[92px] resize-none'
                        value={`https://www.jiantieapp.com/viewer2/${worksId}?appid=maka`}
                      ></Textarea>
                    </div>
                    <Button
                      className='w-full'
                      onClick={() => {
                        const shareUrl = `https://www.jiantieapp.com/viewer2/${worksId}?appid=maka`;
                        navigator.clipboard.writeText(shareUrl);
                        toast.success('复制成功');
                      }}
                    >
                      复制链接
                    </Button>
                  </div>
                )}
                {!canShare && (
                  <div className='flex align-center gap-2 w-full'>
                    <Button
                      className='flex-1'
                      style={{
                        background: 'linear-gradient(135deg,#ffecc9,#f3c97c)',
                        color: '#613400',
                      }}
                      onClick={() => showVipModal()}
                    >
                      升级会员获取长期链接
                    </Button>
                  </div>
                )}
              </>
            )}

            <div className={styles.share_footer}>
              <span>分享即代表您已阅读并同意</span>
              <a
                href='https://nwap.maka.im/nwap/auditCriteria'
                target='view_frame'
              >
                《MAKA内容审核标准及违规处理》
              </a>
            </div>
          </div>
        </div>
      </div>

      <ResponsiveDialog
        isOpen={showCrop}
        onOpenChange={setShowCrop}
        handleOnly={true}
        contentProps={{
          style: {
            height: '80vh',
          },
        }}
      >
        <ImageCropper
          worksId={worksId}
          imageUrl={cropImageUrl} // 使用 blob:url 也可以
          onClose={() => setShowCrop(false)}
          onChange={url => {
            setCover(url);
            updateWorksDetail2(worksId, {
              cover: url,
            });
            setShowCrop(false);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
};

export default Preview;
