'use client';
import SVGRemoteIcon from '@/components/SVGRemoteIcon';
import { API, cdnApi, getAppId, request } from '@/services';
import APPBridge from '@/store/app-bridge';
import { getCookie, queryToObj, setCookieExpire } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TemplateChannelFloor from '../template-channel-floor';
import styles from './home4.module.scss';

interface Channel {
  documentId: string;
  id: number;

  name: string;
  filters: any;

  icon?: {
    url: string;
  };
  children: Channel[];
}

const Home2 = (props: {
  appid?: string;
  onChangeTab?: (index: number) => void;
  templateChannels: any;
}) => {
  const [channels, setChannels] = useState<Channel[]>(props.templateChannels);
  const [channelId, setChannelId] = useState<any>();
  const appid = props.appid || getAppId();
  const [fixed, setFixed] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [isMiniProgram, setIsMiniProgram] = useState(false);
  const router = useRouter();

  const onChangeChannel = (id: string) => {
    setChannelId(id);

    setCookieExpire('home_channel_id', id);
    const scrollDom = document.querySelector('#home-scroll-container');
    if (scrollDom) {
      scrollDom.scrollTo({
        top: 0,
      });
      setFixed(false);
    }
  };

  function listenElementScrollDirection() {
    const el = document.getElementById('home-scroll-container');
    if (!el) return;
    let lastScrollTop = el.scrollTop;

    const onScroll = () => {
      const currentScrollTop = el.scrollTop;
      if (currentScrollTop !== lastScrollTop) {
        const direction = currentScrollTop > lastScrollTop ? 'down' : 'up';
        if (direction === 'down') {
          setFixed(false);
        } else if (direction === 'up' && currentScrollTop > 194) {
          setFixed(true);
        }
        lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }

  useEffect(() => {
    if (!channels?.length) {
      return;
    }
    const sessionChannelId = getCookie('home_channel_id');
    if (
      sessionChannelId &&
      channels?.find((item: any) => item.documentId === sessionChannelId)
    ) {
      setChannelId(sessionChannelId);
    } else {
      setChannelId(channels[0].documentId);
    }
  }, [channels]);

  const matchChannel = async (oaid: string) => {
    const res: any = await request.get(
      `${API('apiv10')}/promotion/v1/match-event?appid=${appid}&oaid=${oaid}`
    );
    console.log('res', res);
    if (res?.matched && res?.jiantieStoreChannelDocumentId) {
      const hasItem = channels?.some(
        item => item.documentId === res.jiantieStoreChannelDocumentId
      );
      if (hasItem) {
        onChangeChannel(res.jiantieStoreChannelDocumentId);
      }
    }
  };

  const getDeviveInfo = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall(
        {
          type: 'MKDeviceInfo',
          jsCbFnName: 'appBridgeOnDeviceInfoCb',
        },
        p => {
          console.log('appBridgeOnDeviceInfoCb', p);
          // Json值：{"idfv" : "", "idfa" : "", "oaid": "", "androidid": ""}
          if (p?.oaid) {
            matchChannel(p.oaid);
          }
        }
      );
    } else {
      const { oaid } = queryToObj();
      if (oaid) {
        matchChannel(oaid);
      }
    }
  };

  useEffect(() => {
    const sessionChannelId = getCookie('home_channel_id');
    if (!sessionChannelId) {
      getDeviveInfo();
    }
    setIsMiniProgram(APPBridge.judgeIsInMiniP());
    listenElementScrollDirection();
  }, []);

  const toTutorial = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/tutorial?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(`/mobile/tutorial?appid=${appid}`);
    }
  };

  const currentChannel = channels?.find(
    (item: any) => item.documentId === channelId
  );

  return (
    <div
      className={cls(styles.home, styles[appid], 'h-full', 'overflow-y-auto')}
      style={{
        borderRadius: isMiniProgram ? 0 : '12px 12px 0 0',
        height: isMiniProgram
          ? '100%'
          : 'calc(100% - 42px - var(--safe-area-inset-top))',
      }}
      id='home-scroll-container'
    >
      {appid === 'xueji' && showTutorial && (
        <div className={styles.tutorial}>
          <div className={styles.content}>
            <img
              src={cdnApi('/cdn/webstore10/xueji/tutorial_title.png')}
              alt=''
            />
            <div className={styles.tutorialBtn} onClick={() => toTutorial()}>
              <span>查看教程</span>
              <Icon name='right-bold' size={16} color='#fff' />
            </div>
            <Icon
              name='guanbi'
              size={14}
              color='#71717A'
              onClick={() => {
                setShowTutorial(false);
              }}
            />
          </div>
        </div>
      )}
      <div
        className={cls([
          styles.channel,
          styles[appid],
          fixed && styles.stickyChannel,
        ])}
        style={{
          borderBottom: '0.5px solid #E4E4E7',
        }}
      >
        {channels?.map((item: any) => {
          const isActive = item.documentId === channelId;
          return (
            <div
              key={item.documentId}
              className={cls([
                styles.channelItem,
                isActive ? styles.active : '',
              ])}
              onClick={() => {
                onChangeChannel(item.documentId);
              }}
            >
              <div className={styles.icon}>
                {item.icon?.url.indexOf('.svg') > -1 ? (
                  <SVGRemoteIcon
                    url={item.icon?.url}
                    width={20}
                    height={20}
                    color={isActive ? '#fff' : 'var(--theme-color)'}
                  />
                ) : (
                  <img
                    src={item.icon?.url}
                    style={{
                      width: 20,
                      height: 20,
                    }}
                  />
                )}
              </div>
              <div className={styles.name}>{item.name}</div>
            </div>
          );
        })}
      </div>

      <div className='bg-white py-1 pt-3'>
        {currentChannel?.children
          ?.filter((item: any) => item.online === true)
          ?.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0))
          .map((item: Channel) => (
            <TemplateChannelFloor key={item.documentId} channel={item} />
          ))}
      </div>
    </div>
  );
};

export default Home2;
