import { isWechat } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { BaseMap, MultiMarker } from 'tlbs-map-react';
import { useWorksStore } from '../../works-store/store/hook';
import { LayerElemItem } from '../../works-store/types';
import EditingPanel from './EditingPanel';
import { txMapKey } from './const';
import { MkMapProps } from './types';

const MkMap: React.FC<{
  layer: LayerElemItem<MkMapProps>;
  isActive: boolean;
}> = props => {
  const worksStore = useWorksStore();
  const inViewer = worksStore.inViewer;
  const { layer, isActive } = props;
  const { attrs } = layer;
  const id = layer.elemId;

  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const timer = useRef<any>(null);
  const markerRef: any = useRef(null); // 点标记图层实例
  const [geometries, setGeometries] = useState([
    {
      styleId: 'multiMarkerStyle1',
      position: {
        lat: attrs?.latLng?.lat || 23.09909,
        lng: attrs?.latLng?.lng || 113.326,
      },
    },
  ]);
  const [show, setShow] = useState(false);

  const [key, setKey] = useState(0);
  const ready = useRef<Boolean>(false);

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
          lat: attrs?.latLng?.lat || 23.09909,
          lng: attrs?.latLng?.lng || 113.326,
        },
      },
    ]);
  }, [attrs]);

  function toNavigator() {
    if (!inViewer) {
      toast.error('请分享后查看');
      return;
    }
    if (isWechat()) {
      const { wx } = window as any;

      wx.openLocation({
        latitude: parseFloat(attrs?.latLng?.lat.toString()), // 纬度，浮点数，范围为90 ~ -90
        longitude: parseFloat(attrs?.latLng?.lng.toString()), // 经度，浮点数，范围为180 ~ -180。
        name: attrs.address, // 位置名
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
      const url = `https://apis.map.qq.com/tools/routeplan/eword=${attrs?.address}&epointx=${attrs?.latLng?.lng}&epointy=${attrs?.latLng?.lat}?key=${keyId}&referer=${name}`;
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
        className='relative'
        style={{
          pointerEvents: inViewer ? 'auto' : 'none',
          minWidth: 240,
          width: '100%',
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
              lat: attrs?.latLng?.lat || 23.09909,
              lng: attrs?.latLng?.lng || 113.326,
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
          className='absolute z-[1111] bottom-4 right-4 py-2 px-4 text-sm text-center text-white bg-[#18ccc0]'
          id='MkMapV4_navigator'
          onClick={() => toNavigator()}
        >
          导航
        </div>
        {worksStore && isActive && (
          <div className='absolute inset-0 flex items-center justify-center z-[9] pointer-events-auto'>
            <div
              className='w-[148px] h-[46px] bg-white rounded-lg flex items-center justify-center text-[rgba(0,0,0,0.88)] text-base font-semibold gap-1'
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
          formControledValues={attrs}
          onFormValueChange={(data: any) => {
            worksStore?.changeCompAttr(id, data);
          }}
          entityInfo={{ id }}
          onClose={() => setShow(false)}
        />
      </ResponsiveDialog>
    </>
  );
};

export default MkMap;
