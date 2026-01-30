import { DebounceClass } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import React, { useEffect, useRef, useState } from 'react';
import { BaseMap, MultiMarker } from 'tlbs-map-react';
import { defaultFormData, txMapKey } from './const';
import { searchPlaceSuggestion } from './services';

interface LatLng {
  lat: number;
  lng: number;
}
interface Position {
  address: string;
  latLng: LatLng;
  name: string;
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

const debounce = new DebounceClass();

const Setting = (props: any) => {
  const { onClose, onFormValueChange, formControledValues } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const [positions, setPositions] = useState<Array<Position>>([]);
  const [inputVal, setInputVal] = useState<string>(
    formControledValues?.address || '广东省广州市海珠区TIT创意园创意东路5号'
  );
  const [searching, setSearching] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [show, setShow] = useState(
    formControledValues.show !== undefined ? formControledValues.show : true
  );

  // const [map, setMap] = useState<any>()
  const [mapData, setMapData] = useState<any>(
    !formControledValues.address ? defaultFormData : formControledValues
  );

  // Add effect for auto focus
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, []);

  function setSearchTip(val: string) {
    setInputVal(val);
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = e;
    const { value } = target;
    setSearchTip(value);
  };

  const onSelectAddress = (item: Position, index: number) => {
    setSelectedIndex(index);
    setInputVal(item.name);

    setMapData({
      zoom: 12,
      address: item.address,
      latLng: item.latLng,
    });
  };

  // 搜索地址
  const onSearch = () => {
    if (searching) {
      return;
    }
    setPositions([]);
    setSearching(true);
    debounce.exec(() => {
      searchPlaceSuggestion(inputVal).then((res: any) => {
        const pois = res.map((item: any) => {
          return {
            address: item.address,
            latLng: {
              lat: item?.location?.lat,
              lng: item?.location?.lng,
            },
            name: item.title,
          };
        });

        setPositions(pois);
        setSearching(false);
      });
    }, 2000);
  };

  const onSave = () => {
    onFormValueChange({ address: mapData.address, latLng: mapData.latLng });
    onClose();
  };
  return (
    <div className='relative h-screen flex flex-col'>
      {/* <div
        ref={mapRef}
        style={{
          width: "100%",
          flex: 1,
          overflow: "hidden",
          flexShrink: 0,
        }}
      ></div> */}
      <BaseMap
        apiKey={txMapKey}
        control={{
          zoom: {
            position: 'topRight',
          },
        }}
        options={{
          zoom: 12,
          center: {
            lat: mapData.latLng.lat || 23.09909,
            lng: mapData.latLng.lng || 113.326,
          },
          showControl: false,
        }}
      >
        <MultiMarker
          styles={styles}
          geometries={[
            {
              styleId: 'multiMarkerStyle1',
              position: {
                lat: mapData.latLng.lat || 23.09909,
                lng: mapData.latLng.lng || 113.326,
              },
            },
          ]}
        />
      </BaseMap>
      <div className='flex justify-between items-center py-3 px-4 pr-2 z-[9]'>
        <Button variant='ghost' size='sm' onClick={onClose}>
          取消
        </Button>
        <div className='flex gap-2'>
          <span>地址设置</span>
          {/* <Switch
            id={"map_switch"}
            checked={show !== false}
            onCheckedChange={(nextVal: boolean) => {
              onFormValueChange({
                show: nextVal,
              });
              setShow(nextVal);
            }}
          /> */}
        </div>

        <Button size='sm' onClick={onSave}>
          确定
        </Button>
      </div>
      <div
        className='h-[400px] flex-shrink-0 pt-2 px-3 flex flex-col gap-2 overflow-hidden rounded-t-xl'
        style={{
          pointerEvents: show ? 'auto' : 'none',
          opacity: show ? 1 : 0.6,
        }}
      >
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-1 bg-[#f5f5f5] rounded-lg py-2 px-3 text-[rgba(0,0,0,0.45)] flex-1'>
            <Icon name='search' />
            <input
              ref={inputRef}
              value={inputVal}
              onChange={onChange}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onSearch();
                }
              }}
              className='border-0 w-full h-6 leading-6 text-sm text-left bg-transparent text-black'
              placeholder='请输入地址'
            />
            <div
              className='flex-shrink-0 font-normal text-base leading-6 text-[var(--theme-color)]'
              onClick={() => onSearch()}
            >
              搜索
            </div>
          </div>
        </div>

        {searching && (
          <div className='flex items-center justify-center'>
            <Loading />
          </div>
        )}

        {positions.length > 0 && (
          <div className='flex-1 overflow-y-auto z-[11111] text-sm leading-[18px] text-[var(--text-normal-color)] overflow-x-hidden bg-white'>
            {positions.map((item, index) => (
              <div
                className='relative py-4 border-b border-[#0000000f] last:border-b-0'
                onClick={() => onSelectAddress(item, index)}
                key={index}
              >
                <p className='font-normal text-base leading-6 text-[rgba(0,0,0,0.88)] mb-0.5 whitespace-pre-wrap'>
                  {item.name}
                </p>
                <p className='font-normal text-xs leading-5 text-[rgba(0,0,0,0.45)] whitespace-pre-wrap'>
                  {item.address}
                </p>
                {selectedIndex === index && (
                  <Icon
                    className='absolute right-0 top-1/2 -translate-y-1/2'
                    name='check'
                    color='#1a87ff'
                    size={20}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Setting;
