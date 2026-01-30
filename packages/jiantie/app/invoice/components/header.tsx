'use client';

import { getUid } from '@/services';
import { useStore } from '@/store';
import { Button } from '@workspace/ui/components/button';

const Header = () => {
  const { setLoginShow, userProfile } = useStore();
  const uid = getUid();
  if (uid) {
    return <></>;
  }
  return (
    <div className='flex items-center justify-end px-4 py-2'>
      <Button size='sm' onClick={() => setLoginShow(true)}>
        登录
      </Button>
    </div>
  );
};

export default Header;
