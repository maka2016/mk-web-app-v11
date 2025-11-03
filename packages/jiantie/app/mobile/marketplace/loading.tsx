import MobileHeader from '@/components/DeviceWrapper/mobile/Header';

export default function Loading() {
  return (
    <div className={'flex flex-col overflow-hidden relative'}>
      <MobileHeader
        title={''}
        style={{
          zIndex: 9999,
        }}
      />
      <div className='flex-1 max-h-full overflow-auto'></div>
    </div>
  );
}
