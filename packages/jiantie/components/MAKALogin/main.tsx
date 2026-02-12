'use client';
import {
  API,
  checkResetVerifyCode,
  getAppId,
  getCaptchaCode,
  getLoginQrcode,
  getResetVerifyCode,
  getVerifyCodeV10,
  request,
  resetPassword,
  thirdOauth,
  userLogin,
} from '@/services';
import { useStore } from '@/store';
import {
  delCookie,
  getCookie,
  queryToObj,
  setCookie,
  setCookieExpire,
} from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Mail, X } from 'lucide-react';
import { observer } from 'mobx-react';
import Script from 'next/script';
import { QRCodeCanvas } from 'qrcode.react';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

type LoginType = 'wechat' | 'password' | 'verifycode' | 'resetPassword';

export interface MAKALoginRef {
  handleClose: () => void;
}

interface MAKALoginProps {
  onClose?: () => void;
  scene?: 'pc' | 'mobile';
}

const MAKALoginInner = (
  { onClose, scene = 'mobile' }: MAKALoginProps = {},
  ref: React.Ref<MAKALoginRef>
) => {
  const appid = getAppId();
  const isPc = scene === 'pc';

  // 移动端原有状态
  const [check, setCheck] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [enableCode, setEnableCode] = useState(true);
  const [codeText, setCodeText] = useState('获取验证码');
  const phoneRef = useRef(phone);
  const captchaRef = useRef<any>('');
  const [showMobileAuth, setShowMobileAuth] = useState(false);
  const { setLoginShow } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [client_key, setClientKey] = useState('');
  const [ready, setReady] = useState<boolean>(false);
  const [verifyCodeLogin, setVerifyCodeLogin] = useState(false);

  // PC 端新增状态
  const [loginType, setLoginType] = useState<LoginType>(
    isPc ? 'wechat' : 'verifycode'
  );
  const [qrcode, setQrcode] = useState('');
  const [wxloginqrkey, setWxloginqrkey] = useState('');
  const [reloadShow, setReloadShow] = useState(false);
  const [captchaImg, setCaptchaImg] = useState('');
  const [captchaKey, setCaptchaKey] = useState('');
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [captcha, setCaptcha] = useState('');

  // 密码登录状态
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  // 找回密码状态（仅手机号）
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetEnableCode, setResetEnableCode] = useState(true);
  const [resetCodeText, setResetCodeText] = useState('获取验证码');
  const [resetMode, setResetMode] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetCheckPassword, setResetCheckPassword] = useState('');
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [resetCheckPasswordVisible, setResetCheckPasswordVisible] =
    useState(false);
  const [resetToken, setResetToken] = useState('');
  const [captchaDialogOpen, setCaptchaDialogOpen] = useState(false);

  const qrcodeReloadTimer = useRef<any>(null);
  const checkLoginTimer = useRef<any>(null);
  const reloadShowState = useRef(false);
  const resetCountDownTimer = useRef<any>(null);
  const wxloginqrkeyRef = useRef<string>('');
  const qrcodeRef = useRef<string>('');

  const handleClose = () => {
    if (captchaDialogOpen) {
      return;
    }
    if (onClose) {
      onClose();
    } else {
      setLoginShow(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleClose,
  }));

  // 获取 AB 测试分组
  const getPlanId = () => {
    let planId = getCookie('v3plan') || 'A';
    planId = 'v3plan_' + planId;
    return planId;
  };

  // 获取百度 vid URL
  const getVidUrl = () => {
    const session = sessionStorage.getItem('bd_vid');
    if (!session) {
      return '';
    }
    let vidUrl = '';
    try {
      const bd_vid = JSON.parse(session);
      if (document.referrer.indexOf('bd_vid') !== -1) {
        return document.referrer;
      }
      const currUrl = document.referrer;
      if (currUrl.indexOf('?') === -1) {
        vidUrl = `${currUrl}?bd_vid=${bd_vid}`;
      } else {
        vidUrl = `${currUrl}&bd_vid=${bd_vid}`;
      }
    } catch (error) {
      return '';
    }
    return vidUrl;
  };

  // 获取微信二维码
  const getWechatQrcode = async () => {
    if (qrcodeReloadTimer.current) {
      clearTimeout(qrcodeReloadTimer.current);
    }
    if (checkLoginTimer.current) {
      clearTimeout(checkLoginTimer.current);
    }
    reloadShowState.current = false;
    setReloadShow(false);

    console.log('getWechatQrcode');
    try {
      const res: any = await getLoginQrcode();
      console.log('getWechatQrcode res', res);
      if (res?.code === 200 && res?.data?.url) {
        setQrcode(res.data.url);
        qrcodeRef.current = res.data.url;
        if (res.data.wxloginqrkey) {
          console.log('getWechatQrcode wxloginqrkey', res.data.wxloginqrkey);
          setWxloginqrkey(res.data.wxloginqrkey);
          wxloginqrkeyRef.current = res.data.wxloginqrkey;
        } else {
          setWxloginqrkey('');
          wxloginqrkeyRef.current = '';
        }

        checkLoginStatus();
        // 5分钟后二维码过期
        qrcodeReloadTimer.current = setTimeout(
          () => {
            reloadShowState.current = true;
            setReloadShow(true);
          },
          5 * 60 * 1000
        );
      } else {
        toast.error('获取微信二维码失败，请重试');
      }
    } catch (error: any) {
      toast.error('获取微信二维码失败，请重试');
    }
  };

  // 轮询检查是否扫码
  const checkLoginStatus = async () => {
    if (reloadShowState.current) {
      if (checkLoginTimer.current) {
        clearTimeout(checkLoginTimer.current);
      }
      return;
    }

    const loginId = wxloginqrkeyRef.current || qrcodeRef.current;
    if (!loginId) {
      return;
    }

    const data = {
      loginType: 'wechat_qrcode',
      loginid: loginId,
      // extAppId: 'maka',
    };

    try {
      console.log('checkLoginStatus data appid', appid);
      const res = (await request.post(`${API('apiv10')}/auths/sessions`, data, {
        headers: {
          appid: appid,
        },
      })) as any;

      if (res.uid && res.token) {
        runLoginCallback(res, 'wechat');
      } else {
        clearTimeout(checkLoginTimer.current);
        checkLoginTimer.current = setTimeout(() => {
          checkLoginStatus();
        }, 1000);
      }
    } catch (err) {
      console.log('获取微信登录状态错误', err);
      clearTimeout(checkLoginTimer.current);
      checkLoginTimer.current = setTimeout(() => {
        checkLoginStatus();
      }, 1000);
    }
  };

  // 登录成功回调
  const runLoginCallback = async (data: any, loginMethod: string) => {
    toast.success('登录成功！');
    if (qrcodeReloadTimer.current) {
      clearTimeout(qrcodeReloadTimer.current);
    }
    if (checkLoginTimer.current) {
      clearTimeout(checkLoginTimer.current);
    }

    if (data?.isFirst) {
      sessionStorage.setItem('is_first_login', '1');
    }

    if (data?.uid && data?.token) {
      const hours = 30 * 24 * 60 * 60 * 1000;
      let domain = '.maka.im';
      if (process.env.NODE_ENV === 'development') {
        domain = '';
      }
      setCookieExpire(`${appid}_token`, data.token, hours);
      setCookieExpire(`${appid}_uid`, data.uid, hours);
      if (isPc) {
        setCookieExpire('token', data.token, hours, domain);
        setCookieExpire('Makauid', data.uid, hours, domain);
        setCookieExpire('teamId', data.uid, hours, domain);
        setCookieExpire('isTeam', '1', hours, domain);
      }
    }

    const objectType: Record<string, string> = {
      verifycode: 'phone_login_success',
      wechat: 'wechat_login_success',
      password: 'account_login_success',
    };

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'login', {
        method: loginMethod,
      });
    }

    handleClose();
    location.reload();
  };

  // PC 端初始化微信二维码
  useEffect(() => {
    if (isPc && loginType === 'wechat') {
      getWechatQrcode();
    }
    return () => {
      if (qrcodeReloadTimer.current) {
        clearTimeout(qrcodeReloadTimer.current);
      }
      if (checkLoginTimer.current) {
        clearTimeout(checkLoginTimer.current);
      }
    };
  }, [isPc, loginType]);

  // 阿里云一键登录
  const phoneNumberServer = useRef<any>(null);

  const checkConnention = async () => {
    const netType = phoneNumberServer.current.getConnection();
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
    if (!isPc) {
      const userAgent = navigator.userAgent;
      const isDouyin = /aweme/gi.test(userAgent);
      if (!isDouyin) {
        setVerifyCodeLogin(true);
      }
      if (isDouyin && (window as any).DouyinOpenJSBridge) {
        config();
      }
    }
  }, [loaded, isPc]);

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

    const phoneReg = /^1[3456789]\d{9}$/;
    if (!phoneReg.test(phoneRef.current)) {
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
    } catch (error: any) {
      setCodeText('获取验证码');
      setEnableCode(true);

      if (error?.response?.data?.statusCode === 403) {
        if (
          captchaRef.current &&
          typeof captchaRef.current.showCaptcha === 'function'
        ) {
          setCaptchaDialogOpen(true);
          captchaRef.current.showCaptcha();
        } else {
          toast.error('图形验证码初始化失败，请稍后重试');
        }
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
        captchaId: process.env.CAPTCHA_ID,
        product: 'bind',
      },
      function (captchaObj: any) {
        captchaRef.current = captchaObj;
        captchaObj
          .onNextReady(() => {})
          .onSuccess(() => {
            setCaptchaDialogOpen(false);
            const result = captchaObj.getValidate();
            sendCode({
              lotNumber: result.lot_number,
              captchaOutput: result.captcha_output,
              passToken: result.pass_token,
              genTime: result.gen_time,
            });
            captchaObj.reset();
          })
          .onError(function () {
            setCaptchaDialogOpen(false);
          })
          .onClose(() => {
            setCaptchaDialogOpen(false);
          });
      }
    );
  };

  // 图形验证码初始化
  useEffect(() => {
    console.log('initCaptcha');
    if ((window as any).initAlicom4) {
      initCaptcha();
    }
  }, []);

  // 获取图形验证码（PC端）
  const refreshCaptcha = async () => {
    const params = {
      type: loginType === 'resetPassword' ? 'RESET_PWD' : 'LOGIN',
      w: '91',
      h: '32',
    };
    try {
      const res: any = await getCaptchaCode(params);
      if (res?.data?.captcha) {
        setCaptchaImg(res.data.captcha);
        setCaptchaKey(res.data.captchaKey);
        setCookie('CAPTCHA_LOGIN', res.data.captchaKey);
      } else {
        toast.error('刷新图片失败，请重试');
      }
    } catch (err) {
      toast.error('刷新图片失败，请重试');
    }
  };

  // 表单登录（PC端）
  const handleFormLogin = async (params: Record<string, string>) => {
    let semReferrer = {};
    const sem_referrer = localStorage.getItem('sem_referrer');
    if (sem_referrer) {
      try {
        semReferrer = JSON.parse(sem_referrer);
      } catch (error) {}
    }

    const data = {
      type: 'form',
      plan: getPlanId(),
      baidu_ocpc_url: getVidUrl(),
      captcha_key: captchaKey,
      ...params,
      ...semReferrer,
    };

    try {
      const res: any = await userLogin(data);
      delCookie('CAPTCHA_LOGIN');
      if (res?.code === 200 && res?.data?.token) {
        runLoginCallback(
          res.data,
          params.source === 'verifycode' ? 'verifycode' : 'password'
        );
      } else {
        toast.error(res?.message || '登录失败');
      }
      if (res?.code === 50004 && !captchaVisible) {
        setCaptchaVisible(true);
        refreshCaptcha();
      }
      if (res?.code === 50005) {
        refreshCaptcha();
      }
    } catch (err: any) {
      toast.error(err?.message || '登录失败请重试');
    }
  };

  // 验证码登录（移动端）
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

      const res = (await userLogin({
        type: 'verifycode',
        loginid: phone,
        verifyCode: code,
        douyinH5Clickid: clickid || '',
      })) as any;

      if (res?.code === 200 && res?.data) {
        setCookieExpire(`${appid}_token`, res.data.token);
        setCookieExpire(`${appid}_uid`, res.data.uid);
        handleClose();
        location.reload();
      } else {
        toast.error(res?.message || '登录失败');
      }
    } catch (error: any) {
      toast.error(error?.message || '登录失败');
    }
  };

  // 密码登录（PC端）
  const onPasswordLogin = async () => {
    if (password.trim().length < 6 || password.trim().length > 20) {
      toast.error('请输入6到20位密码');
      return;
    }

    handleFormLogin({
      username,
      password,
      captcha,
      from: 'direct',
      direct_url: location.href,
      source: 'password',
    });
  };

  // 验证码登录（PC端）
  const onVerifycodeLogin = async () => {
    const phoneReg = /^1[3456789]\d{9}$/;
    if (!phoneReg.test(phone)) {
      toast.error('手机号码不正确');
      return;
    }
    if (code.trim().length !== 4) {
      toast.error('验证码不正确');
      return;
    }

    handleFormLogin({
      phone,
      code,
      source: 'verifycode',
      type: 'app_third',
    });
  };

  // QQ登录
  const onQQLogin = async () => {
    const redirectUrl = location.href;
    const data = {
      source: 'qq',
      state: encodeURIComponent(redirectUrl),
    };

    try {
      const res: any = await thirdOauth(data);
      if (res?.data?.url) {
        location.href = res.data.url;
      } else {
        toast.error(res?.message || 'QQ登录失败');
      }
    } catch (error: any) {
      toast.error(error?.message || 'QQ登录失败');
    }
  };

  // 获取重置密码验证码
  const fetchResetVerifyCode = async () => {
    const phoneReg = /^1[3456789]\d{9}$/;
    if (!phoneReg.test(resetPhone)) {
      toast.error('手机号码不正确');
      return;
    }

    try {
      const res: any = await getResetVerifyCode(resetPhone);
      if (res?.code === 200 || res?.success) {
        setResetEnableCode(false);
        resetCountDown();
      } else {
        toast.error(res?.message || '获取验证码失败');
        setResetEnableCode(true);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || '获取验证码失败'
      );
      setResetEnableCode(true);
    }
  };

  // 重置密码倒计时
  const resetCountDown = () => {
    let timer: any = null;
    let count = 60;

    setResetCodeText(`${count}s`);
    timer = setInterval(function () {
      count--;
      setResetCodeText(`${count}s`);

      if (count <= 0) {
        clearInterval(timer);
        setResetCodeText('获取验证码');
        setResetEnableCode(true);
      }
    }, 1000);
    resetCountDownTimer.current = timer;
  };

  // 校验重置密码验证码
  const onCheckResetVerifyCode = async () => {
    try {
      const res: any = await checkResetVerifyCode({
        mobile: resetPhone,
        code: resetCode,
      });

      if (res?.code === 200 || res?.success) {
        setResetMode(true);
        setResetToken(res?.data?.token || res?.token || '');
      } else {
        toast.error(res?.message || '验证码错误');
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || '验证码错误'
      );
    }
  };

  // 重置密码
  const onResetPassword = async () => {
    if (resetPasswordValue.length < 6 || resetPasswordValue.length > 20) {
      toast.error('密码长度必须 6 到 20 位');
      return;
    }
    const rePassword = /^[@A-Za-z0-9!#$%^&*.\-_~()]+$/;
    if (!rePassword.test(resetPasswordValue)) {
      toast.error('密码只能大小写字母、数字、特殊符号');
      return;
    }
    if (resetPasswordValue !== resetCheckPassword) {
      toast.error('确认密码与密码必须一致');
      return;
    }

    try {
      const res: any = await resetPassword({
        mobile: resetPhone,
        token: resetToken,
        password: resetPasswordValue,
      });

      if (res?.code === 200 || res?.success) {
        toast.success('重置成功！');
        setLoginType('password');
        setResetMode(false);
        setResetPhone('');
        setResetCode('');
        setResetPasswordValue('');
        setResetCheckPassword('');
      } else {
        toast.error(res?.message || '重置失败');
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || '重置失败'
      );
    }
  };

  // 切换登录类型
  const onChangeType = (type: LoginType) => {
    setLoginType(type);
    if (qrcodeReloadTimer.current) {
      clearTimeout(qrcodeReloadTimer.current);
    }
    if (checkLoginTimer.current) {
      clearTimeout(checkLoginTimer.current);
    }
    // 切换到非微信登录时，标记二维码已失效并阻止继续轮询 session
    if (type !== 'wechat') {
      reloadShowState.current = true;
      setReloadShow(false);
    }
    if (type === 'wechat') {
      reloadShowState.current = false;
      setReloadShow(false);
      setQrcode('');
      qrcodeRef.current = '';
      wxloginqrkeyRef.current = '';
      getWechatQrcode();
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (qrcodeReloadTimer.current) {
        clearTimeout(qrcodeReloadTimer.current);
      }
      if (checkLoginTimer.current) {
        clearTimeout(checkLoginTimer.current);
      }
      if (resetCountDownTimer.current) {
        clearInterval(resetCountDownTimer.current);
      }
    };
  }, []);

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
            user_info: 0,
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
    handleClose();
    location.reload();
  };

  const checkLogin = (accessToken: string, jwtToken: string) => {
    phoneNumberServer.current?.checkLoginAvailable({
      accessToken: accessToken,
      jwtToken: jwtToken,
      success: function (res: any) {
        console.log('身份鉴权成功, 可唤起登录界面', res);
        getToken();
      },
      error: function (res: any) {
        console.log('身份鉴权失败', res);
        toast.error('身份鉴权失败, 请手动登录');
        setShowMobileAuth(false);
      },
    });
  };

  const getToken = () => {
    phoneNumberServer.current.getLoginToken({
      success: function (res: any) {
        onMobileAuthLogin('aliverify_h5', res.spToken);
      },
      error: function (res: any) {
        toast.error('获取手机号码失败, 请手动登录');
        setShowMobileAuth(false);
      },
      watch: function () {},
      authPageOption: {
        navText: '一键登录',
        subtitle: '',
        btnText: '立即登录',
        agreeSymbol: '、',
        privacyBefore: '我已阅读并同意',
        isDialog: true,
        manualClose: true,
      },
    });
  };

  const getAuth = async () => {
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

  // PC端渲染微信登录
  const renderWechatLogin = () => {
    return (
      <div className='w-full flex flex-col items-center py-6 px-0'>
        <div className='text-xs leading-[18px] text-[rgba(0,0,0,0.45)] mb-2'>
          使用微信扫码关注MAKA登录
        </div>
        <div className='w-[159px] h-[159px] border border-[#f5f5f5] rounded-md flex items-center justify-center'>
          <div className='relative w-[135px] h-[135px] flex items-center justify-center'>
            {reloadShow && (
              <div className='absolute inset-0 flex flex-col items-center justify-center z-[9] bg-white/90'>
                <Button onClick={() => getWechatQrcode()}>刷新</Button>
                <p className='absolute -bottom-6 text-xs text-[rgba(1,7,13,0.6)]'>
                  二维码已失效，请刷新
                </p>
              </div>
            )}
            {qrcode ? (
              <QRCodeCanvas
                value={qrcode}
                style={{
                  width: 135,
                  height: 135,
                }}
              />
            ) : (
              <div className='flex items-center justify-center w-[135px] h-[135px]'>
                <div className='text-sm text-gray-400'>加载中...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // PC端渲染密码登录
  const renderPasswordLogin = () => {
    return (
      <div className='w-full'>
        <div className='w-full h-10 text-sm mb-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-center px-2 pl-0'>
          <input
            className='pl-2 w-full h-full border-none outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&::placeholder]:text-[rgba(0,0,0,0.25)]'
            autoComplete='username'
            placeholder='请输入手机号或邮箱账号'
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
        {captchaVisible && (
          <div className='w-full h-10 text-sm mb-1 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-center px-2 pl-0'>
            <input
              className='pl-2 w-full h-full border-none outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&::placeholder]:text-[rgba(0,0,0,0.25)]'
              autoComplete='off'
              placeholder='请输入验证码'
              value={captcha}
              onChange={e => setCaptcha(e.target.value)}
            />
            <div
              className='ml-2 cursor-pointer h-8'
              onClick={refreshCaptcha}
              dangerouslySetInnerHTML={{ __html: captchaImg }}
            />
          </div>
        )}
        <div className='w-full h-10 text-sm mb-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-center px-2 pl-0'>
          <input
            className='pl-2 w-full h-full border-none outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&::placeholder]:text-[rgba(0,0,0,0.25)]'
            placeholder='请输入密码'
            type={passwordVisible ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <div
            className='p-1 flex cursor-pointer'
            onClick={() => setPasswordVisible(!passwordVisible)}
          >
            <Icon
              name={passwordVisible ? 'password' : 'passwordhide'}
              size={16}
            />
          </div>
        </div>
        <Button size='lg' className='w-full mt-4' onClick={onPasswordLogin}>
          立即登录
        </Button>
        <span
          className='text-xs leading-3 text-[rgba(0,0,0,0.45)] cursor-pointer mt-3 inline-block'
          onClick={() => onChangeType('resetPassword')}
        >
          忘记密码
        </span>
      </div>
    );
  };

  // PC端渲染验证码登录
  const renderVerifycodeLogin = () => {
    return (
      <div className='w-full'>
        <div className='w-full h-10 text-sm mb-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-center px-2 pl-0'>
          <input
            className='pl-2 w-full h-full border-none outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&::placeholder]:text-[rgba(0,0,0,0.25)]'
            placeholder='请输入手机号'
            type='number'
            value={phone}
            onChange={e => {
              if (e.target.value.length <= 11) {
                setPhone(e.target.value);
              }
            }}
          />
        </div>
        <div className='w-full h-10 text-sm mb-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-center px-2 pl-0'>
          <input
            className='pl-2 w-full h-full border-none outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&::placeholder]:text-[rgba(0,0,0,0.25)]'
            placeholder='请输入验证码'
            type='text'
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          <div
            className={`text-sm font-normal leading-6 whitespace-nowrap cursor-pointer ${
              !enableCode ? 'text-black cursor-auto' : 'text-[#1a87ff]'
            }`}
            onClick={() => {
              if (!enableCode) {
                return;
              }
              sendCode();
            }}
          >
            {codeText}
          </div>
        </div>
        <Button size='lg' className='w-full mt-4' onClick={onVerifycodeLogin}>
          立即登录
        </Button>
      </div>
    );
  };

  // PC端渲染找回密码
  const renderResetPassword = () => {
    const renderMobileContent = () => {
      if (resetMode) {
        return (
          <>
            <div className='w-full h-10 text-sm mb-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-center px-2 pl-0'>
              <input
                className='pl-2 w-full h-full border-none outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&::placeholder]:text-[rgba(0,0,0,0.25)]'
                placeholder='请输入密码'
                value={resetPasswordValue}
                type={resetPasswordVisible ? 'text' : 'password'}
                onChange={e => setResetPasswordValue(e.target.value)}
              />
              <div
                className='p-1 flex cursor-pointer'
                onClick={() => setResetPasswordVisible(!resetPasswordVisible)}
              >
                <Icon
                  name={resetPasswordVisible ? 'password' : 'passwordhide'}
                  size={16}
                />
              </div>
            </div>
            <div className='w-full h-10 text-sm mb-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-center px-2 pl-0'>
              <input
                className='pl-2 w-full h-full border-none outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&::placeholder]:text-[rgba(0,0,0,0.25)]'
                placeholder='请再次输入密码'
                value={resetCheckPassword}
                type={resetCheckPasswordVisible ? 'text' : 'password'}
                onChange={e => setResetCheckPassword(e.target.value)}
              />
              <div
                className='p-1 flex cursor-pointer'
                onClick={() =>
                  setResetCheckPasswordVisible(!resetCheckPasswordVisible)
                }
              >
                <Icon
                  name={resetCheckPasswordVisible ? 'password' : 'passwordhide'}
                  size={16}
                />
              </div>
            </div>
            <Button
              size='lg'
              className='w-full mt-4'
              onClick={onResetPassword}
              disabled={!resetPasswordValue || !resetCheckPassword}
            >
              确认修改
            </Button>
          </>
        );
      }
      return (
        <>
          <div className='w-full h-10 text-sm mb-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-center px-2 pl-0'>
            <input
              className='pl-2 w-full h-full border-none outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&::placeholder]:text-[rgba(0,0,0,0.25)]'
              placeholder='请输入手机号'
              type='number'
              value={resetPhone}
              onChange={e => {
                if (e.target.value.length <= 11) {
                  setResetPhone(e.target.value);
                }
              }}
            />
          </div>
          <div className='w-full h-10 text-sm mb-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-center px-2 pl-0'>
            <input
              className='pl-2 w-full h-full border-none outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&::placeholder]:text-[rgba(0,0,0,0.25)]'
              placeholder='请输入验证码'
              type='text'
              value={resetCode}
              onChange={e => setResetCode(e.target.value)}
            />
            <div
              className={`text-sm font-normal leading-6 whitespace-nowrap cursor-pointer ${
                !resetEnableCode ? 'text-black cursor-auto' : 'text-[#1a87ff]'
              }`}
              onClick={() => {
                if (!resetEnableCode) {
                  return;
                }
                fetchResetVerifyCode();
              }}
            >
              {resetCodeText}
            </div>
          </div>
          <Button
            size='lg'
            className='w-full mt-4'
            onClick={onCheckResetVerifyCode}
            disabled={!resetPhone || !resetCode}
          >
            重置密码
          </Button>
        </>
      );
    };

    return (
      <div className='w-full'>
        <div className='flex items-center my-5'>
          <div
            className='flex items-center text-[rgba(0,0,0,0.88)] text-sm leading-6 cursor-pointer'
            onClick={() => onChangeType('password')}
          >
            <Icon name='left' size={16} />
            <span className='ml-1'>返回</span>
          </div>
          <div className='ml-[58px] text-[rgba(0,0,0,0.88)] text-sm font-semibold leading-[22px]'>
            重置密码
          </div>
        </div>
        {renderMobileContent()}
      </div>
    );
  };

  // PC端渲染登录内容
  const renderPCLoginContent = () => {
    if (loginType === 'wechat') {
      return renderWechatLogin();
    } else if (loginType === 'password') {
      return renderPasswordLogin();
    } else if (loginType === 'verifycode') {
      return renderVerifycodeLogin();
    } else if (loginType === 'resetPassword') {
      return renderResetPassword();
    }
    return null;
  };

  // PC端主渲染
  if (isPc) {
    return (
      <>
        <Script src='https://img2.maka.im/cdn/webstore7/sdk/ct4.js'></Script>
        <div className='relative h-[500px] w-full rounded-md bg-[url("https://img2.maka.im/cdn/webstore7/assets/login/login_bg.png?v=1")] bg-contain bg-no-repeat [&_div]:select-none'>
          <div className='h-[105px] w-full rounded-t-md overflow-hidden'>
            <img
              src='https://img2.maka.im/cdn/webstore7/assets/login/login_head_bg.png'
              width={800}
              height={105}
              alt='MAKA'
              className='w-full h-full'
            />
          </div>

          <div
            className='absolute -bottom-[60px] left-1/2 -translate-x-1/2 w-9 h-9 flex items-center justify-center bg-white/20 rounded-full cursor-pointer z-[9]'
            onClick={handleClose}
          >
            <Icon name='close' size={20} color='#fff' />
          </div>

          <div className='py-[51px] px-12 flex flex-col h-[395px] rounded-b-md'>
            <div className='flex items-center mb-6'>
              <img
                src='https://img2.maka.im/cdn/webstore7/assets/login/login_intro_1.png'
                width={72}
                height={72}
                alt=''
                className='mr-4'
              />
              <div>
                <p className='text-lg font-semibold leading-[26px] text-[rgba(0,0,0,0.88)]'>
                  海量模板 做出好设计
                </p>
                <p className='text-sm leading-[22px] text-[rgba(0,0,0,0.6)]'>
                  100万+模板素材 三分钟完成好设计
                </p>
              </div>
            </div>
            <div className='flex items-center mb-6'>
              <img
                src='https://img2.maka.im/cdn/webstore7/assets/login/login_intro_2.png'
                width={72}
                height={72}
                alt=''
                className='mr-4'
              />
              <div>
                <p className='text-lg font-semibold leading-[26px] text-[rgba(0,0,0,0.88)]'>
                  营销活动 刷屏获客
                </p>
                <p className='text-sm leading-[22px] text-[rgba(0,0,0,0.6)]'>
                  表单、活动、收款、推广等多种营销玩法
                </p>
              </div>
            </div>
            <div className='flex items-center mb-6'>
              <img
                src='https://img2.maka.im/cdn/webstore7/assets/login/login_intro_3.png'
                width={72}
                height={72}
                alt=''
                className='mr-4'
              />
              <div>
                <p className='text-lg font-semibold leading-[26px] text-[rgba(0,0,0,0.88)]'>
                  正版授权 版权无忧
                </p>
                <p className='text-sm leading-[22px] text-[rgba(0,0,0,0.6)]'>
                  正版字体、图片、素材会员免费用
                </p>
              </div>
            </div>
          </div>
          <div className='absolute top-12 right-12 w-[316px] h-[404px]'>
            <div className='relative w-full h-full rounded bg-white shadow-[0px_0px_50px_0px_rgba(0,0,0,0.03)] flex-1 py-5 px-6 flex flex-col items-center'>
              <div
                className='absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer hover:bg-gray-100 transition-colors z-10'
                onClick={handleClose}
              >
                <X size={18} className='text-gray-600' />
              </div>
              <img
                src='https://res.maka.im/assets/store7/logo.png?v4'
                height={29}
                width={73}
                alt='MAKA官网'
                className='mb-4'
              />
              {loginType !== 'resetPassword' && (
                <div className='flex bg-[#f5f5f5] p-0.5 rounded mb-2'>
                  <div
                    className={`flex items-center justify-center w-[130px] h-8 rounded text-sm leading-8 text-center cursor-pointer ${
                      loginType === 'wechat'
                        ? 'font-semibold bg-white pointer-events-none'
                        : 'text-[rgba(0,0,0,0.88)]'
                    }`}
                    onClick={() => onChangeType('wechat')}
                  >
                    <Icon
                      name='wechat'
                      size={22}
                      color='#07C160'
                      className='mr-1'
                    />
                    微信登录
                  </div>
                  <div
                    className={`flex items-center justify-center w-[130px] h-8 rounded text-sm leading-8 text-center cursor-pointer ${
                      loginType !== 'wechat'
                        ? 'font-semibold bg-white pointer-events-none'
                        : 'text-[rgba(0,0,0,0.88)]'
                    }`}
                    onClick={() => onChangeType('password')}
                  >
                    账号登录
                  </div>
                </div>
              )}

              {renderPCLoginContent()}

              {(loginType === 'password' || loginType === 'verifycode') && (
                <div className='absolute bottom-[60px] flex items-center justify-center w-full mt-3'>
                  <div
                    className='flex items-center justify-center w-10 h-10 rounded-full border border-[#f5f5f5] cursor-pointer hover:bg-[#f5f5f5] mr-14'
                    onClick={onQQLogin}
                  >
                    <img
                      src='https://res.maka.im/assets/jiantie/loginqq.svg'
                      className='w-12 h-12'
                    />
                  </div>
                  {loginType === 'password' && (
                    <div
                      className='flex items-center justify-center w-10 h-10 rounded-full border border-[#f5f5f5] cursor-pointer hover:bg-[#f5f5f5]'
                      onClick={() => onChangeType('verifycode')}
                    >
                      <img
                        src='https://res.maka.im/assets/jiantie/phone.svg'
                        className='w-5 h-5'
                      />
                    </div>
                  )}
                  {loginType === 'verifycode' && (
                    <div
                      className='flex items-center justify-center w-10 h-10 rounded-full border border-[#f5f5f5] cursor-pointer hover:bg-[#f5f5f5]'
                      onClick={() => onChangeType('password')}
                    >
                      <Mail size={20} />
                    </div>
                  )}
                </div>
              )}
              <div className='absolute bottom-[11px] left-0 right-0 text-center text-xs leading-5 text-[rgba(0,0,0,0.45)]'>
                <p>新用户首次登录会直接注册MAKA账号</p>
                <p>
                  登录即同意
                  <a
                    href='https://maka.im/app/member-policy.html'
                    target='_blank'
                    rel='noreferrer'
                    className='text-[rgba(0,0,0,0.88)] px-1'
                  >
                    用户协议
                  </a>
                  和
                  <a
                    href='https://maka.im/datastory/privacy/privacy.html'
                    target='_blank'
                    rel='noreferrer'
                    className='text-[rgba(0,0,0,0.88)] px-1'
                  >
                    隐私协议
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 移动端主渲染
};

const MAKALogin = forwardRef<MAKALoginRef, MAKALoginProps>(MAKALoginInner);

export default MAKALogin;

export const MakaLoginModal = observer(() => {
  const { loginShow, setLoginShow } = useStore();
  const loginRef = useRef<MAKALoginRef>(null);
  return (
    <ResponsiveDialog
      isOpen={loginShow}
      onOpenChange={setLoginShow}
      contentProps={{
        className: '!max-w-[800px]',
        onPointerDownOutside: (e: any) => {
          // loginRef.current?.handleClose();
          e.preventDefault();
        },
      }}
    >
      <MAKALogin
        ref={loginRef}
        onClose={() => setLoginShow(false)}
        scene='pc'
      />
    </ResponsiveDialog>
  );
});
