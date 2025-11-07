export default function Loading() {
  return (
    <div className='fixed inset-0 flex items-center justify-center bg-white'>
      <div className='flex flex-col items-center gap-4'>
        <div className='h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600'></div>
        <div className='text-sm text-gray-500'>加载中...</div>
      </div>
    </div>
  );
}
