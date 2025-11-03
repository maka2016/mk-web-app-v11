import { Skeleton } from './ui/skeleton';

const Loading = () => {
  return (
    <div
      style={{
        maxWidth: '400px',
        width: '100%',
        height: '100vh',
        margin: 'auto',
        overflowY: 'hidden',
      }}
      className='grid grid-cols-1 items-center gap-4 p-4'
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className='flex flex-1 flex-col space-y-3 gap-4 w-full mb-4'
          key={index}
        >
          <Skeleton className='h-[125px] w-full rounded-xl' />
          <div className='space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-[200px]' />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Loading;
