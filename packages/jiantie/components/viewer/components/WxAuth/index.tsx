import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import clas from 'classnames';
import { getWechatInfo } from '../wechat';
import styled from '@emotion/styled';
import { EventEmitter } from '@mk/utils';

const WxAuthContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  z-index: 999999;

  .content {
    background-color: #fff;
    border-radius: 8px 8px 0 0;
    position: relative;
    z-index: 1;
    padding: 16px;
    // zoom: calc(1 / var(--canvas-scale));
    transform-origin: 0 0;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }

  .primaryBtn {
    height: 48px;
    line-height: 48px;
    text-align: center;
    width: 100%;
    border-radius: 8px;
    background-color: #1a87ff;
    color: #fff;
    margin-bottom: 16px;
  }

  .title {
    margin-bottom: 24px;
    display: flex;
    align-items: flex-start;
  }

  .label {
    margin-left: 8px;
  }

  .flex {
    display: flex;
  }

  .normalBtn {
    height: 48px;
    line-height: 48px;
    text-align: center;
    width: 100%;
    border-radius: 8px;
    color: #1a87ff;
  }

  .borderBtn {
    height: 48px;
    line-height: 48px;
    text-align: center;
    width: 100%;
    border-radius: 8px;
    border: 1px solid #cdcdcf;
    margin-right: 8px;
  }

  .mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }
`;

export default function WxAuthBtn() {
  const [mount, setMount] = useState(false);
  const [comfirmCancel, setComfirmCancel] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const openAuth = () => {
    setMount(true);
  };
  const onCancel = () => {
    setMount(false);
  };
  useEffect(() => {
    // setMount(true)
    EventEmitter.on('wxAuth', openAuth);
    return () => {
      EventEmitter.rm('wxAuth', openAuth);
    };
  }, []);

  if (mount) {
    return ReactDOM.createPortal(
      <WxAuthContainer>
        {!comfirmCancel ? (
          <div className='content'>
            <div className='title'>
              <img
                src='https://img2.maka.im/cdn/webstore10/jiantie/auth-icon.svg'
                alt='AuthIcon'
              />
              <div className='label'>点击“确认”一键登录查看完整内容</div>
            </div>
            <div
              className='primaryBtn'
              style={{
                opacity: confirming ? 0.5 : 1,
              }}
              onClick={() => {
                if (confirming) return;
                setConfirming(true);
                const { jumpToAuth } = getWechatInfo();
                jumpToAuth();
              }}
            >
              确认
            </div>
            <div
              className='normalBtn'
              onClick={() => {
                setComfirmCancel(true);
              }}
            >
              取消
            </div>
          </div>
        ) : (
          <div className='content'>
            <div className='title'>
              <img
                src='https://img2.maka.im/cdn/webstore10/jiantie/warning-icon.svg'
                alt='WarningIcon'
              />
              <div className='label'>
                不登录您可能无法提交，确认不登录浏览吗？
              </div>
            </div>
            <div className='flex'>
              <div className='borderBtn' onClick={onCancel}>
                暂不登录
              </div>
              <div
                className='primaryBtn'
                style={{
                  opacity: confirming ? 0.5 : 1,
                }}
                onClick={() => {
                  if (confirming) return;
                  setConfirming(true);
                  const { jumpToAuth } = getWechatInfo();
                  jumpToAuth();
                }}
              >
                登录查看完整内容
              </div>
            </div>
          </div>
        )}
        <div className='mask'></div>
      </WxAuthContainer>,
      document.body
    );
  }
  return <></>;
}
