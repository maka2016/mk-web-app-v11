'use client';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { cn } from '@workspace/ui/lib/utils';
import { MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { RSVPField } from '../type';
import locateData from './locate.json';

export const InputWithTheme = styled(Input)`
  font-size: var(--rsvp-control-font-size);
  padding-top: var(--rsvp-control-padding);
  padding-bottom: var(--rsvp-control-padding);
  padding-left: calc(var(--rsvp-control-padding) * 1.5);
  padding-right: calc(var(--rsvp-control-padding) * 1.5);
  border-radius: var(--rsvp-border-radius);
  border-width: var(--rsvp-border-width);
  border-style: solid;
  background-color: var(--rsvp-input-bg-color);
  border-color: var(--rsvp-input-border-color);
  color: var(--rsvp-input-text-color);
  ::placeholder {
    color: var(--rsvp-input-placeholder-color);
    font-size: var(--rsvp-control-font-size);
  }
`;

/**
 * 地址输入组件，带定位按钮和省市区三级联动选择
 */
export interface AddressSelectorProps {
  field: RSVPField;
  formField: {
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<any>;
  };
  disabled?: boolean;
}

export function AddressSelector({
  field,
  formField,
  disabled = false,
}: AddressSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');

  // 解析省市区数据
  const provinceList = useMemo(() => Object.keys(locateData), []);

  // 根据选中的省获取市列表
  const cityList = useMemo(() => {
    if (!selectedProvince) return [];
    const provinceData =
      locateData[selectedProvince as keyof typeof locateData];
    if (!provinceData) return [];
    return Object.keys(provinceData);
  }, [selectedProvince]);

  // 根据选中的省和市获取区列表
  const districtList = useMemo(() => {
    if (!selectedProvince || !selectedCity) return [];
    const provinceData =
      locateData[selectedProvince as keyof typeof locateData];
    if (!provinceData) return [];
    const cityData = provinceData[selectedCity as keyof typeof provinceData];
    if (!cityData) return [];
    // 确保 cityData 是数组类型
    if (Array.isArray(cityData)) {
      return cityData;
    }
    return [];
  }, [selectedProvince, selectedCity]);

  // 从表单值中解析省市区（如果已有值）
  useEffect(() => {
    const currentValue = (formField.value as string) || '';
    if (
      currentValue &&
      !selectedProvince &&
      !selectedCity &&
      !selectedDistrict
    ) {
      // 尝试从现有值中解析省市区
      const parts = currentValue.split(/\s+/);
      if (parts.length >= 1) {
        const province = parts[0];
        if (provinceList.includes(province)) {
          setSelectedProvince(province);
          if (parts.length >= 2) {
            const city = parts[1];
            const provinceData =
              locateData[province as keyof typeof locateData];
            if (provinceData && Object.keys(provinceData).includes(city)) {
              setSelectedCity(city);
              if (parts.length >= 3) {
                const district = parts.slice(2).join(' ');
                const cityData =
                  provinceData[city as keyof typeof provinceData];
                if (cityData && Array.isArray(cityData)) {
                  const districtList = cityData as string[];
                  if (districtList.includes(district)) {
                    setSelectedDistrict(district);
                  }
                }
              }
            }
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formField.value]);

  // 更新表单值
  const updateFormValue = (
    province: string,
    city: string,
    district: string
  ) => {
    const parts = [province, city, district].filter(Boolean);
    const addressStr = parts.join(' ');
    formField.onChange(addressStr);
  };

  // 处理省选择
  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    setSelectedCity('');
    setSelectedDistrict('');
    updateFormValue(province, '', '');
  };

  // 处理市选择
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedDistrict('');
    updateFormValue(selectedProvince, city, '');
  };

  // 处理区选择
  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    updateFormValue(selectedProvince, selectedCity, district);
  };

  const handleLocationClick = async () => {
    if (loading || disabled) return;

    try {
      setLoading(true);
      const response = await fetch('/api/geo');
      if (!response.ok) {
        toast.error('定位失败，请手动输入');
        throw new Error('定位失败');
      }
      const data = await response.json();
      // 尝试匹配省市区
      const province = data.province || '';
      const city = data.city || '';

      if (province && provinceList.includes(province)) {
        setSelectedProvince(province);
        const provinceData = locateData[province as keyof typeof locateData];
        if (provinceData && city) {
          const cities = Object.keys(provinceData);
          if (cities.includes(city)) {
            setSelectedCity(city);
            updateFormValue(province, city, '');
          } else {
            updateFormValue(province, '', '');
          }
        } else {
          updateFormValue(province, '', '');
        }
      } else {
        // 如果无法匹配，则使用原来的方式
        const addressStr = [data.province, data.city].filter(Boolean).join(' ');
        if (addressStr) {
          formField.onChange(addressStr);
        }
      }
    } catch (error) {
      console.error('获取位置信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-2'>
      {/* 省市区三级联动选择 */}
      <div className='flex items-center gap-2'>
        <Select
          value={selectedProvince}
          onValueChange={handleProvinceChange}
          disabled={disabled}
        >
          <SelectTrigger
            className='flex-1'
            style={{
              borderRadius: 'var(--rsvp-border-radius)',
              borderWidth: 'var(--rsvp-border-width)',
              borderStyle: 'solid',
              backgroundColor: 'var(--rsvp-input-bg-color)',
              borderColor: 'var(--rsvp-input-border-color)',
              color: 'var(--rsvp-input-text-color)',
              fontSize: 'var(--rsvp-control-font-size)',
              paddingTop: 'var(--rsvp-control-padding)',
              paddingBottom: 'var(--rsvp-control-padding)',
              paddingLeft: 'calc(var(--rsvp-control-padding) * 1.5)',
              paddingRight: 'calc(var(--rsvp-control-padding) * 1.5)',
            }}
          >
            <SelectValue placeholder='请选择省份' />
          </SelectTrigger>
          <SelectContent>
            {provinceList.map(province => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedCity}
          onValueChange={handleCityChange}
          disabled={disabled || !selectedProvince}
        >
          <SelectTrigger
            className='flex-1'
            style={{
              borderRadius: 'var(--rsvp-border-radius)',
              borderWidth: 'var(--rsvp-border-width)',
              borderStyle: 'solid',
              backgroundColor: 'var(--rsvp-input-bg-color)',
              borderColor: 'var(--rsvp-input-border-color)',
              color: 'var(--rsvp-input-text-color)',
              fontSize: 'var(--rsvp-control-font-size)',
              paddingTop: 'var(--rsvp-control-padding)',
              paddingBottom: 'var(--rsvp-control-padding)',
              paddingLeft: 'calc(var(--rsvp-control-padding) * 1.5)',
              paddingRight: 'calc(var(--rsvp-control-padding) * 1.5)',
            }}
          >
            <SelectValue placeholder='请选择城市' />
          </SelectTrigger>
          <SelectContent>
            {cityList.map(city => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedDistrict}
          onValueChange={handleDistrictChange}
          disabled={disabled || !selectedCity}
        >
          <SelectTrigger
            className='flex-1'
            style={{
              borderRadius: 'var(--rsvp-border-radius)',
              borderWidth: 'var(--rsvp-border-width)',
              borderStyle: 'solid',
              backgroundColor: 'var(--rsvp-input-bg-color)',
              borderColor: 'var(--rsvp-input-border-color)',
              color: 'var(--rsvp-input-text-color)',
              fontSize: 'var(--rsvp-control-font-size)',
              paddingTop: 'var(--rsvp-control-padding)',
              paddingBottom: 'var(--rsvp-control-padding)',
              paddingLeft: 'calc(var(--rsvp-control-padding) * 1.5)',
              paddingRight: 'calc(var(--rsvp-control-padding) * 1.5)',
            }}
          >
            <SelectValue placeholder='请选择区县' />
          </SelectTrigger>
          <SelectContent>
            {districtList.map(district => (
              <SelectItem key={district} value={district}>
                {district}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 详细地址输入和定位按钮 */}
      <div className='flex items-center gap-2'>
        <InputWithTheme
          placeholder={field.placeholder || '请输入详细地址'}
          value={(formField.value as string) || ''}
          onChange={e => formField.onChange(e.target.value)}
          onBlur={formField.onBlur}
          name={formField.name}
          ref={formField.ref}
          disabled={disabled}
          className='flex-1 focus:ring-0 [&::placeholder]:text-[var(--rsvp-input-placeholder-color)]'
        />
        <Button
          type='button'
          variant='outline'
          size='icon'
          disabled={disabled || loading}
          onClick={handleLocationClick}
          className='shrink-0'
          style={{
            borderRadius: 'var(--rsvp-border-radius)',
            borderWidth: 'var(--rsvp-border-width)',
            borderStyle: 'solid',
            backgroundColor: 'var(--rsvp-secondary-btn-color)',
            borderColor: 'var(--rsvp-secondary-btn-border-color)',
            color: 'var(--rsvp-secondary-btn-text-color)',
            width: 'calc(var(--rsvp-control-padding) * 2 + 20px)',
            height: 'calc(var(--rsvp-control-padding) * 2 + 20px)',
          }}
        >
          <MapPin
            className={cn('h-4 w-4', loading && 'animate-pulse')}
            style={{
              color: 'var(--rsvp-secondary-btn-text-color)',
            }}
          />
        </Button>
      </div>
    </div>
  );
}
