import { API, request } from '@/services';
import APPBridge from '@/store/app-bridge';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';

const KefuQrcode = () => {
  const [qrcode, setQrcode] = useState('');

  const getQrcode = async () => {
    const res = await request.get(
      `${API('主服务API')}/logos?names[]=wechat_qrcode`
    );
    setQrcode(res?.data?.logos?.wechat_qrcode?.imageUrl);
  };

  useEffect(() => {
    getQrcode();
  }, []);

  const kefu = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall({
        type: 'MkOpenAppKefu',
        params: {
          //不需要
        },
      });
    } else {
      window.location.href =
        'https://work.weixin.qq.com/kfid/kfc815adea102660ae6';
    }
  };

  const saveImage = () => {
    APPBridge.appCall({
      type: 'MKSaveImage',
      params: {
        url: qrcode,
      },
    });
  };

  return (
    <div className=' flex flex-col items-center gap-3 p-6'>
      <div className='flex-1'>
        <QRCodeCanvas value={qrcode} />
      </div>
      <div className='flex items-center gap-6'>
        <div
          className='flex flex-col items-center justify-center gap-2'
          onClick={kefu}
        >
          <img
            className='size-8'
            src='https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png'
            alt=''
          />
          <span className='text-sm text-gray-500'>分享微信</span>
        </div>
        <div
          className='flex flex-col items-center justify-center gap-2'
          onClick={() => saveImage()}
        >
          <img
            className='size-8'
            src='https://res.maka.im/cdn/webstore7/assets/app/common/icon_gen_poster.png'
            alt=''
          />
          <span className='text-sm  text-gray-500'>保存图片</span>
        </div>
      </div>
    </div>
  );
};

export default KefuQrcode;
