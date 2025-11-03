import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import APPBridge from '@mk/app-bridge';
import { queryToObj, setCookie } from '@mk/utils';
import { IWorksData } from '@mk/works-store/types';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { useEffect, useState } from 'react';
import MusicPlayer from '../MusicPlayer';

const SuspendButtonDiv = styled.div`
  position: fixed;
  right: 0rem;
  top: calc(1.5rem + var(--preview-header-height));
  width: 100%;
  left: 0;
  display: flex;
  //右边开始，两端对齐
  justify-content: space-between;
  // justify-content: flex-end;
  // 垂直居中
  padding-right: 8px;

  gap: 8px;
  z-index: 999998;
`;

const slideIn = keyframes`
  from {
    transform: translateX(-250px);
    opacity: 0;
  }
  to {
    transform: translateX(0px);
    opacity: 1;
  }
`;

const Left = styled.div`
  flex: 1;
  text-align: left;
  flex-shrink: 0;
  opacity: 1;

  display: flex;
  //普通flex
  justify-content: start;
`;

const TrialExpiredDiv = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.45);
  z-index: 999999;

  .trialExpiredContent {
    position: absolute;
    bottom: 13px;
    left: 10px;
    right: 10px;
    background-color: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .tit {
      font-family: PingFang SC;
      font-weight: 600;
      font-style: Semibold;
      font-size: 13px;
      line-height: 20px;
      letter-spacing: 0%;
      color: #020617;
    }
    .desc {
      font-family: PingFang SC;
      font-weight: 400;
      font-style: Regular;
      font-size: 13px;
      line-height: 20px;
      color: #64748b;
      margin-top: 2px;
    }
  }
`;

interface Props {
  isVideoMode: boolean;
  musicVisible: boolean;
  worksData: IWorksData;
  query: any;
  adConfig?: {
    floatAD?: boolean;
    trialExpired?: boolean;
    showExpired?: boolean;
  };
}

const floatMark: Record<string, string> = {
  jiantie: 'https://res.maka.im/assets/jiantie/ad/34x.png?v1',
  xueji: 'https://res.maka.im/cdn/webstore10/xueji/slogan.png',
  huiyao: '',
};

const videoMark: Record<string, string> = {
  jiantie: 'https://res.maka.im/assets/jiantie/ad/%E6%B0%B4%E5%8D%B0.png',
  xueji: 'https://res.maka.im/cdn/webstore10/xueji/slogan.png',
  huiyao: '',
};

const SuspendButton = (props: Props) => {
  const { isVideoMode, musicVisible, worksData, query, adConfig } = props;
  const appid = query.appid;
  const isTemplate = /^T_/.test(query.worksId);
  const isScreenshot = !!queryToObj().screenshot;

  const [showExportMark, setShowExportMark] = useState(false);

  useEffect(() => {
    if (!isTemplate && appid === 'jiantie') {
      logViewerWorkId2Cookie();
    }

    // if (!isTemplate && appid === "jiantie" && !APPBridge.judgeIsInMiniP()) {
    //   if (adConfig?.floatAD) {
    //     setShowH5MiniAD(true);
    //   }
    // }

    const isExportVideo = !!queryToObj().exportVideo;
    if (isExportVideo) {
      // setHideClose(false);
      setShowExportMark(true);
    }
  }, []);

  const logViewerWorkId2Cookie = () => {
    setCookie('viewer_works_id', query.worksId);
  };

  if (isScreenshot) {
    return <></>;
  }

  return (
    <>
      <SuspendButtonDiv>
        {/* {!isTemplate && isWechat() && appid === "jiantie" && ( */}
        <Left>
          {!!adConfig?.floatAD && (
            <>
              {!showExportMark &&
                (appid === 'jiantie' ? (
                  <BehaviorBox
                    behavior={{
                      object_type: 'minip_ad_bar',
                      object_id: query.worksId,
                    }}
                    style={{ display: 'flex', alignItems: 'center' }}
                    className='minip_ad_bar'
                    onClick={() => {
                      if (APPBridge.judgeIsInMiniP()) {
                        APPBridge.minipNav(
                          'navigate',
                          `/pages/home/index?utmSource=virus&utmMedium=minip_viewer&utmContent=${query.worksId}`
                        );
                      } else {
                        setTimeout(() => {
                          location.href = `weixin://dl/business/?appid=wxbcd47d4167a10e41&path=pages/home/index&query=${encodeURIComponent(`utmSource=virus&utmMedium=h5viewer&utmContent=${query.worksId})`)}`;
                        }, 1000);
                      }
                    }}
                  >
                    <img
                      src='https://res.maka.im/assets/jiantie/ad/34x.png?v1'
                      alt=''
                      style={{ height: '32px', marginLeft: '16px' }}
                    />
                  </BehaviorBox>
                ) : (
                  <BehaviorBox
                    // behavior={{
                    //   object_type: "minip_ad_bar",
                    //   object_id: query.worksId,
                    // }}
                    style={{ display: 'flex', alignItems: 'center' }}
                    className='minip_ad_bar'
                  >
                    <img
                      src={floatMark[appid]}
                      alt=''
                      style={{ height: '48px', marginLeft: '16px' }}
                    />
                  </BehaviorBox>
                ))}

              {showExportMark && (
                <img
                  src={videoMark[appid]}
                  alt=''
                  style={{ height: '48px', marginLeft: '32px' }}
                />
              )}
            </>
          )}

          {/* {showH5MiniAD && (
          <>
            <BehaviorBox
              behavior={{
                object_type: "minip_ad_bar_in_h5",
                object_id: query.worksId,
              }}
              className="minip_ad_bar"
              onClick={() => {
                setTimeout(() => {
                  location.href = `weixin://dl/business/?appid=wxbcd47d4167a10e41&path=pages/home/index&query=${encodeURIComponent(`utmSource=virus&utmMedium=h5viewer&utmContent=${query.worksId})`)}`;
                }, 1000);
              }}
            >
              <img
                src="https://res.maka.im/assets/jiantie/ad/jtlogo.png"
                alt=""
              />
            </BehaviorBox>

            <Close onClick={() => setShowH5MiniAD(false)}>
              <img
                src="https://res.maka.im/assets/jiantie/ad/close-one.png"
                alt=""
              />
            </Close>
          </>
        )} */}
        </Left>

        {/* )} */}
        {!isVideoMode && !showExportMark && (
          <MusicPlayer
            visible={musicVisible}
            musicData={worksData?.canvasData?.music}
          ></MusicPlayer>
        )}
      </SuspendButtonDiv>
      {adConfig?.showExpired && (
        <TrialExpiredDiv className='trialExpired'>
          <div className='trialExpiredContent'>
            <div className='trialExpiredText'>
              <div className='tit'>
                {adConfig.trialExpired
                  ? '免费试用已到期，请升级会员查看'
                  : '链接已到期，请升级会员查看'}
              </div>
              {appid === 'jiantie' && (
                <div className='desc'>重要时刻，简帖创作</div>
              )}
            </div>
            {appid === 'jiantie' && (
              <BehaviorBox
                behavior={{
                  object_type: 'work_expired_btn',
                  object_id: query.worksId,
                }}
              >
                <Button
                  size='xs'
                  onClick={() => {
                    location.href = `weixin://dl/business/?appid=wxbcd47d4167a10e41&path=pages/home/index&query=${encodeURIComponent(`utmSource=virus&utmMedium=h5viewer&utmContent=${query.worksId})`)}`;
                  }}
                >
                  升级会员
                </Button>
              </BehaviorBox>
            )}
          </div>
        </TrialExpiredDiv>
      )}
    </>
  );
};

export default SuspendButton;
