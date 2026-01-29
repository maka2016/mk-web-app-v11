import MobileHeader from '@/components/DeviceWrapper/mobile/Header';

export default async function Page() {
  return (
    <div>
      <MobileHeader title='使用教程' />
      <img
        className='w-full'
        src={'https://img2.maka.im/cdn/webstore10/xueji/tutorial_content.png'}
      />
    </div>
  );
}
