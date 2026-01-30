'use client';
import SVGRemoteIcon from '@/components/SVGRemoteIcon';
import { cdnApi, getAppId } from '@/services';
import APPBridge from '@/store/app-bridge';
import { getCookie, setCookieExpire } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import WaterfallFloor2 from '../waterfall-by-tags';
import styles from './index.module.scss';

const homeBg: Record<string, string> = {
  jiantie: 'https://img2.maka.im/cdn/webstore10/jiantie/home_bg_v2.png',
  xueji: 'https://img2.maka.im/cdn/webstore10/xueji/home_bg.png',
  huiyao: '',
  makaai: 'https://img2.maka.im/cdn/webstore10/makaai/home_bg_v2.png',
};

const Home2 = (props: {
  appid?: string;
  onChangeTab?: (index: number) => void;
  templateChannels: any;
}) => {
  const [channels, setChannels] = useState<any>(
    props.templateChannels?.[0]?.template_channels
  );
  const [channelId, setChannelId] = useState<any>();
  const appid = props.appid || getAppId();
  const [fixed, setFixed] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const router = useRouter();
  const background =
    appid === 'jiantie'
      ? props.templateChannels?.[0]?.home_background?.url || homeBg[appid]
      : '';

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
    const sessionChannelId = getCookie('home_channel_id');
    if (!channels?.length) {
      return;
    }
    if (
      sessionChannelId &&
      channels?.find((item: any) => item.documentId === sessionChannelId)
    ) {
      setChannelId(sessionChannelId);
    } else {
      setChannelId(channels[0].documentId);
    }
    listenElementScrollDirection();
  }, []);

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

  return (
    <div
      className={cls(styles.home, styles[appid], 'h-full', 'overflow-y-auto')}
      id='home-scroll-container'
      style={{
        backgroundImage: `url('${background}')`,
      }}
    >
      {appid !== 'huiyao' && appid !== 'xueji' && (
        <div
          className={cls(styles.sticky, 'app_banner')}
          style={{
            backgroundImage: `url('${background}')`,
          }}
        ></div>
      )}
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
          backgroundImage: `url('${background}')`,
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
                {item.icon?.[0]?.url.indexOf('.svg') > -1 ? (
                  <SVGRemoteIcon
                    url={item.icon?.[0]?.url}
                    width={20}
                    height={20}
                    color={isActive ? '#fff' : 'var(--theme-color)'}
                  />
                ) : (
                  <img
                    src={item.icon?.[0]?.url}
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

      <WaterfallFloor2
        channelId={channelId}
        key={channelId}
        fixed={fixed}
        appid={appid}
      />
    </div>
  );
};

export default Home2;
