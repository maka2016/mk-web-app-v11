'use client';
import { API, getAppId, getUid, request } from '@/services';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

const ResetPassword = (props: Props) => {
  const { onClose } = props;
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!oldPassword) {
      toast.error('请输入旧密码');
      return;
    }
    if (!newPassword) {
      toast.error('请输入新密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次密码不一致');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const appid = getAppId();
      const uid = getUid();
      await request.put(
        `${API('apiv10')}/users/${appid}/${uid}/change-password`,
        {
          oldPassword,
          newPassword,
        }
      );

      toast.success('密码修改成功');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error: any) {
      toast.error(error.message);
      console.log('error---', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='p-4 flex flex-col gap-3 pb-6'>
      <div className='flex items-center'>
        <Label className='w-22 flex-shrink-0'>旧密码：</Label>
        <Input
          type='password'
          value={oldPassword}
          onChange={e => setOldPassword(e.target.value)}
        />
      </div>
      <div className='flex items-center'>
        <Label className='w-22 flex-shrink-0'>新密码：</Label>
        <Input
          type='password'
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />
      </div>
      <div className='flex items-center'>
        <Label className='w-22 flex-shrink-0'>确认新密码：</Label>
        <Input
          type='password'
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
      </div>
      <Button className='w-full mt-2' onClick={handleSubmit}>
        确认修改
      </Button>
    </div>
  );
};

export default ResetPassword;
