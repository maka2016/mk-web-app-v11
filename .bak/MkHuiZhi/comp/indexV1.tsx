'use client';
import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import { useViewerSDK } from '@/components/GridViewer/utils/ViewerSDKContext';
import { formReceiverServiceApi } from '@/services';
import { EventEmitter, getCookie, setCookieExpire } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import clas from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { DB, Parser, Player } from 'svga';
import styles from './indexV1.module.scss';

const giftList = [
  {
    id: 2,
    name: '幸福美满',
    preview:
      'https://img2.maka.im/cdn/webstore10/editor/gift/preview_02.png?v=1',
    path: '/cdn/webstore10/editor/gift/gift_02.svga',
  },

  {
    id: 7,
    name: '风轮纳福',
    preview: 'https://img2.maka.im/cdn/webstore10/editor/gift/preview_07.png',
    path: '/cdn/webstore10/editor/gift/gift_07.svga',
  },
  {
    id: 8,
    name: '甜甜蜜蜜',
    preview: 'https://img2.maka.im/cdn/webstore10/editor/gift/preview_08.png',
    path: '/cdn/webstore10/editor/gift/gift_08.svga',
  },
  {
    id: 9,
    name: '甜心永驻',
    preview: 'https://img2.maka.im/cdn/webstore10/editor/gift/preview_09.png',
    path: '/cdn/webstore10/editor/gift/gift_09.svga',
  },
];

function onceSubmitCookiesKey(formID: string) {
  return `${formID}_submited`;
}

interface GiftItem {
  id: number;
  name: string;
  preview: string;
  path: string;
}

interface SubmitItem {
  id: string;
  nickname: string;
  content: GiftItem;
}

interface Props {
  compAttrsMap: {
    MkHuiZhi: LayerElemItem | null;
    MkBulletScreen_v2: LayerElemItem | null;
    MkMapV3: LayerElemItem | null;
    MkGift: LayerElemItem | null;
  };
  style?: React.CSSProperties;
}
const HuizhiComp = (props: Props) => {
  const { compAttrsMap } = props;
  const viewerSDK = useViewerSDK();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    guestCount: 1,
  });

  const [activeItem, setActiveItem] = useState(giftList[0].id);
  const parserRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const dbRef = useRef<any>(null);
  const [playItem, setPlayItem] = useState<SubmitItem | null>();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [overOnceSubmit, setOverOnceSubmit] = useState(false);

  useEffect(() => {
    parserRef.current = new Parser({
      isDisableImageBitmapShim: true,
    });
    const container = document.getElementById('tool-gift-canvas') as
      | HTMLCanvasElement
      | undefined;
    playerRef.current = new Player({
      container,
      // 循环次数，默认值 0（无限循环）
      loop: 1,
      // isCacheFrames: true,
    });
    dbRef.current = new DB();

    playerRef.current.onEnd = () => {
      playerRef.current.stop();
      playerRef.current.clear();
      if (!open) {
        // playNext()
      }
    };

    return () => {
      parserRef.current?.destroy?.();
      playerRef.current?.destroy?.();
    };
  }, []);

  const onPlayItem = async (item: SubmitItem) => {
    const parser = parserRef.current;
    const player = playerRef.current;
    const db = dbRef.current;
    player.stop();
    player.clear();
    setPlayItem(null);

    const url =
      item.content.path.indexOf('http') > -1
        ? item.content.path
        : `https://img2.maka.im${item.content.path}`;

    let svga = await db?.find(url);
    if (!svga) {
      // Parser 需要配置取消使用 ImageBitmap 特性，ImageBitmap 数据无法直接存储到 DB 内
      svga = await parser.load(url);
      await db?.insert(url, svga);
    }
    const canvas = document.getElementById(
      'tool-gift-canvas'
    ) as HTMLCanvasElement | null;
    if (canvas) {
      canvas.width = svga.size.width;
      canvas.height = svga.size.height;
    }

    await player.mount(svga);
    setPlayItem(item);
    player.start();
  };

  useEffect(() => {
    if (compAttrsMap.MkHuiZhi) {
      if (
        getCookie(onceSubmitCookiesKey(compAttrsMap.MkHuiZhi.attrs.formRefId))
      ) {
        setOverOnceSubmit(true);
      }
    }
  }, []);

  const onSubmit = async () => {
    const worksId = viewerSDK?.workInfo?.getWorksID?.() || '';
    // 模板不允许提交
    if (/^T_/.test(worksId)) {
      toast('请分享后使用此功能');
      return;
    }

    if (submitting) {
      return;
    }

    // if (!formData.name) {
    //   toast.error('请填写姓名');
    //   return;
    // }
    setSubmitting(true);
    const request = [];
    const giftItem = giftList.find(item => item.id === activeItem);

    if (compAttrsMap.MkGift?.attrs.show !== false && giftItem) {
      if (!giftItem) {
        return;
      }
      request.push(
        formReceiverServiceApi.formSubmit(
          compAttrsMap.MkGift?.attrs.formRefId,
          {
            formData: {
              nickname: formData.name,
              content: {
                id: giftItem.id,
                name: giftItem.name,
                preview: giftItem.preview,
                path: giftItem.path,
              },
            },
          }
        )
      );
    }

    if (compAttrsMap.MkBulletScreen_v2?.attrs.show !== false) {
      request.push(
        formReceiverServiceApi.formSubmit(
          compAttrsMap.MkBulletScreen_v2?.attrs.formRefId,
          {
            formData: {
              content: comment,
              nickname: formData.name,
            },
          }
        )
      );
    }

    const submitData = {
      scope: viewerSDK?.workInfo?.getWorksID?.(),
      formData,
      wx_avatar: viewerSDK?.wechatInfo?.getWxAvatarThumb?.(),
      wx_nickname: viewerSDK?.wechatInfo?.getNickname?.(),
      openId: viewerSDK?.wechatInfo?.getOpenID?.() || '',
    };

    request.push(
      formReceiverServiceApi.formSubmit(
        compAttrsMap.MkHuiZhi?.attrs.formRefId,
        submitData
      )
    );
    const res = await Promise.all(request);

    setCookieExpire(
      onceSubmitCookiesKey(compAttrsMap.MkHuiZhi?.attrs.formRefId),
      'true'
    );
    setOverOnceSubmit(true);

    playerRef.current?.stop();
    playerRef.current?.clear();
    setPlayItem(null);
    if (compAttrsMap.MkBulletScreen_v2?.attrs.show !== false) {
      EventEmitter.emit('MkBulletScreen_v2_submit', {
        content: comment,
        nickname: formData.name,
      });
    }

    if (compAttrsMap.MkGift?.attrs.show !== false && giftItem) {
      EventEmitter.emit('MkGift_submit', {
        commitId: res[0].data.commitId,
        nickname: formData.name,
        content: {
          id: giftItem.id,
          name: giftItem.name,
          preview: giftItem.preview,
          path: giftItem.path,
        },
      });
    }

    setSubmitting(false);
  };

  const onCloseDialog = () => {
    EventEmitter.emit('MkGift_preview', false);
  };

  if (!compAttrsMap.MkHuiZhi || compAttrsMap.MkHuiZhi?.attrs.show === false) {
    return <>隐藏了回执功能</>;
  }

  return (
    <div className={styles.tools} style={props.style}>
      <div
        className={styles.receipt}
        onClick={() => {
          setOpen(true);
          setFormData({ name: '', guestCount: 1 });
          setComment('');
          setPlayItem(null);
          setActiveItem(giftList[0].id);
          EventEmitter.emit('MkGift_preview', true);
        }}
      >
        <img src='/assets/_logo.png' alt='' />
        <span>填写回执</span>
      </div>

      {createPortal(
        <>
          <canvas
            id='tool-gift-canvas'
            className={styles.giftCanvas}
            style={{
              top: open ? '-10%' : 0,
            }}
          ></canvas>
          {playItem && (
            <div
              className={styles.gift_message}
              style={{
                bottom: open ? 520 : 160,
              }}
            >
              <div className={styles.gift_logo}>
                <img
                  src='https://img2.maka.im/cdn/webstore10/editor/gift/gift_logo_v2.png'
                  alt=''
                />
              </div>
              <div className={styles.gift_message_content}>
                <p className={styles.name}>{playItem?.nickname}</p>
                <p className={styles.label}>送出 {playItem?.content.name}</p>
              </div>
              <div className={styles.gift_preview}>
                <img src={playItem?.content.preview} alt='' />
              </div>
            </div>
          )}
        </>,
        document.body
      )}
      <ResponsiveDialog
        isOpen={open}
        onOpenChange={value => {
          setOpen(value);
          if (!value) {
            onCloseDialog();
          }
        }}
        showOverlay={false}
        contentProps={{
          className: styles.dialog,
        }}
      >
        <Icon
          name='close'
          size={20}
          onClick={() => {
            setOpen(false);
            onCloseDialog();
          }}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            cursor: 'pointer',
            zIndex: 9,
          }}
        />
        {overOnceSubmit ? (
          <div>
            <div className={styles.success_content}>
              <div className={styles.submit_success}>
                <img
                  src='https://img2.maka.im/cdn/mk-widgets/assets/submit_success.png'
                  alt=''
                />
                <span>
                  {compAttrsMap.MkHuiZhi?.attrs.feedback ||
                    '感谢您的回复！我们期待与您共同分享这个美好时刻。'}
                </span>
              </div>
            </div>
            <div
              className={styles.resubmit}
              onClick={() => setOverOnceSubmit(false)}
            >
              再次提交
            </div>
          </div>
        ) : (
          <>
            <div className={styles.title}>
              <img
                src='https://img2.maka.im/cdn/webstore10/jiantie/icon_huizhi.png'
                alt=''
              />
              <span>回执</span>
            </div>
            <div className={styles.content}>
              <div className={styles.contentTitle}>出席信息</div>
              <div className={styles.huizhi}>
                <div className={styles.fieldItem}>
                  <div className={styles.label}>
                    <span className={styles.required}>*</span>
                    <span>姓名</span>
                  </div>
                  <input
                    type='text'
                    className={styles.input}
                    value={formData.name}
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                    }}
                    placeholder='请输入'
                  />
                </div>
                <Separator />
                <div className={styles.fieldItem}>
                  <div className={styles.label}>
                    <span className={styles.required}>*</span>
                    <span>出席人数</span>
                  </div>
                  <div className={styles.number_input_container}>
                    <div
                      className={clas(
                        styles.number_input_icon,
                        formData.guestCount <= 1 && styles.disabled
                      )}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          guestCount: formData.guestCount - 1,
                        })
                      }
                    >
                      <Icon name='reduce-fill' size={18} />
                    </div>
                    <div className={styles.number_input}>
                      {formData.guestCount}
                    </div>
                    <div
                      className={styles.number_input_icon}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          guestCount: formData.guestCount + 1,
                        })
                      }
                    >
                      <Icon name='add-fill' size={18} />
                    </div>
                  </div>
                </div>
                <Separator />
              </div>
              {compAttrsMap.MkBulletScreen_v2?.attrs.show !== false && (
                <>
                  <div className={styles.contentTitle}>留言祝福</div>
                  <input
                    className={styles.comment}
                    placeholder='写下您的祝福...'
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                </>
              )}

              {compAttrsMap.MkGift?.attrs.show !== false && (
                <>
                  <div className={styles.contentTitle}>
                    赠送礼物
                    {/* <span className={styles.desc}>
                  滑动可选择礼物，点击可取消选择
                </span> */}
                  </div>
                  <div className={styles.gift_list}>
                    {giftList.map((item, index) => {
                      const active = activeItem === item.id;
                      return (
                        <div
                          key={index}
                          className={clas([
                            styles.gift_item,
                            active && styles.active,
                          ])}
                          onClick={() => {
                            // viewerSDK?.sendLog?.({
                            //   object_type: "gift_item",
                            //   event_type: "click",
                            //   object_id: item.name,
                            // })
                            setActiveItem(item.id);
                            onPlayItem({
                              id: 'preview',
                              nickname: '简小帖',
                              content: item,
                            });
                          }}
                        >
                          <img
                            src={item.preview}
                            alt=''
                            className={styles.gift_preview}
                          />
                          <div className={styles.gift_name}>{item.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <Button
              size='lg'
              className='rounded-full w-full'
              onClick={() => onSubmit()}
            >
              提交
            </Button>
          </>
        )}
      </ResponsiveDialog>
    </div>
  );
};

export default HuizhiComp;
