import APPBridge from '@mk/app-bridge';
import { isWechat } from '@mk/utils';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

const noneAvatar =
  'https://img2.maka.im/cdn/webstore10/xueji/groupbuy_avatar_none.png';
const GroupBuy = ({ viewerSDK }: any) => {
  useEffect(() => {
    const worksId = viewerSDK?.workInfo?.getWorksID?.() || '';
    const isTemplate = /^T_/.test(worksId);

    if (isWechat() && !isTemplate) {
      // 跳转小程序
    }
  }, []);
  return (
    <div>
      {createPortal(
        <div
          id='mk-pintuan-screen-portal'
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            bottom: 0,
            right: 0,
            zIndex: '31',
            overflow: 'hidden',
            pointerEvents: 'none', // Allow clicking through the container
          }}
        >
          <div className='group_buy_footer'>
            <div className='title'>发起拼团</div>
            <div className='group_buy_content'>
              <div className='avatars'>
                <div className='avatarItem'>
                  <img src={noneAvatar} className='img' />
                </div>
                <div className='avatarItem'>
                  <img src={noneAvatar} className='img' />
                </div>
                <div className='avatarItem'>
                  <img src={noneAvatar} className='img' />
                </div>
              </div>
              <div
                className='btn'
                onClick={() => {
                  toast('请分享到微信使用');
                }}
              >
                我来发起拼团
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default GroupBuy;
