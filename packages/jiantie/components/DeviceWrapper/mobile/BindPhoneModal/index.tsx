'use client';
import {
  API,
  getAppId,
  getUid,
  getUserProfileV10,
  getVerifyCodeV10,
  request,
} from '@/services';
import { useStore } from '@/store';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const BindPhoneModal = () => {
  const { bindPhoneShow, setBindPhoneShow, setProfile } = useStore();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [enableCode, setEnableCode] = useState(true);
  const [codeText, setCodeText] = useState('获取验证码');
  const [aliSDKReady, setAliSDKReady] = useState(false);
  const phoneRef = useRef(phone); // 用 useRef 保持最新的 phone
  const captchaRef = useRef<any>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    phoneRef.current = phone;
  }, [phone]);

  // 短信倒计时
  const countDown = () => {
    let timer: any = null;
    let count = 60;

    setCodeText(`${count}s`);
    timer = setInterval(function () {
      count--;
      setCodeText(`${count}s`);

      if (count <= 0) {
        clearInterval(timer);
        setCodeText('获取验证码');
        setEnableCode(true);
      }
    }, 1000);
  };

  // 发送短信
  const sendCode = async (captchaParams?: any) => {
    if (!enableCode) {
      return;
    }

    if (phoneRef.current.length !== 11) {
      toast.error('手机号码不正确');
      return;
    }

    try {
      setCodeText('发送中...');
      await getVerifyCodeV10({
        type: 'bind',
        mobile: phoneRef.current,
        ...captchaParams,
      });

      toast.success('验证码发送成功,请查收');
      setEnableCode(false);
      countDown();
      // setCodeText('60')
    } catch (error: any) {
      setEnableCode(true);

      if (error?.response?.data?.statusCode === 403) {
        captchaRef.current?.showCaptcha();
      } else {
        toast.error(error.message);
      }
    }
  };

  // 图形验证码
  const initCaptcha = () => {
    if (!(window as any).initAlicom4) {
      return;
    }
    (window as any).initAlicom4(
      {
        captchaId: process.env.CAPTCHA_ID, // 请填入appId
        product: 'bind',
      },
      function (captchaObj: any) {
        captchaRef.current = captchaObj;
        captchaObj
          .onNextReady(() => {
            //验证码ready之后才能调⽤showCaptcha方法显示验证码
          })
          .onSuccess(() => {
            const result = captchaObj.getValidate();
            console.log('phone', phone);
            sendCode({
              lotNumber: result.lot_number,
              captchaOutput: result.captcha_output,
              passToken: result.pass_token,
              genTime: result.gen_time,
            });
            captchaObj.reset();
          })
          .onError(function () {
            //your code
          });
      }
    );
  };

  // 图形验证码初始化
  useEffect(() => {
    if ((window as any).initAlicom4) {
      initCaptcha();
    }
  }, [aliSDKReady]);

  const getProfile = async () => {
    const uid = getUid();
    const appid = getAppId();
    if (uid) {
      const res = await getUserProfileV10(appid, uid);
      setProfile(res);
    }
  };

  const onBindPhone = async () => {
    if (phone.length !== 11) {
      toast.error('手机号码不正确');
      return;
    }
    if (code.trim().length !== 4) {
      toast.error('验证码不正确');
      return false;
    }

    if (loading) {
      return;
    }
    const appid = getAppId();
    const uid = getUid();
    setLoading(true);

    try {
      await request.post(`${API('apiv10')}/auths/${appid}/${uid}`, {
        regType: 'phone',
        loginid: phone,
        verifyCode: code,
      });
      await getProfile();
      toast.success('绑定成功');
      setBindPhoneShow(false);
      setLoading(false);
    } catch (error) {
      toast.error((error as any).response.data.message);
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={bindPhoneShow}
      onOpenChange={setBindPhoneShow}
      contentProps={{
        onPointerDownOutside: (e: any) => {
          e.preventDefault();
        },
      }}
    >
      <Script
        src='https://img2.maka.im/cdn/webstore7/sdk/ct4.js'
        onLoad={() => {
          setAliSDKReady(true);
        }}
      ></Script>
      <div className='py-4 px-[30px] pb-11'>
        <Icon
          name='close'
          className='absolute top-5 right-5'
          size={20}
          onClick={() => setBindPhoneShow(false)}
          color='#000000E0'
        />
        <div className='font-[PingFang_SC] font-[var(--font-semibold)] text-base leading-6 text-center text-black/88 mb-[46px]'>
          发布需绑定手机
        </div>
        <div className='text-left font-[var(--font-semibold)] text-lg leading-[26px] text-black'>
          绑定手机号
        </div>
        <div className='w-full flex items-center py-3.5 px-5 bg-[#f5f5f5] rounded-lg mt-3'>
          <input
            type='number'
            placeholder='请输入手机号'
            maxLength={11}
            max={11}
            value={phone}
            className='flex-1 border-0 outline-0 h-6 leading-6 text-base text-black bg-transparent'
            onChange={e => {
              if (e.target.value.length > 11) {
                return;
              }
              setPhone(e.target.value);
            }}
          />
        </div>
        <div className='w-full flex items-center py-3.5 px-5 bg-[#f5f5f5] rounded-lg mt-3'>
          <input
            placeholder='请输入验证码'
            type='number'
            className='flex-1 border-0 outline-0 h-6 leading-6 text-base text-black bg-transparent'
            onChange={e => {
              setCode(e.target.value);
            }}
          />
          <div
            className='flex-shrink-0 whitespace-nowrap font-[PingFang_SC] font-normal text-base leading-6 text-black'
            onClick={() => sendCode()}
          >
            {codeText}
          </div>
        </div>
        <Button size='lg' className='w-full mt-6' onClick={() => onBindPhone()}>
          {loading ? '绑定手机中...' : '绑定手机'}
        </Button>
      </div>
    </ResponsiveDialog>
  );
};

export default observer(BindPhoneModal);
