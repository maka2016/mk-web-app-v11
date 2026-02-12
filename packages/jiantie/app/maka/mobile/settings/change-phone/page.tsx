'use client';
import { API, getAppId, getUid, getVerifyCodeV10, request } from '@/services';
import { Button } from '@workspace/ui/components/button';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import MobileHeader from '../../../../../components/DeviceWrapper/mobile/Header';
import styles from './index.module.scss';

const ChangePhone = () => {
  const [oldPhone, setOldPhone] = useState('');
  const [unbindCode, setUnbindCode] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const [enableCode, setEnableCode] = useState(true);
  const [codeText, setCodeText] = useState('获取验证码');
  const [aliSDKReady, setAliSDKReady] = useState(false);
  const phoneRef = useRef(phone); // 用 useRef 保持最新的 phone
  const oldPhoneRef = useRef(oldPhone); // 用 useRef 保持最新的 oldPhone
  const captchaRef = useRef<any>('');
  const [loading, setLoading] = useState(false);
  const [isBindPhone, setIsBindPhone] = useState(false);
  const isBindPhoneRef = useRef(false);

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

    const currentPhone = isBindPhoneRef.current
      ? phoneRef.current
      : oldPhoneRef.current;

    if (currentPhone.length !== 11) {
      toast.error('手机号码不正确');
      return;
    }

    try {
      setCodeText('发送中...');
      await getVerifyCodeV10({
        type: 'bind',
        mobile: currentPhone,
        ...captchaParams,
      });

      toast.success('验证码发送成功,请查收');
      setEnableCode(false);
      countDown();
      // setCodeText('60')
    } catch (error: any) {
      setEnableCode(true);
      setCodeText('获取验证码');

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

  const onNext = () => {
    toast.dismiss();
    if (oldPhone.length !== 11) {
      toast.error('原手机号不正确');
      return;
    }
    if (unbindCode.trim().length !== 4) {
      toast.error('解绑验证码不正确');
      return;
    }
    setIsBindPhone(true);
    isBindPhoneRef.current = true;
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
      await request.post(
        `${API('主服务API')}/api/plat/v1/users/${uid}/change_phone`,
        {
          tel: phone,
          code: code,
          code_unbind: unbindCode,
        }
      );
      await request.post(`${API('apiv10')}/auths/${appid}/${uid}`, {
        regType: 'phone',
        loginid: phone,
        verifyCode: code,
      });
      toast.success('绑定成功');
      setLoading(false);
    } catch (error) {
      toast.error((error as any).response.data.message);
      setLoading(false);
    }
  };

  return (
    <div className='bg-white h-full'>
      <Script
        src='https://img2.maka.im/cdn/webstore7/sdk/ct4.js'
        onLoad={() => {
          setAliSDKReady(true);
        }}
      ></Script>
      <MobileHeader title='更换手机' />
      {!isBindPhone ? (
        <div className={styles.container}>
          <div className={styles.title}>原手机号</div>
          <div className={styles.input}>
            <input
              type='number'
              placeholder='请输入原手机号'
              maxLength={11}
              max={11}
              value={oldPhone}
              onChange={e => {
                if (e.target.value.length > 11) {
                  return;
                }
                setOldPhone(e.target.value);
              }}
            />
          </div>
          <div className={styles.input}>
            <input
              placeholder='请输入验证码'
              type='number'
              value={unbindCode}
              onChange={e => {
                setUnbindCode(e.target.value);
              }}
            />
            <div className={styles.verifycode} onClick={() => sendCode()}>
              {codeText}
            </div>
          </div>
          <Button size='lg' className='w-full mt-6' onClick={() => onNext()}>
            下一步
          </Button>
        </div>
      ) : (
        <div className={styles.container}>
          <div className={styles.title}>新手机号</div>
          <div className={styles.input}>
            <input
              type='number'
              placeholder='请输入新手机号'
              maxLength={11}
              max={11}
              value={phone}
              onChange={e => {
                if (e.target.value.length > 11) {
                  return;
                }
                setPhone(e.target.value);
              }}
            />
          </div>
          <div className={styles.input}>
            <input
              placeholder='请输入验证码'
              type='number'
              value={code}
              onChange={e => {
                setCode(e.target.value);
              }}
            />
            <div className={styles.verifycode} onClick={() => sendCode()}>
              {codeText}
            </div>
          </div>
          <Button
            size='lg'
            className='w-full mt-6'
            onClick={() => onBindPhone()}
          >
            绑定手机
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChangePhone;
