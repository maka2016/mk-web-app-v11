import React, { useEffect, useRef, useState } from 'react';
import { DebounceClass } from '@mk/utils';
import { searchPlaceSuggestion } from '../shared/services';
// import "./index.scss";
import { Button } from '@workspace/ui/components/button';
import { Switch } from '@workspace/ui/components/switch';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { defaultFormData, txMapKey } from '../shared/const';
import { BaseMap, MultiMarker } from 'tlbs-map-react';

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
  }, [inputRef.current]);

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
    <div className='map-v4-setting-drawer'>
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
      <div className='map-setting-header'>
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
        className='map-setting-content'
        style={{
          pointerEvents: show ? 'auto' : 'none',
          opacity: show ? 1 : 0.6,
        }}
      >
        <div className='flex items-center gap-2'>
          <div className='search_content flex-1'>
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
              className='input'
              placeholder='请输入地址'
            />
            <div className='search_btn' onClick={() => onSearch()}>
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
          <div className='positions_tip'>
            {positions.map((item, index) => (
              <div
                className='position-item'
                onClick={() => onSelectAddress(item, index)}
                key={index}
              >
                <p className='name'>{item.name}</p>
                <p className='address'>{item.address}</p>
                {selectedIndex === index && (
                  <Icon
                    className='selected-icon'
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
