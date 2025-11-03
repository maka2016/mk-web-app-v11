import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { PermissionList } from '../../utils/getPermission';
import axios from 'axios';
import clas from 'classnames';
import { cdnApi, getWorksDetailStatic } from '@mk/services';
import { BehaviorBox } from '../BehaviorTracker';
import { IWorksData } from '@mk/works-store/types';
import { AppContext } from '../../types';
import { getAppName } from '../../config';
import styled from '@emotion/styled';

const BrandIdentifyContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  pointer-events: none;
  z-index: 2222;
  display: flex;
  align-items: flex-end;
  &.tail {
    position: relative;
    height: fit-content;
    z-index: 999;
    background: #333;
  }

  .brand_identify_container {
    position: relative;
    pointer-events: all;
    width: 100%;
    // height: 24px;
    padding-bottom: var(--safe-area-inset-bottom);
    background: rgba(#000, 0.4);
  }
  .brand_identify {
    font-size: 12px;
    line-height: 24px;
    text-align: center;
    color: #fff;
    padding: 2px 0 0 0;
  }
  .footer {
    pointer-events: all;
    position: absolute;
    right: 0;
    padding: 0 12px;
    top: 0;
    bottom: 0;
    z-index: 11;
    color: rgba(255, 255, 255, 1);
    pointer-events: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    &.no_brandIdentify {
      position: fixed;
      top: unset;
      bottom: calc(24px + var(--safe-area-inset-bottom));
      right: 24px;
      .footer_btn {
        background-color: rgba(0, 0, 0, 0.7);
        height: 36px;
        width: 36px;
      }
    }

    .footer_btn {
      font-size: 16px;
    }
    .popover {
      position: absolute;
      font-size: 14px;
      right: 12px;
      top: 0;
      transform: translateY(-110%);
      background-color: #fff;
      width: 196px;
      color: #000;
      padding: 12px;
      border-radius: 4px;
      box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
      z-index: 12;
      height: fit-content;
    }
  }
`;
const SpamPanel = styled.div`
  pointer-events: auto;
  position: fixed;
  right: 0;
  left: 0;
  bottom: 0;
  top: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  color: #000;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
  z-index: 12;
  :global {
    .spam-panel-container {
      background-color: #fff;
      padding: 20px;
      border-radius: 6px;
      width: 80%;
      z-index: 2;
    }

    .spam-panel-item {
      padding: 6px 0;
      display: flex;
      align-items: center;
      input {
        margin: 0 8px 0 0;
      }
    }
    .spam-panel-header {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .spam-panel-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }
    .mask {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1;
    }
  }
`;

interface Props {
  uid: string;
  worksId: string;
  worksData: IWorksData;
  isTailPage?: boolean;
  query: AppContext['query'];
}

const radioItems = [
  {
    id: 1,
    value: '色情',
  },
  {
    id: 2,
    value: '诈骗',
  },
  {
    id: 3,
    value: '谣言',
  },
  {
    id: 4,
    value: '垃圾广告',
  },
  {
    id: 5,
    value: '政治敏感',
  },
  {
    id: 6,
    value: '侵权（抄袭冒用',
  },
  {
    id: 7,
    value: '其他',
  },
];

export default function BrandIdentify({
  uid,
  worksId,
  isTailPage = false,
  query,
}: Props) {
  const { screenshot } = query;
  const storageId = `spamed-${worksId}`;
  const [isSpamed, setIsSpamed] = useState(
    localStorage.getItem(storageId) === 'true'
  );
  const [value, setValue] = useState('');
  const [showSpamPanel, setShowSpam] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const renderFooter = () => {
    if (screenshot) {
      return <></>;
    }
    const appid = query.appid || '';

    const needFootnote = ['jiantie', 'makaai', 'xueji'];
    const isNeedFootnote = !needFootnote.includes(appid);

    if (!isNeedFootnote) {
      return null;
    }

    const footnote = `使用${getAppName(query.appid || '')}制作`;

    return (
      <div className='brand_identify_container'>
        <div
          className='brand_identify'
          onClick={() => {
            window.location.href = `https://www.maka.im/mk-store-7/wapdownload/h5tail?ref_objtype=fanyeh5_viewer_prod_identify_btn&appid=${
              query.appid || ''
            }`;
          }}
        >
          {footnote}
        </div>
        <div
          className={`footer`}
          style={
            {
              // opacity: showMore ? 1 : 0.6,
            }
          }
        >
          <span
            className='footer_btn'
            onClick={() => {
              setShowMore(!showMore);
            }}
          >
            •••
          </span>
          {showMore && (
            <div
              className='popover'
              style={{
                width: 98,
              }}
            >
              <BehaviorBox
                behavior={{
                  object_type: 'fanyeh5_viewer_prod_identify_btn',
                }}
                onClick={() => {
                  window.location.href = `https://www.maka.im/mk-store-7/wapdownload/h5tail?ref_objtype=fanyeh5_viewer_prod_identify_btn&appid=${
                    query.appid || ''
                  }`;
                }}
                style={{
                  fontSize: 12,
                  textAlign: 'right',
                }}
              >
                {/* 使用 MAKA（码卡）制作 */}
                <img
                  style={{ maxWidth: '100%' }}
                  src={cdnApi('/assets/viewer-loading-logo.png')}
                  alt=''
                />
              </BehaviorBox>
              <hr
                color='#eee'
                style={{
                  height: 1,
                  border: 'none',
                }}
              />
              <div
                className='spam'
                style={{
                  textAlign: 'right',
                }}
                onClick={() => {
                  setShowSpam(true);
                  setShowMore(false);
                }}
              >
                举报
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReportMenu = () => {
    if (showSpamPanel) {
      return ReactDOM.createPortal(
        <SpamPanel>
          <div
            className='mask'
            onClick={() => {
              setShowSpam(false);
            }}
          ></div>
          {isSpamed ? (
            <div className='spam-panel-container'>
              <div className='spam-panel-header'>
                <span>举报</span>
              </div>
              <div>
                <span>感谢您的举报，我们会尽快处理</span>
              </div>
            </div>
          ) : (
            <div className='spam-panel-container'>
              <div className='spam-panel-header'>
                <span>举报</span>
              </div>
              <div>
                {radioItems.map(item => {
                  const isChecked = item.value === value;
                  return (
                    <div
                      className='spam-panel-item'
                      key={item.id}
                      onClick={() => {
                        setValue(item.value);
                      }}
                    >
                      <input
                        type='radio'
                        name='spam'
                        id={`spam${item.id}`}
                        value={item.value}
                        checked={isChecked}
                        onChange={() => {}}
                      />
                      <label htmlFor={`spam${item.id}`}>{item.value}</label>
                    </div>
                  );
                })}
              </div>
              <div className='spam-panel-footer'>
                <button
                  type='submit'
                  onClick={() => {
                    localStorage.setItem(storageId, 'true');
                    setIsSpamed(true);
                    axios.post('https://apiv5.maka.im/api/witnesses', {
                      reason: value,
                      is_lite_event: 0,
                      event_id: worksId,
                      uid,
                      title: getWorksDetailStatic().title,
                    });
                  }}
                >
                  提交
                </button>
              </div>
            </div>
          )}
        </SpamPanel>,
        document.body
      );
    }
  };

  return (
    <BrandIdentifyContainer className={clas([isTailPage && 'tail'])}>
      {renderFooter()}
      {renderReportMenu()}
    </BrandIdentifyContainer>
  );
  // return null
}
