import { safeCopy } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import toast from 'react-hot-toast';

const CustomerService = (props: { onClose: () => void }) => {
  const { onClose } = props;
  return (
    <div className='w-80'>
      {/* <div className="w-full h-full bg-black/60"></div> */}
      <div
        className='py-6 px-4 pb-5 w-80 rounded-[20px] flex flex-col items-center'
        style={{
          background: 'linear-gradient(180deg, #ebf3ff 0%, #ffffff 23.41%)',
        }}
      >
        <div className='w-20 h-20 rounded-full overflow-hidden mb-5'>
          <img src='/assets/customerService.png' alt='' />
        </div>
        <div className='font-[var(--font-semibold)] text-base leading-6 text-black/88'>
          客服微信
        </div>
        <div className='mt-0.5 font-normal text-xs leading-5 text-center text-black/45'>
          长按保存图片，使用微信扫描二维码添加
        </div>
        <div className='w-[140px] h-[140px] my-2 mb-5 border-2 border-[#e2e7f3] p-1.5 rounded-lg'>
          <img
            src='https://work.weixin.qq.com/kf/kefu/qrcode?kfcode=kfc815adea102660ae6'
            alt=''
          />
        </div>
        <div className='font-[var(--font-semibold)] text-base leading-6 text-black/88'>
          客服电话
        </div>
        <div className='flex items-center gap-1.5 mt-1 text-xl leading-7 text-center'>
          <a href='tel:020-39340995'>020-39340995</a>
          <Icon
            name='copy'
            size={14}
            color='#969696'
            onClick={() => {
              safeCopy('020-39340995');
              toast.success('复制成功');
            }}
          />
        </div>
      </div>
      <div
        className='mt-8 mx-auto w-10 h-10 flex items-center justify-center rounded-full bg-white/38 z-[9] text-white'
        onClick={() => onClose()}
      >
        <Icon name='close' size={24} />
      </div>
    </div>
  );
};

export default CustomerService;
