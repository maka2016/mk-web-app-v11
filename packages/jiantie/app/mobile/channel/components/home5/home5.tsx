'use client';
import SVGRemoteIcon from '@/components/SVGRemoteIcon';
import { API, getAppId, request } from '@/services';
import APPBridge from '@/store/app-bridge';
import { getCookie, queryToObj, setCookieExpire } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TemplateChannelFloor from '../template-channel-floor';
import styles from './home5.module.scss';

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

// 四级频道
const Home2 = (props: {
  appid?: string;
  onChangeTab?: (index: number) => void;
  templateChannels: Channel[];
}) => {
  const [channels] = useState<Channel[]>(props.templateChannels);
  const [channelId, setChannelId] = useState<string>();
  const appid = props.appid || getAppId();
  const [activeSubTabId, setActiveSubTabId] = useState<string | undefined>();
  const router = useRouter();

  useEffect(() => {
    if (!channels?.length) {
      return;
    }
    const sessionChannelId = getCookie('home_channel_id');
    let _channelId = '';
    if (
      sessionChannelId &&
      channels?.find((item: Channel) => item.documentId === sessionChannelId)
    ) {
      setChannelId(sessionChannelId);
      _channelId = sessionChannelId;
    } else {
      setChannelId(channels[0].documentId);
      _channelId = channels[0].documentId;
    }

    const current = channels.find(
      (item: Channel) => item.documentId === _channelId
    );
    const subTabs = current?.children || [];
    setActiveSubTabId(subTabs?.[0]?.documentId);
  }, [channels]);

  const onChangeChannel = (id: string) => {
    setChannelId(id);
    const current = channels.find((item: Channel) => item.documentId === id);
    const subTabs = current?.children || [];
    setActiveSubTabId(subTabs?.[0]?.documentId);

    setCookieExpire('home_channel_id', id);
    const scrollDom = document.querySelector('#home-scroll-container');
    if (scrollDom) {
      scrollDom.scrollTo({
        top: 0,
      });
    }
  };

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
    // listenElementScrollDirection();
    // CommonLogger.track_pageview({
    //   page_type: 'home_page',
    //   page_id: `home_page`,
    // });
  }, []);

  const toSearch = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/channel/search?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(`/mobile/channel/search?appid=${appid}`);
    }
  };

  const currentChannel = channels?.find(
    (item: Channel) => item.documentId === channelId
  );

  const currentSubTab = currentChannel?.children?.find(
    (item: Channel) => item.documentId === activeSubTabId
  );

  const backgroundImage =
    'linear-gradient(100.32deg, rgba(232, 32, 39, 0.2) 0.08%, hsla(358, 81%, 52%, 0.4) 98.37%)';

  return (
    <div
      className={cls(styles.home, styles[appid], 'h-full', 'overflow-y-auto')}
      id='home-scroll-container'
      style={{
        backgroundImage,
      }}
    >
      <div
        className={styles.banner}
        style={{
          backgroundImage,
        }}
      ></div>
      <div className={styles.searchInput} id='searchInput'>
        <div className={styles.input} onClick={toSearch}>
          <div className={styles.icon}>
            <Icon name='search' size={20} />
            <span>搜海量模板</span>
          </div>
          <div className={styles.btn}>搜索</div>
        </div>
      </div>
      <div
        className={cls([styles.channel, styles[appid]])}
        style={{
          backgroundImage,
        }}
      >
        {channels?.map((item: Channel) => {
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
                {item.icon?.url && (
                  <>
                    {item.icon?.url?.indexOf('.svg') > -1 ? (
                      <SVGRemoteIcon
                        url={item.icon?.url || ''}
                        width={20}
                        height={20}
                        color={isActive ? '#fff' : 'var(--theme-color)'}
                      />
                    ) : (
                      <img
                        src={item.icon?.url}
                        alt={item?.name || ''}
                        style={{
                          width: 20,
                          height: 20,
                        }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className={styles.name}>{item.name}</div>
            </div>
          );
        })}
      </div>
      {currentChannel?.children && currentChannel.children.length > 0 && (
        <>
          <div
            className={styles.subTabsContainer}
            style={{
              backgroundImage,
            }}
          >
            <div className={styles.subTabs}>
              {currentChannel.children?.map((tab: Channel) => {
                const isActiveSub = tab.documentId === activeSubTabId;
                return (
                  <div
                    key={tab.documentId}
                    onClick={() => setActiveSubTabId(tab.documentId)}
                    className={cls(
                      styles.subTabItem,
                      isActiveSub && styles.active
                    )}
                  >
                    {tab?.name}
                  </div>
                );
              })}
            </div>
          </div>

          {(currentSubTab?.children?.length
            ? currentSubTab.children
            : currentChannel.children
          )?.map((item: Channel) => (
            <TemplateChannelFloor channel={item} key={item.documentId} />
          ))}
        </>
      )}
    </div>
  );
};

export default Home2;
