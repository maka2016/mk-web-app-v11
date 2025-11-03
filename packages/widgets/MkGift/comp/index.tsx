import React, { useEffect, useRef, useState } from 'react';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import { MkGiftProps } from '../shared';
import { createPortal } from 'react-dom';
import './index.scss';
import { EventEmitter, LoadScript } from '@mk/utils';
import cls from 'classnames';
import {
  cdnApi,
  formEntityServiceApi,
  formReceiverServiceApi,
  getPageId,
  getUid,
} from '@mk/services';
import i18nModule from '../shared/i18n';
import { Parser, Player, DB } from 'svga';

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

const giftList = [
  {
    id: 2,
    name: '幸福美满',
    preview:
      'https://img2.maka.im/cdn/webstore10/editor/gift/preview_02.png?v=1',
    path: '/cdn/webstore10/editor/gift/gift_02.svga',
  },
  // {
  //   id: 3,
  //   name: "烟花",
  //   preview: "https://img2.maka.im/cdn/webstore10/editor/gift/preview_03.png?v=1",
  //   path: "/cdn/webstore10/editor/gift/gift_03.svga",
  // },
  // {
  //   id: 4,
  //   name: "城堡",
  //   preview: "https://img2.maka.im/cdn/webstore10/editor/gift/preview_04.png?v=1",
  //   path: "/cdn/webstore10/editor/gift/gift_04.svga",
  // },
  // {
  //   id: 5,
  //   name: "许愿瓶",
  //   preview: "https://img2.maka.im/cdn/webstore10/editor/gift/preview_05.png?v=1",
  //   path: "/cdn/webstore10/editor/gift/gift_05.svga",
  // },
  // {
  //   id: 6,
  //   name: "爱心火箭",
  //   preview: "https://img2.maka.im/cdn/webstore10/editor/gift/preview_06.png",
  //   path: "/cdn/webstore10/editor/gift/gift_06.svga",
  // },
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
  // {
  //   id: 10,
  //   name: "爱心",
  //   preview: "https://img2.maka.im/cdn/webstore10/editor/gift/preview_10.png",
  //   path: "/cdn/webstore10/editor/gift/gift_10.svga",
  // },
];

const pageSize = 50;

const MkGift: React.FC<PlatformCompProps<MkGiftProps>> = props => {
  const {
    lifecycle: { didMount, didLoaded },
    viewerSDK,
    editorSDK,
    controledValues,
  } = props;
  const { formRefId } = controledValues;
  const parserRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const dbRef = useRef<any>(null);
  const [inputValue, setInputValue] = useState('');
  const [activeItem, setActiveItem] = useState(giftList[0].id);
  const [showInput, setShowInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPreview = useRef(false);

  const [playItem, setPlayItem] = useState<SubmitItem | null>();
  const [ready, setReady] = useState(false);
  const submitList = useRef<SubmitItem[]>([]);
  const submitTotal = useRef(0);
  const page = useRef(0);

  const playIndex = useRef(0);

  // 国际化
  const [initialized, setInitialized] = useState(false);
  const initI18n = async () => {
    if (initialized) {
      return;
    }
    await i18nModule.init();
    setInitialized(true);
  };

  const initFormData = async () => {
    if (!formRefId && editorSDK) {
      const res = await formEntityServiceApi.create({
        uid: +getUid(),
        works_id: getPageId(),
        type: 'MkGift',
        content: {
          formName: '礼物',
          fields: [
            {
              id: 'content',
              label: '内容',
            },
            {
              id: 'nickname',
              label: '姓名',
            },
          ],
        },
      });

      editorSDK?.changeCompAttr(props.id, {
        formRefId: res.data.formId,
      });
    }
  };

  useEffect(() => {
    parserRef.current = new Parser({
      isDisableImageBitmapShim: true,
    });

    const container = document.getElementById('gift-canvas') as
      | HTMLCanvasElement
      | undefined;
    playerRef.current = new Player({
      container,
      // 循环次数，默认值 0（无限循环）
      loop: 1,
      // isCacheFrames: true,
    });
    dbRef.current = new DB();
    playerRef.current.onStart = () => console.log('onStart');
    playerRef.current.onResume = () => console.log('onResume');
    playerRef.current.onPause = () => console.log('onPause');
    playerRef.current.onStop = () => console.log('onStop');

    playerRef.current.onEnd = () => {
      playerRef.current.stop();
      playerRef.current.clear();
      if (!isPreview.current) {
        playNext();
      }
    };

    return () => {
      parserRef.current?.destroy?.();
      playerRef.current?.destroy?.();
    };
  }, []);

  const getFormList = async (page: number) => {
    if (!viewerSDK || !formRefId) {
      return;
    }
    const res = await formReceiverServiceApi.getFormList(formRefId, {
      params: {
        page,
        limit: pageSize,
        order: 'desc',
      },
    });
    if (res?.data?.rows?.length) {
      const newRows = res.data.rows;
      const existingIds = new Set(submitList.current.map(i => i.id));

      // 去重合并
      const filtered = newRows.filter((i: any) => !existingIds.has(i.id));
      const combined: any[] =
        page === 0 ? filtered : [...submitList.current, ...filtered];

      submitList.current = combined;
      submitTotal.current = res.data.total;

      if (page === 0) {
        setReady(true);
      }
    }
  };

  const submitCallback = (data: any) => {
    viewerSDK?.sendLog?.({
      object_type: 'gift_submit',
      event_type: 'click',
      object_id: data.content.name,
    });

    const newItem: SubmitItem = {
      id: data.commitId,
      nickname: data.nickname,
      content: data.content,
    };
    onPlayItem(newItem);
    submitList.current.push(newItem);
    playIndex.current += 1;
  };

  const previewGift = (value: boolean) => {
    playerRef.current?.stop();
    playerRef.current?.clear();
    setPlayItem(null);
    if (value === false) {
      playNext();
      return;
    }

    viewerSDK?.sendLog?.({
      object_type: 'gift_show',
      event_type: 'page_view',
    });
  };

  useEffect(() => {
    initI18n();
    EventEmitter.on('MkGift_submit', submitCallback);
    EventEmitter.on('MkGift_preview', previewGift);

    if (controledValues.show !== false) {
      initFormData();

      getFormList(0);
    }
    /** 用于在编辑器内挂载完成的回调 */
    didMount({
      data: {
        ...controledValues,
      },
      boxInfo: {
        width: 100,
        height: 100,
      },
    });

    /** 用于在 viewer 广播的组件加载完成事件 */
    didLoaded();
    return () => {
      EventEmitter.rm('MkGift_submit', submitCallback);
      EventEmitter.rm('MkGift_preview', previewGift);
    };
  }, []);

  useEffect(() => {
    if (ready && submitList.current.length) {
      playNext();
    }
  }, [ready]);

  const playNext = async () => {
    setPlayItem(null);

    if (playIndex.current >= submitTotal.current) {
      return;
    }
    // if (playIndex.current >= submitTotal.current && submitTotal.current > 2) {
    //   playIndex.current = 0 // 循环播放所有动画
    // }

    // 加载下一页
    if (playIndex.current >= submitList.current.length - 2) {
      const hasMore = submitList.current.length < submitTotal.current;
      if (hasMore) {
        page.current += 1;
        getFormList(page.current);
      }
    }

    const item = submitList.current[playIndex.current];
    if (!item) {
      return;
    }
    const parser = parserRef.current;
    const player = playerRef.current;
    const db = dbRef.current;

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
      'gift-canvas'
    ) as HTMLCanvasElement | null;
    if (canvas) {
      canvas.width = svga.size.width;
      canvas.height = svga.size.height;
    }
    await player.mount(svga);
    setPlayItem(item);
    player.start();
    playIndex.current++;
  };

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
      'gift-canvas'
    ) as HTMLCanvasElement | null;
    if (canvas) {
      canvas.width = svga.size.width;
      canvas.height = svga.size.height;
    }

    await player.mount(svga);
    setPlayItem(item);
    player.start();
  };

  if (controledValues.show === false) return <></>;

  return (
    <>
      {viewerSDK &&
        createPortal(
          <div
            id='mk-gift-portal'
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              bottom: 0,
              right: 0,
              zIndex: '9999',
              overflow: 'hidden',
              pointerEvents: 'none', // Allow clicking through the container
            }}
          >
            <div
              className='mk_gift_container'
              style={{
                bottom: isPreview.current ? '40%' : 0,
              }}
            >
              {playItem && (
                <div
                  className='gift_message'
                  style={{
                    bottom: isPreview.current
                      ? '20%'
                      : 'calc(136px + var(--preview-footer-height))',
                  }}
                >
                  <div className='gift_logo'>
                    <img
                      src='https://img2.maka.im/cdn/webstore10/editor/gift/gift_logo_v2.png'
                      alt=''
                    />
                  </div>
                  <div className='gift_message_content'>
                    <p className='name'>{playItem?.nickname}</p>
                    <p className='label'>
                      {i18nModule.t('sent')}{' '}
                      {i18nModule.t(playItem?.content.name)}
                    </p>
                  </div>
                  <div className='gift_preview'>
                    <img src={playItem?.content.preview} alt='' />
                  </div>
                </div>
              )}
              <canvas id='gift-canvas'></canvas>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default MkGift;
