'use client';
import {
  API,
  cdnApi,
  getAppId,
  getVerifyCodeV10,
  request,
  userLoginV10,
} from '@/services';
import { useStore } from '@/store';
import { queryToObj, setCookieExpire } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

const Login = () => {
  const appid = getAppId();
  const [check, setCheck] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [enableCode, setEnableCode] = useState(true);
  const [codeText, setCodeText] = useState('获取验证码');
  const phoneRef = useRef(phone); // 用 useRef 保持最新的 phone
  const captchaRef = useRef<any>('');
  const [showMobileAuth, setShowMobileAuth] = useState(false);
  const { setLoginShow } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [aliSDKReady, setAliSDKReady] = useState(false);
  const [client_key, setClientKey] = useState('');
  const [ready, setReady] = useState<boolean>(false);
  const [verifyCodeLogin, setVerifyCodeLogin] = useState(false);

  // 阿里云一键登录
  const phoneNumberServer = useRef<any>(null);

  const checkConnention = async () => {
    const netType = phoneNumberServer.current.getConnection(); // 返回netType: wifi, cellular, unknown
    if (netType !== 'wifi') {
      setShowMobileAuth(true);
    }
  };

  useEffect(() => {
    // phoneNumberServer.current = new PhoneNumberServer()
    // checkConnention()
  }, []);

  // 抖音验证签名
  const config = async () => {
    console.log('config start');
    const sdk = (window as any).DouyinOpenJSBridge;
    const url = location.origin + location.pathname;

    const res: any = await request.get(
      `${API('apiv10')}/douyin/signature?clientKey=awpg2msqc7cazd4x&url=${url}`
    );
    console.log('config res', res);

    sdk.config({
      params: {
        client_key: res.clientKey,
        signature: res.signature,
        timestamp: `${res.timestamp}`,
        nonce_str: res.nonceStr,
        url,
      },
    });

    setClientKey(res.clientKey);

    sdk.ready(() => {
      setReady(true);
      console.log('Config Ready');
    });

    sdk.error((res: any) => {
      console.log('Config error', res);
      toast.error(`SDK Config Error: ${JSON.stringify(res)}`);
    });
  };

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isDouyin = /aweme/gi.test(userAgent);
    if (!isDouyin) {
      setVerifyCodeLogin(true);
    }
    if (isDouyin && (window as any).DouyinOpenJSBridge) {
      config();
    }
  }, [loaded]);

  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     mkWebStoreLogger.track_pageview({
  //       page_type: 'login_page',
  //       page_id: `login_page`,
  //     });
  //   }
  // }, [typeof window]);

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
        type: 'login',
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

  // 验证码登录
  const onVerifyLogin = async () => {
    if (phone.length !== 11) {
      toast.error('手机号码不正确');
      return;
    }
    if (code.trim().length !== 4) {
      toast.error('验证码不正确');
      return false;
    }

    if (!check) {
      toast.error('请勾选同意服务协议和隐私政策');
      return;
    }

    try {
      const { clickid } = queryToObj();

      const res = (await userLoginV10({
        loginType: 'verifycode',
        loginid: phone,
        verifyCode: code,
        douyinH5Clickid: clickid || '',
      })) as any;

      if (res) {
        setCookieExpire(`${appid}_token`, res?.token);
        setCookieExpire(`${appid}_uid`, res.uid);
        setLoginShow(false);
        location.reload();
      }
    } catch (error) {
      toast.error('登录失败');
    }
  };

  // 抖音授权
  const onDouyinAuth = () => {
    if (!check) {
      toast.error('请勾选同意服务协议和隐私政策');
      return;
    }
    if (ready) {
      const sdk = (window as any).DouyinOpenJSBridge;
      sdk.showOpenAuth({
        params: {
          client_key,
          state: '',
          scopes: {
            user_info: 0, // 0: 必选；1: 可选，默认不选中； 2: 可选，默认选中
          },
          response_type: 'code',
        },
        success: ({ ticket }: any) => {
          console.log(ticket);
          onMobileAuthLogin('douyin_code', ticket, client_key);
        },
        error: (res: any) => toast(`Auth Error: ${JSON.stringify(res)}`),
      });
    }
  };

  // 阿里云一键登录
  const onMobileAuthLogin = async (
    loginType: string,
    spToken: string,
    extAppId?: string
  ) => {
    const { appid = 'jiantie', clickid } = queryToObj();
    const res = (await request.post(
      `${API('apiv10')}/auths/sessions`,
      {
        loginType,
        loginid: spToken,
        douyinH5Clickid: clickid || '',
        extAppId: extAppId,
      },
      {
        headers: {
          appid,
        },
      }
    )) as any;
    setCookieExpire(`${appid}_token`, res?.token);
    setCookieExpire(`${appid}_uid`, res.uid);
    setLoginShow(false);
    location.reload();
  };

  const checkLogin = (accessToken: string, jwtToken: string) => {
    phoneNumberServer.current?.checkLoginAvailable({
      accessToken: accessToken,
      jwtToken: jwtToken,
      success: function (res: any) {
        console.log('身份鉴权成功, 可唤起登录界面', res);
        // 身份鉴权成功,调用 getLoginToken 接口
        getToken();
      },

      // 身份鉴权失败,提示用户关闭Wi-Fi或者尝试其他登录方案
      error: function (res: any) {
        console.log('身份鉴权失败', res);
        toast.error('身份鉴权失败, 请手动登录');
        setShowMobileAuth(false);
      },
    });
  };

  const getToken = () => {
    phoneNumberServer.current.getLoginToken({
      // 成功回调
      success: function (res: any) {
        // 一键登录: 可发请求到服务端调用 GetPhoneWithToken API, 获取用户手机号, 完成登录
        onMobileAuthLogin('aliverify_h5', res.spToken);
      },
      // 失败回调
      error: function (res: any) {
        toast.error('获取手机号码失败, 请手动登录');
        setShowMobileAuth(false);
      },
      // 授权页状态监听函数
      watch: function () {},
      // 配置选项
      authPageOption: {
        navText: '一键登录',
        subtitle: '', // 副标题
        btnText: '立即登录',
        agreeSymbol: '、',
        privacyBefore: '我已阅读并同意',
        isDialog: true, // 是否是弹窗样式
        manualClose: true, // 是否手动关闭弹窗/授权页
      },
    });
  };

  const getAuth = async () => {
    // 向后端发起请求，获取accessToken, jwtToken, 后端调用 getAuthToken 接口
    try {
      const res = (await request.get(
        `${API('apiv10')}/aliyun/dypns-auth-token?config=jiantie&bizType=1`
      )) as any;

      if (res.accessToken && res.jwtToken) {
        return res;
      }
    } catch (error) {
      console.log(error);
    }
  };

  // 阿里云一键登录
  const onAliAuthLogin = async () => {
    if (!check) {
      toast.error('请勾选同意服务协议和隐私政策');
      return;
    }
    const query = queryToObj();
    if (query.accessToken && query.jwtToken) {
      checkLogin(
        decodeURIComponent(query.accessToken),
        decodeURIComponent(query.jwtToken)
      );
      return;
    }
    const token = (await getAuth()) as any;
    if (!token) {
      toast.error('获取token失败, 请手动登录');
      setShowMobileAuth(false);
      return;
    }
    console.log('token', token);
    const { accessToken, jwtToken } = token;
    checkLogin(accessToken, jwtToken);
  };

  const renderContent = () => {
    if (ready && !verifyCodeLogin) {
      return (
        <>
          <div className={styles.head}>登录后继续更多操作</div>

          <Button
            size='lg'
            className='w-full mb-4 flex items-center rounded-full h-[56px] p-4'
            variant='outline'
            onClick={() => onDouyinAuth()}
          >
            <img
              src={cdnApi('/cdn/webstore10/jiantie/icon_douyin.png')}
              className='w-[28px]'
            />
            <span className='flex-1 text-base font-semibold mr-[28px]'>
              抖音一键登录
            </span>
          </Button>
          <Button
            size='lg'
            className='w-full flex items-center rounded-full h-[56px] p-4'
            variant='outline'
            onClick={() => setVerifyCodeLogin(true)}
          >
            <img src='/assets/phone.png' className='w-[28px]' />
            <span className='flex-1 text-base font-semibold mr-[28px]'>
              手机号登录
            </span>
          </Button>
        </>
      );
    }

    return (
      <>
        {ready && (
          <Icon
            name='left'
            className={styles.back}
            size={20}
            onClick={() => setVerifyCodeLogin(false)}
          />
        )}
        <div className={styles.head}>手机号码登录</div>

        <div className={styles.input}>
          <input
            type='number'
            placeholder='请输入手机号'
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
        <div
          className={styles.input}
          style={{
            marginTop: 12,
          }}
        >
          <input
            placeholder='请输入验证码'
            type='number'
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
          onClick={() => onVerifyLogin()}
        >
          登录
        </Button>
      </>
    );
  };

  return (
    <>
      <Script
        src='https://img2.maka.im/cdn/webstore7/sdk/ct4.js'
        onLoad={() => {
          setAliSDKReady(true);
        }}
      ></Script>
      <Script
        src={cdnApi('/cdn/webstore10/js/douyin_open.umd.js')}
        onLoad={() => {
          setLoaded(true);
        }}
      ></Script>
      <div className={styles.loginPage}>
        <Icon
          name='close'
          className={styles.close}
          size={20}
          onClick={() => setLoginShow(false)}
          color='#000000E0'
        />

        {renderContent()}

        <div className={styles.privacy}>
          {check ? (
            <Icon
              name='radiochecked'
              color='#000'
              size={20}
              onClick={() => setCheck(false)}
            />
          ) : (
            <Icon name='radiocheck' size={20} onClick={() => setCheck(true)} />
          )}
          <span>
            我已阅读并同意{' '}
            <a
              href='https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/%E7%AE%80%E5%B8%96%E7%94%A8%E6%88%B7%E6%9C%8D%E5%8A%A1%E5%8D%8F%E8%AE%AE.html'
              target='_blank'
              rel='noreferrer'
            >
              服务协议
            </a>{' '}
            和{' '}
            <a
              href='https://makapicture.oss-cn-beijing.aliyuncs.com/app_common/%E7%AE%80%E5%B8%96%E4%B8%AA%E4%BA%BA%E4%BF%A1%E6%81%AF%E4%BF%9D%E6%8A%A4%E6%94%BF%E7%AD%96_.html'
              target='_blank'
              rel='noreferrer'
            >
              隐私政策
            </a>
          </span>
        </div>
      </div>
    </>
  );
};

export default Login;
