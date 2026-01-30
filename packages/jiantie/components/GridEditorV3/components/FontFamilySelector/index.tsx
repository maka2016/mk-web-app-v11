/* eslint-disable camelcase */
import { cdnApi } from '@/services';
import { loadFontAction } from '@/utils';
import styled from '@emotion/styled';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { Loading } from '@workspace/ui/components/loading';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import clas from 'classnames';
import React, { useEffect, useState } from 'react';
import { FontItemInfo, FontItemInfoCollect, SortItem } from './types';
import { getFontList } from './utils';

const cache = {
  fontList: null,
  allFontData: {},
  sortData: [],
};

interface FontFamilySelectorProps {
  onChange: (changeValue: { fontFamily: string; fontUrl: string }) => void;
  /** fontFamily 的值 */
  value: string;
  /** 当前应用颜色面板的元素，目前主要用于在颜色面板上，如果是svg就过滤掉渐变色 */
  widgetType?: 'text' | 'pic' | 'svg' | 'shape';
  payload?: Record<string, any>;
  onFontLoaded?: () => void;
}

const SelectorContainer = styled.div`
  background-color: var(--bg-white);
  color: #00000099;
  height: 100%;
  width: 100%;
  position: relative;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  max-height: 500px;

  .font_list {
    // overflow-y: auto;
    flex: 1;
    height: 0;
    display: flex;
    overflow: hidden;

    .font-cate {
      flex-shrink: 0;
      width: 90px;
      padding-left: 12px;
      padding-top: 8px;
      overflow-y: auto;

      .cate-item {
        width: 100%;
        padding: 4px 12px;
        font-size: 14px;
        font-weight: 400;
        line-height: 22px;
        text-align: left;
        border-radius: 6px;
        margin-bottom: 12px;

        &:hover,
        &.active {
          color: #1a87ff;
          font-weight: 600;
          background: #0000000f;
        }
      }
    }

    .list-container {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
      position: relative;

      .font-item {
        overflow: hidden;
        margin-bottom: 4px;
        height: 44px;
        padding: 8px;
        display: flex;
        align-items: center;
        position: relative;
        border-radius: 8px;
        margin: 0 8px;

        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        &.active {
          background-color: rgba(0, 0, 0, 0.1);

          .indImg {
            // width: 120px;
            /* background-color: var(--color-blue-drak); */
          }
        }
      }
    }

    .indImg {
      height: 16px;
      width: 100%;
      background-size: cover;
      background-color: var(--text-holder-color, #000000);
      -webkit-mask-size: contain;
      mask-size: contain;
      mask-repeat: no-repeat;
    }
  }

  .font_cate_wapper {
    background-color: #fff;
    padding: 0 12px;
  }

  .search-container {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;

    .search-input {
      position: relative;

      .search-icon {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: #999;
        z-index: 1;
      }

      .clear-icon {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: #999;
        cursor: pointer;
        z-index: 1;

        &:hover {
          color: #666;
        }
      }

      input {
        padding-left: 32px;
        padding-right: 32px;
        height: 32px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-size: 14px;

        &:focus {
          border-color: #1a87ff;
          outline: none;
        }
      }
    }
  }

  .loadingTip {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.8);
    color: #fff;
  }
`;

const FontFamilySelector: React.FC<FontFamilySelectorProps> = ({
  value,
  onChange,
  onFontLoaded,
}) => {
  const fontListDOM = React.useRef<HTMLDivElement>(null);

  const [fontList, setFontList] = useState<FontItemInfo | null>(cache.fontList);
  const [allFontData, setAllFontData] = useState<FontItemInfoCollect>(
    cache.allFontData
  );
  const [sortData, setSortData] = useState<SortItem[]>(cache.sortData);
  const [activeItemID, setActiveItemID] = useState(value || '');
  const [loadingFont, setLoadingFont] = useState(false);

  const [activeCate, setActiveCate] = useState('');
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    if (fontList) {
      setActiveCate((fontList as any).sort_v2[0].name);
      return;
    }
    getFontList().then(res => {
      const resData = res.data.data;

      if (!resData?.all) return;

      cache.fontList = resData;
      cache.allFontData = resData.all;
      cache.sortData = resData.sort_v2;

      setFontList(resData);
      setAllFontData(resData.all);
      setSortData(resData.sort_v2);
      setActiveCate(resData.sort_v2[0].name);
    });
    return () => {};
  }, [fontList]);

  // 模糊搜索函数
  const fuzzySearch = (text: string, searchTerm: string) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const textLower = text.toLowerCase();
    return textLower.includes(searchLower);
  };

  const renderContent = () => {
    // 如果有搜索内容，忽略分类，搜索所有字体
    if (searchVal) {
      const allFontIDs = Object.keys(allFontData);
      const avaliableFontIDs = allFontIDs.filter(fID => {
        const { name } = allFontData[fID];
        return fuzzySearch(name, searchVal);
      });

      if (!avaliableFontIDs.length) return null;

      return (
        <div
          className='font-cate-list'
          key='search-results'
          id='search-results'
        >
          {avaliableFontIDs.map(fID => {
            const { fileName, font_id_no, preview_img } = allFontData[fID];
            const isActive = font_id_no === activeItemID;
            const prevImg = (
              <div
                className='indImg'
                style={{
                  maskImage: `url("${cdnApi(preview_img, {
                    format: 'webp',
                  })}")`,
                  WebkitMaskImage: `url("${cdnApi(preview_img, {
                    format: 'webp',
                  })}")`,
                }}
              />
            );

            return (
              <div
                className={`font-item${isActive ? ' active' : ''}`}
                key={font_id_no}
                onClick={() => {
                  const nextVal = {
                    fontFamily: font_id_no,
                    fontUrl: fileName,
                  };

                  setLoadingFont(true);

                  onChange?.(nextVal);

                  loadFontAction({
                    ...nextVal,
                  }).then(() => {
                    setActiveItemID(font_id_no);
                    setLoadingFont(false);
                    onFontLoaded?.();
                  });
                }}
              >
                {prevImg}
              </div>
            );
          })}
        </div>
      );
    }

    // 没有搜索内容时，按分类显示
    const activeDate = sortData.find(item => item.name === activeCate);
    if (!activeCate) {
      return;
    }

    const { font_ids, name: cataName } = activeDate!;
    const avaliableFontIDs = font_ids;
    if (!avaliableFontIDs.length) return null;
    return (
      <div className='font-cate-list' key={cataName} id={cataName}>
        {avaliableFontIDs.map(fID => {
          const { fileName, font_id_no, preview_img } = allFontData[fID];
          const isActive = font_id_no === activeItemID;
          const prevImg = (
            <div
              className='indImg'
              style={{
                maskImage: `url("${cdnApi(preview_img, {
                  format: 'webp',
                })}")`,
                WebkitMaskImage: `url("${cdnApi(preview_img, {
                  format: 'webp',
                })}")`,
              }}
            />
          );

          return (
            <div
              className={`font-item${isActive ? ' active' : ''}`}
              key={font_id_no}
              onClick={() => {
                const nextVal = {
                  fontFamily: font_id_no,
                  fontUrl: fileName,
                };

                setLoadingFont(true);

                onChange?.(nextVal);

                loadFontAction({
                  ...nextVal,
                }).then(() => {
                  setActiveItemID(font_id_no);
                  setLoadingFont(false);
                  onFontLoaded?.();
                });
              }}
            >
              {prevImg}
            </div>
          );
        })}
      </div>
    );
  };

  const activeItemInfo = allFontData?.[activeItemID];

  return (
    <Popover>
      <PopoverTrigger
        style={{
          border: 'none',
        }}
        className='w-full rounded-sm h-6 px-2 bg-custom-gray'
      >
        {activeItemInfo ? (
          <div className='flex items-center justify-between w-full'>
            <div
              title={activeItemInfo.name}
              style={{
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {/* {activeItemInfo.name} */}
              <img
                className='flex-1'
                src={cdnApi(activeItemInfo.preview_img)}
                style={{
                  height: 12,
                }}
                alt=''
              />
            </div>
            <Icon name='down-bold' size={16} />
          </div>
        ) : (
          <div className='text-left text-xs flex items-center justify-between'>
            <span>请选择字体</span>
            <Icon name='down-bold' size={16} />
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent
        side='left'
        align='start'
        className='w-[300px] p-0'
        style={{ zIndex: 9999 }}
      >
        <SelectorContainer className='font_selector_container'>
          <div className='search-container'>
            <div className='search-input'>
              <Icon name='search' size={16} className='search-icon' />
              <Input
                placeholder='搜索字体...'
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                className='w-full'
              />
              {searchVal && (
                <Icon
                  name='close'
                  size={16}
                  className='clear-icon'
                  onClick={() => setSearchVal('')}
                />
              )}
            </div>
          </div>
          <div className='font_list' ref={fontListDOM}>
            {!searchVal && (
              <div className='font-cate'>
                {sortData.map(sData => {
                  const { name: cataName } = sData;
                  const isActive = activeCate === cataName;
                  return (
                    <div
                      className={clas('cate-item', isActive && 'active')}
                      onClick={() => {
                        setActiveCate(cataName);
                      }}
                      key={cataName}
                    >
                      {cataName}
                    </div>
                  );
                })}
              </div>
            )}
            <ScrollArea className='list-container relative max-h-[400px]'>
              {renderContent()}
            </ScrollArea>
          </div>
          {loadingFont && (
            <div className='loadingTip'>
              <Loading />
              加载中...
            </div>
          )}
        </SelectorContainer>
      </PopoverContent>
    </Popover>
  );
};

export default FontFamilySelector;
