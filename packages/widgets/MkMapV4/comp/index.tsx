import React, { useEffect, useRef, useState } from 'react';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import { isWechat } from '@mk/utils';
import './index.scss';
import { defaultFormData, txMapKey } from '../shared/const';
import { MultiMarker, BaseMap } from 'tlbs-map-react';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import EditingPanel from '../form-wap/EditingPanel';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';

const MkMap: React.FC<
  PlatformCompProps & {
    isActive: boolean;
  }
> = props => {
  const {
    controledValues,
    lifecycle,
    containerInfo,
    id,
    viewerSDK,
    editorSDK,
    isActive,
  } = props;

  const { didLoaded, didMount } = lifecycle;

  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const timer = useRef<any>(null);
  const markerRef: any = useRef(null); // 点标记图层实例
  const [geometries, setGeometries] = useState([
    {
      styleId: 'multiMarkerStyle1',
      position: {
        lat: controledValues?.latLng?.lat || 23.09909,
        lng: controledValues?.latLng?.lng || 113.326,
      },
    },
  ]);
  const [show, setShow] = useState(false);

  const [key, setKey] = useState(0);
  const ready = useRef<Boolean>(false);

  // 初始化数据
  useEffect(() => {
    didMount({
      boxInfo: {
        width: containerInfo.width || 280,
        height: containerInfo.height || 212,
      },
      data: {
        ...controledValues,
      },
    });
    didLoaded?.();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || ready.current) return;

    const preloadMargin = 100;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          if (!ready.current) {
            console.log('intersectionRatio-------');
            setKey(2);
            // ready.current = true;
          }
          observer.disconnect();
          clearTimeout(timer.current);
        }
      },
      {
        root: document.querySelector('#auto-scroll-container'),
        threshold: 0,
        rootMargin: `${preloadMargin}px 0px`,
      }
    );

    observer.observe(mapContainerRef.current);

    timer.current = setTimeout(() => {
      if (!ready.current) {
        console.log('setTimeout------');
        setKey(1);
        // ready.current = true;
      }
      if (ready.current) {
        observer.disconnect();
      }
    }, 4000);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setGeometries([
      {
        styleId: 'multiMarkerStyle1',
        position: {
          lat: controledValues?.latLng?.lat || 23.09909,
          lng: controledValues?.latLng?.lng || 113.326,
        },
      },
    ]);
  }, [controledValues]);

  function toNavigator() {
    if (!viewerSDK) {
      return;
    }
    if (isWechat()) {
      const { wx } = window as any;

      wx.openLocation({
        latitude: parseFloat(controledValues?.latLng?.lat), // 纬度，浮点数，范围为90 ~ -90
        longitude: parseFloat(controledValues?.latLng?.lng), // 经度，浮点数，范围为180 ~ -180。
        name: controledValues.address, // 位置名
        // address: "", // 地址详情说明
        scale: 28, // 地图缩放级别,整形值,范围从1~28。默认为最大
        infoUrl: '', // 在查看位置界面底部显示的超链接,可点击跳转
        fail(err: any) {
          console.log('error', err);
          alert(JSON.stringify(err));
        },
      });
    } else {
      const keyId = txMapKey;
      const name = '单页';
      const url = `https://apis.map.qq.com/tools/routeplan/eword=${controledValues?.address}&epointx=${controledValues?.latLng?.lng}&epointy=${controledValues?.latLng?.lat}?key=${keyId}&referer=${name}`;
      window.open(url);
    }
  }

  /** 样式 */
  const styles = {
    multiMarkerStyle1: {
      width: 20,
      height: 30,
      anchor: { x: 10, y: 30 },
    },
    multiMarkerStyle2: {
      width: 20,
      height: 30,
      anchor: { x: 10, y: 30 },
      src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png',
    },
  };

  return (
    <>
      <div
        ref={mapContainerRef}
        className='mk_map_render'
        style={{
          pointerEvents: viewerSDK ? 'auto' : 'none',
          minWidth: 240,
          maxWidth: 300,
          height: 212,
        }}
      >
        <BaseMap
          key={key}
          ref={mapRef}
          onMapInited={() => {
            ready.current = true;
          }}
          apiKey={txMapKey}
          control={{
            zoom: {
              position: 'topRight',
            },
          }}
          duration={1000}
          options={{
            zoom: 12,
            center: {
              lat: controledValues?.latLng?.lat || 23.09909,
              lng: controledValues?.latLng?.lng || 113.326,
            },
            showControl: false,
          }}
        >
          <MultiMarker
            ref={markerRef}
            styles={styles}
            geometries={geometries}
          />
        </BaseMap>

        <div
          className='navigator'
          id='MkMapV4_navigator'
          onClick={() => toNavigator()}
        >
          导航
        </div>
        {editorSDK && isActive && (
          <div className='navigator_setting'>
            <div
              className='navigator_setting_btn'
              onClick={() => setShow(true)}
            >
              <Icon name='setting2' size={20} />
              <span>设置</span>
            </div>
          </div>
        )}
      </div>
      <ResponsiveDialog isOpen={show} onOpenChange={setShow} handleOnly={true}>
        <EditingPanel
          formControledValues={controledValues}
          onFormValueChange={(data: any) => {
            editorSDK?.changeCompAttr(id, data);
          }}
          entityInfo={{ id }}
          onClose={() => setShow(false)}
        />
      </ResponsiveDialog>
    </>
  );
};

export default MkMap;
