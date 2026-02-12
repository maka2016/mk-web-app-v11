import {
  API,
  checkPayOrder,
  checkWechatpayOrder,
  getOrderInfo,
  getShortUrl,
  getToken,
  getUid,
  getVipPackagesV4,
  wechatPayEntrustWeb,
} from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import { getCookie, queryToObj } from '@/utils';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ResponsiveTooltip } from '@workspace/ui/components/responsive-tooltip';
import { cn } from '@workspace/ui/lib/utils';
import cls from 'classnames';
import dayjs from 'dayjs';
import { ArrowRight, CheckCircle, X } from 'lucide-react';
import { observer } from 'mobx-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import ClientMessage from './clientMessage';
import styles from './index.module.scss';
interface Package {
  name: string;
  canContract: boolean;
  canTrial: boolean;
  quantity: number;
  corner_text: string;
  total: number;
  day: number;
  tips_text: string;
  original_total: string;
  customer_vip_id: number;
  customer_vip_package_id: number;
  member_quantity: number;
  totalPrice: number;
  originalPrice: number;
}

interface Vip {
  alias: string;
  name: string;
  desc: string;
  privilege: string;
  customer_vip_id: number;
  packages: Package[];
}

interface VipData {
  [key: string]: {
    desc: string;
    name: string;
    packages: Vip[];
  };
}

const vipStyle: Record<string, any> = {
  full_site_vips: {
    backgroundColor: '#FFF9EE',
    color: '#D48806',
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_company.png',
    desc: '适合个人制作手机海报、文章长图及印刷物料',
  },
  post_vips: {
    backgroundColor: '#F8F9FC',
    color: '#1A87FF',
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
    desc: '适用于大型企业多人协作',
  },
};

const vipIntro: Record<
  string,
  {
    list?: string[];
    icon: string;
    desc?: string | any;
    backgroundColor?: string;
    color?: string;
    highlight?: number[];
    vipDesc?: string;
  }
> = {
  poster_economy: {
    list: [
      '个人商用授权，不可用于企业宣传',
      '无限次去水印高清作品下载',
      '海量平面设计素材免费使用',
      '作品可创作数量 5个/天',
      '单个平面作品页数上限 5页',
    ],
    backgroundColor: '#F8F9FC',
    color: '#1A87FF',
    highlight: [0, 1],
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
    desc: '个人商用授权',
    vipDesc: '适合个人制作手机海报、文章长图及印刷物料',
  },
  poster_premium: {
    list: [
      '企业商用授权',
      '无限次去水印高清作品下载',
      '海量平面设计素材免费使用',
      '作品可创作数量 30个/天',
      '单个平面作品页数上限 10页',
    ],
    backgroundColor: '#F8F9FC',
    color: '#1A87FF',
    highlight: [0, 1],
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
    desc: '企业商用授权',
    vipDesc: '适合企业制作手机海报、文章长图及印刷物料',
  },
  h5_promotion: {
    list: [
      '企业商用授权',
      '会员期内H5分享链接长期有效',
      '海量精美H5模板免费使用',
      'H5访问数据统计',
      '免除H5尾页广告',
      '作品可创作个数 30个/天',
      '单个H5作品页数上限 30页',
      '单个作品传播次数上限 100,000次',
    ],
    backgroundColor: '#FFF8F3',
    color: '#D48806',
    highlight: [0, 1],
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
    desc: 'H5链接长期有效',
    vipDesc: '适合企业制作翻页H5/长页H5等内容并进行传播',
  },
  tiantianhuodong: {
    list: [
      '企业商用授权',
      '含拼团、收款、表单等多种营销互动组件',
      '会员期内H5分享链接长期有效',
      '营销活动数据可视化分析',
      '海量精美H5模板免费使用',
      '免除H5尾页广告',
      '作品可创作个数 30个/天',
      '单个H5作品页数上限  30页',
      '单个作品传播次数上限 100,000次',
    ],
    backgroundColor: '#FFF8F3',
    color: '#D48806',
    highlight: [0, 1, 2],
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
    desc: '进阶H5营销玩法',
    vipDesc: '适合企业制作翻页H5/长页H5和营销活动推广',
  },
  // full_site: {
  //   list: [
  //     "个体户/小微企业商用授权",
  //     "无限次去水印高清作品下载",
  //     "作品分享链接长期有效",
  //     "营销活动数据可视化分析",
  //     "免除尾页广告",
  //     "作品可创作个数 30个/天",
  //     "单个海报页数上限 10页",
  //     "单个H5作品页数上限 30页",
  //     "单个作品可传播次数上限 100,000 次",
  //   ],
  //   backgroundColor: '#FFF8F3',
  //   color: '#D48806',
  //   highlight: [0, 1, 2],
  //   icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_busi.png',
  //   desc: <div>企业商用授权，全平台作品可任意导出/分享链接长期有效，单个作品传播次数上限 <span>100,000</span> 次</div>
  // },
  enterprise_flagship: {
    list: [
      '企业商用授权',
      'H5去除MAKA标识',
      '会员期内H5分享链接长期有效',
      '无限次去水印高清作品下载',
      '畅享全站设计资源',
      '支持多人共享协作',
      '作品可创作个数 不限制',
      '单个平面作品页数上限  10页',
      '单个H5作品页数上限  50页',
      '单个作品可传播次数上限 1,000,000次',
    ],
    backgroundColor: '#FFF9EE',
    color: '#D48806',
    highlight: [0, 1, 2],
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_company.png',
    desc: (
      <div>
        企业商用授权，支持多人账号协作，单个作品传播次数上限{' '}
        <span>1,000,000</span> 次
      </div>
    ),
    vipDesc: '适合有多种设计与营销活动需求的中大企业使用',
  },
  senior: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_senior.png',
  },
  super: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_super.png',
  },
  busi: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_busi.png',
  },
  company: {
    icon: 'https://img2.maka.im/cdn/webstore7/assets/vip/icon_company.png',
  },
};

interface Props {
  onClose: () => void;
}

const timeClose = 5;

const COMPANY_INDEX = 999;

// 最新版会员弹窗
const VipModalV1 = (props: Props) => {
  const { onClose } = props;
  const { isVip, userProfile, customerVips, vipTrackData = {} } = useStore();
  let { vipType } = useStore();
  if (vipType === 'super' || vipType === 'h5_promotion') {
    vipType = 'full_site_senior';
  } else if (vipType === 'vip_senior') {
    vipType = 'poster_premium';
  }

  const [activeTab, setActiveTab] = useState('full_site_vips');
  const [activeType, setActiveType] = useState('full_site_senior');
  const [activeTypeIndex, setActiveTypeIndex] = useState(0);
  const [vipPackages, setVipPackages] = useState<VipData>();
  const [selected, setSelected] = useState(0);
  const [qrcode, setQrcode] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);
  const [paySuccessTitle, setPaySuccessTitle] = useState('支付完成');
  const [paySuccessText, setPaySuccessText] = useState('');
  const [ready, setReady] = useState(false);
  const [activeCompanyType, setActiveCompanyType] = useState(0);
  const [vipTabs, setVipTabs] = useState([
    {
      alias: 'post_vips',
      className: 'senior',
      name: '平面会员',
      desc: '海报去水印',
      packages: ['poster_economy', 'poster_premium'],
    },

    {
      alias: 'full_site_vips',
      className: 'company',
      name: '全站会员',
      desc: '海报去水印+H5链接有效',
      packages: ['full_site_senior', 'enterprise_flagship', 'h5_promotion'],
    },
  ]);
  const [time, setTime] = useState({
    hour: '00',
    min: '00',
    sec: '00',
  });

  const loopTimer = useRef<any>(null);
  const ticket = useRef('');
  const orderId = useRef('');
  const contract_code = useRef('');
  const serial = useRef('');
  const countdownTimer = useRef<any>(null);

  const sendMessageToWindows = new ClientMessage().TOCLIENT;

  const inEditor = () => {
    return vipTrackData && vipTrackData.page_type === 'editor';
  };

  const fetchVipPackages = async () => {
    const res = (await getVipPackagesV4(198)) as any;
    if (res.resultCode === 0 && res.data) {
      setVipPackages(res.data);
      if (vipType) {
        const tabs: any[] = [];
        Object.keys(res.data).forEach((key, i) => {
          tabs.push({
            alias: key,
            className: i ? 'company' : 'senior',
            name: res.data[key].name,
            desc: res.data[key].desc,
          });
          const index = res.data[key].packages.findIndex(
            (item: any) => item.alias === vipType
          );
          if (index > -1) {
            setActiveTab(key);
            setActiveTypeIndex(index);
            setActiveType(res.data[key].packages[index].alias);
          } else {
            const { parent_page_type } = queryToObj();
            if (parent_page_type === 'site_promotional_page') {
              setActiveTab('full_site_vips');
              setActiveType(res.data['full_site_vips'].packages[0].alias);
              setActiveTypeIndex(0);
            }
          }
        });
        setVipTabs(tabs);
      }
    }
  };

  const initData = async () => {
    if (vipType) {
      const index = vipTabs.findIndex(item => item.packages?.includes(vipType));
      if (index > -1) {
        setActiveTab(vipTabs[index].alias);
        setActiveType(vipType);
        setActiveTypeIndex(index);
      } else {
        const { parent_page_type } = queryToObj();
        if (parent_page_type === 'site_promotional_page') {
          setActiveTab('full_site_vips');
          setActiveType('full_site_senior');
          setActiveTypeIndex(0);
        }
      }
    }

    await Promise.all([fetchVipPackages()]);
    setReady(true);
  };

  const getCurrentPackage = () => {
    return vipPackages?.[activeTab]?.packages?.[activeTypeIndex]?.packages[
      selected
    ];
  };

  useEffect(() => {
    initData();
    const query = queryToObj();
    mkWebStoreLogger.track_pageview({
      page_type: 'vip_page_v2024q2',
      page_id: 'vip_page_v2024q2',
      parent_page_type: query.parent_page_type || '',
      page_inst_id: decodeURIComponent(query.page_inst_id || ''),
      ref_page_type: vipTrackData.page_type || '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
    });
    return () => {
      clearTimeout(loopTimer.current);
      clearInterval(countdownTimer.current);
    };
  }, []);

  const formatVipPackages = () => {
    if (!vipPackages) {
      return;
    }

    Object.keys(vipPackages).forEach(key => {
      vipPackages[key].packages.forEach(vip => {
        vip.packages.forEach((currentPackage: Package) => {
          if (
            !currentPackage ||
            currentPackage.canTrial ||
            currentPackage.canContract
          ) {
            return;
          }

          currentPackage.totalPrice = currentPackage.total;
        });
      });
    });
  };

  // 获取二维码地址
  const getQrCodeDataUrl = async (url: string) => {
    let src = '';
    const res = (await getShortUrl(url)) as any;
    if (res.resultCode === 0 && JSON.stringify(res.data) !== '{}') {
      src = res.data.short_url;
    }
    return src;
  };

  // 生成订阅购买二维码
  const createSubscribeOrder = async () => {
    const currentPackage = getCurrentPackage();

    if (!currentPackage) {
      return;
    }
    setQrcode('');
    const param = {
      customer_vip_id: currentPackage.customer_vip_id,
      customer_vip_package_id: currentPackage?.customer_vip_package_id,
      platform: 'maka_gzh',
      is_trial: currentPackage.canTrial ? 1 : 0,
      // I0ga21Ce 表示0元试用三天
      trial_plan: '',
      is_subscribe: 1,
      from_where: '',
      position: '',
      order_entry: null,
      order_landing: encodeURIComponent(window.location.href),
      abTest_id: '',
      cookies_id: getCookie('cookiesId'),
      device: (window as any).CefSharp ? 'windows' : 'PC',
      bundle_id: null,
      market: null,
      store_version: '3.0',
      // work_id: this.getParam("works_id", this.iframeOptions.url),
    };

    const uid = getUid();
    const res = await wechatPayEntrustWeb(uid, param);
    if (res?.data) {
      contract_code.current = res.data.contract_code;
      serial.current = res.data.vip_sub.serial;
      setTimeout(() => {
        setQrcode(res.data.url);
      }, 300);
    }
  };

  // 生成购买二维码
  const createBuyOrder = async () => {
    const currentPackage = getCurrentPackage();
    const package_id = Number(currentPackage?.customer_vip_package_id);
    const pay_channel = (window as any).CefSharp ? 'windows' : 'PC';
    const uid = getUid();
    const token = getToken();
    const query = queryToObj();
    // 落地页标识符，用于abtest结果统计，为空则不会统计
    const page = null;
    // 用于记录abtest组标识
    const plan = null;
    const vip_id = Number(currentPackage?.customer_vip_id);
    ticket.current = uid + Date.now();
    const order_entry = 'vip_template_data';
    const cookiesid = getCookie('cookiesId');
    const forward_page_name = query.parent_page_type || '';
    const editor_version = vipTrackData.editor_version || '';
    const forward_module = vipTrackData.forward_module || '';
    const editor_ab_group_stm = vipTrackData.editor_ab_group_stm || '';
    const from_where = vipTrackData.from || localStorage.getItem('orderCreate');
    const position = vipTrackData.position;
    // const abTest_id = `webAB_${window.webAB}`

    const works_id = vipTrackData.works_id || '';
    const param: Record<string, any> = {
      vip_id,
      pay_channel,
      package_id,
      uid,
      token,
      ticket: ticket.current,
      plan,
      page,
      order_entry,
      cookiesid,
      from_where,
      position,
      // abTest_id,
      forward_page_name,
      editor_version,
      forward_module,
      editor_ab_group_stm,
      works_id,
      ref_page_type: vipTrackData.page_type || '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
    };

    const arr = [];
    for (const key in param) {
      arr.push(key + '=' + param[key]);
    }

    const url = `${API('根域名')}/qrcodepay/?${arr.join('&')}`;
    const res = await getQrCodeDataUrl(url);
    setTimeout(() => setQrcode(res), 300);
  };

  // 查询具体的订单号支付状态
  const checkOrderPayStatus = async () => {
    clearTimeout(loopTimer.current);
    const uid = getUid();
    const vip = getCurrentPackage();
    const vip_id = Number(vip?.customer_vip_id);
    const result = (await getOrderInfo(uid, orderId.current)) as any;

    const buyResult = result.code === 200 ? Number(result.data.status) : null;
    if (buyResult === 1) {
      if (window.parent !== window) {
        // 支付成功
        window.parent.postMessage(
          JSON.stringify({
            type: 'vipPay',
            status: 1,
            vipInfo: vip_id,
          }),
          '*'
        );
        sendMessageToWindows({
          type: 'vipBuy',
          data: {
            success: true,
            message: '购买成功',
            result: vip_id,
          },
        });
        return;
      }
      setPaySuccess(true);
      setTimeout(() => location.reload(), timeClose * 1000);
    } else if (buyResult === -1) {
      // 支付取消
      window.parent.postMessage(
        JSON.stringify({
          type: 'vipPay',
          status: -1,
          vipInfo: vip_id,
        }),
        '*'
      );
      sendMessageToWindows({
        type: 'message',
        data: {
          value: '支付取消',
        },
      });
    } else if (buyResult === 0) {
      // 尚未支付，继续轮询
      loopTimer.current = setTimeout(checkOrderPayStatus, 2000);
    } else {
      // 异常
      window.parent.postMessage(
        JSON.stringify({
          type: 'info',
          message: '支付结果检测异常pay-qrcode',
        }),
        '*'
      );
      sendMessageToWindows({
        type: 'message',
        data: {
          value: '支付结果监测异常-qrcode',
        },
      });
    }
  };

  // 查询当前是否有订单生成
  const checkHasOrder = async () => {
    // 非自动续费，正常支付
    const res = (await checkPayOrder(ticket.current)) as any;
    if (res.resultCode === 0 && res.data && res.data.order_id) {
      // 订单已生成
      orderId.current = res.data.order_id;
    }
  };

  // 检查订阅包订单
  const checkSubscriOrder = async () => {
    const uid = getUid();
    const res = (await checkWechatpayOrder(uid, {
      contract_code: contract_code.current,
      serial: serial.current,
    })) as any;
    if (res.success) {
      const currentPackage = getCurrentPackage();
      setPaySuccess(true);
      setPaySuccessTitle(
        currentPackage?.canTrial ? '签约试用成功' : '订阅成功'
      );
      setPaySuccessText(
        `${currentPackage?.canTrial ? '首次' : '下次'}扣费预计在${res.data.renew_date}`
      );
      setTimeout(() => location.reload(), timeClose * 1000);
    }
  };

  // 轮询查询订单
  const loopCheckBuy = async () => {
    clearTimeout(loopTimer.current);
    const currentPackage = getCurrentPackage();

    if (currentPackage?.canContract || currentPackage?.canTrial) {
      await checkSubscriOrder();
      loopTimer.current = setTimeout(loopCheckBuy, 5000);
    } else {
      // 先查询是否有订单生成
      await checkHasOrder();
      loopTimer.current = setTimeout(
        orderId.current ? checkOrderPayStatus : loopCheckBuy,
        5000
      );
    }
  };

  // 创建订单
  const createOrder = async () => {
    clearTimeout(loopTimer.current);
    loopTimer.current = null;
    ticket.current = '';
    orderId.current = '';
    const currentPackage = getCurrentPackage();

    if (!currentPackage) {
      return;
    }

    // 是否订阅
    if (currentPackage.canContract || currentPackage.canTrial) {
      await createSubscribeOrder();
    } else {
      await createBuyOrder();
    }
    // 轮询订单状态
    loopCheckBuy();
  };

  // 切换价格包
  const onChangePackage = (index: number) => {
    setSelected(index);
  };

  // 切换会员类型
  const onChangeVipType = (type: string, index: number) => {
    setActiveType(type);
    setActiveTypeIndex(index);
    setSelected(0);
    const query = queryToObj();

    const extra = {
      object_type: 'top_vip_btn',
      object_id: type,
      page_type: 'vip_page_v2024q2',
      parent_page_type: query.parent_page_type || '',
      page_inst_id: decodeURIComponent(query.page_inst_id || ''),
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
    };
    mkWebStoreLogger.track_click(extra);
  };

  // 切换tab
  const onChangeTab = (type: string, index: number) => {
    setActiveTab(type);
    const vipType = vipPackages?.[type].packages[0].alias;
    setActiveType(vipType || 'poster_premium');
    setActiveTypeIndex(0);

    const query = queryToObj();
    let object_type = 'vip_tab_poster_btn';
    if (index === 0) {
      object_type = 'vip_tab_poster_btn';
    } else if (index === 1) {
      object_type = 'vip_tab_full_site_btn';
    }
    const extra = {
      object_type: object_type,
      object_id: object_type,
      page_type: 'vip_page_v2024q2',
      parent_page_type: query.parent_page_type || '',
      page_inst_id: decodeURIComponent(query.page_inst_id || ''),
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
    };
    mkWebStoreLogger.track_click(extra);
  };

  // 会员期限
  const vipQuantity = () => {
    const currentPackage = getCurrentPackage();
    if (!currentPackage) {
      return;
    }
    const vip = customerVips.find(item => item.alias === activeType);
    let day = 0;
    // 如果大于12个月
    if (currentPackage.quantity >= 12) {
      day = Number(currentPackage.quantity / 12) * 365;
    } else {
      day = Number(currentPackage.quantity) * 30;
    }
    const num = day + Number(currentPackage.day);
    return dayjs(vip ? vip.end_time : new Date().getTime())
      .add(num, 'day')
      .format('YYYY年MM月DD日');
  };

  // 实付金额
  const realTotal = () => {
    const currentPackage = getCurrentPackage();
    const total = currentPackage?.total || 0;

    return total / 100;
  };

  const getAvatarUrl = (url: string) => {
    if (url?.indexOf('//') === 0) {
      return `https:${url}`;
    }
    return (
      url ||
      'https://res.maka.im/assets/store4/workspace/team_default_thumb%402x.png'
    );
  };

  const packageList = () => {
    return vipPackages?.[activeTab].packages?.[activeTypeIndex]?.packages || [];
  };

  const topClassName = () => {
    return (
      vipTabs.find(item => item.alias === activeTab)?.className || 'senior'
    );
  };

  const getPrivilegeList = () => {
    if (activeTypeIndex === COMPANY_INDEX) {
      return vipPackages
        ? JSON.parse(
          vipPackages['full_site_vips']?.packages[
            vipPackages['full_site_vips'].packages.length - 1
          ].privilege
        )
        : [];
    }
    try {
      const list = vipPackages
        ? JSON.parse(vipPackages[activeTab].packages[activeTypeIndex].privilege)
        : [];
      return list;
    } catch (error) {
      return [];
    }
  };

  const countDown = () => {
    if (countdownTimer.current) {
      return;
    }
    const endOfDayTimestamp = new Date(
      new Date().setHours(23, 59, 59, 999)
    ).getTime();
    let duration = Math.floor(endOfDayTimestamp / 1000 - Date.now() / 1000);

    if (duration <= 0) {
      return;
    }
    countdownTimer.current = setInterval(() => {
      duration--;
      if (duration <= 0) {
        clearInterval(countdownTimer.current);
        setTime({
          hour: '00',
          min: '00',
          sec: '00',
        });
        return;
      }
      const newValue = {
        hour: Math.floor(duration / 60 / 60),
        min: Math.floor((duration / 60) % 60),
        sec: duration % 60,
      };
      setTime({
        hour: newValue.hour < 10 ? `0${newValue.hour}` : `${newValue.hour}`,
        min: newValue.min < 10 ? `0${newValue.min}` : `${newValue.min}`,
        sec: newValue.sec < 10 ? `0${newValue.sec}` : `${newValue.sec}`,
      });
    }, 1000);
  };

  // 优惠金额
  const getDiscountAmount = () => {
    const currentPackage = getCurrentPackage();
    if (!currentPackage) {
      return 0;
    }

    if (currentPackage.original_total) {
      return (+currentPackage.original_total - +currentPackage.total) / 100;
    }

    return 0;
  };

  useEffect(() => {
    if (ready) {
      formatVipPackages();
      createOrder();
      countDown();
    }
  }, [ready]);

  useEffect(() => {
    if (ready && vipPackages) {
      clearTimeout(loopTimer.current);
      loopTimer.current = null;
      if (activeType === 'enterprise_flagship' && activeCompanyType === 2) {
        setQrcode('');
      } else {
        setQrcode('');
        createOrder();
      }
    }
  }, [activeType, selected]);

  return (
    <div className={cls([styles.vipModal, styles[topClassName()]])}>
      <div className={styles.close} onClick={() => onClose()}>
        <X size={16} color='#fff' />
      </div>
      <div className={styles.head}>
        <div className={styles.user}>
          <div className='flex'>
            <div className={styles.avatar}>
              <img src={getAvatarUrl(userProfile?.avatar)} alt='' />
            </div>
            <div>
              <div className='flex'>
                <div className={styles.name}>{userProfile?.username}</div>
                <div className={styles.uid}>ID：{userProfile?.uid}</div>
              </div>

              {!isVip && <div className={styles.vipLevel}>普通用户</div>}

              {isVip && (
                <div className={styles.vipLevel}>
                  {customerVips.map((item, index) => (
                    <div key={index} className='mr-2'>
                      {item.role.name}{' '}
                      {dayjs(item.validTo).format('YYYY.MM.DD') + '到期'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.other}>
            <a
              href={`${API('根域名')}/mk-web-store-v7/makapc/pricing?scrollTo=QA`}
              target='_blank'
              rel='noreferrer'
            >
              常见问题
            </a>
            <span className={styles.split}></span>
            <ResponsiveTooltip
              contentProps={{
                className: cn(
                  'light p-0 flex flex-col items-center justify-center',
                  styles.kefuQrcodeContent
                ),
              }}
              trigger='click'
              defaultOpen={false}
              content={
                <div className={styles.kefuQrcode}>
                  <div className={styles.title}>联系我的客服</div>
                  <div className={styles.tips}>微信扫一扫，添加MAKA客服</div>
                  <img
                    src='https://img2.maka.im/pic/GHC2LL1C07.png'
                    width={174}
                    height={174}
                    alt=''
                  />
                </div>
              }
            >
              <span>联系客服</span>
            </ResponsiveTooltip>
          </div>
        </div>
        {
          <div className={styles.tabs}>
            {vipTabs.map((item, index) => {
              if (inEditor() && activeTab !== item.alias) {
                return null;
              }
              return (
                <div
                  style={
                    inEditor()
                      ? {
                        borderRadius: '12px 12px 0 0',
                      }
                      : {}
                  }
                  key={index}
                  className={cls(
                    styles.tabItem,
                    activeTab === item.alias && styles.active
                  )}
                  onClick={() => onChangeTab(item.alias, index)}
                >
                  <span>{item.name}</span>
                  <span className={styles.desc}>{item.desc}</span>
                </div>
              );
            })}
          </div>
        }
      </div>

      <div className={styles.main}>
        <div
          className={styles.aside}
          style={{
            backgroundColor: vipStyle[activeTab].backgroundColor,
          }}
        >
          <p className={styles.tit}>
            <img src={vipStyle[activeTab].icon} className={styles.icon} />
            {vipPackages?.[activeTab].name}特权
          </p>
          <p className={styles.desc}></p>
          <div className={styles.vipIntro}>
            {getPrivilegeList().map((item: any, index: number) => (
              <div
                key={index}
                className={styles.introItem}
                style={
                  item.style?.includes('bold')
                    ? { color: vipStyle[activeTab].color, fontWeight: 600 }
                    : {}
                }
              >
                {/* <Icon
                  name='quanyidian'
                  color={vipStyle[activeTab].color}
                  size={16}
                /> */}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <div
            className={styles.vipAllInfo}
            onClick={() => {
              window.open(`${API('根域名')}/mk-web-store-v7/makapc/pricing`);
            }}
          >
            会员权益对比
            {/* <Icon name='right' size={16} /> */}
            <ArrowRight size={16} />
          </div>
        </div>

        <div className={styles.vipMain}>
          {paySuccess && (
            <div className={styles.paySuccess}>
              {/* <Icon name='danxuan-yixuan' size={36} color='#07C160' /> */}
              <CheckCircle size={36} color='#07C160' />
              <div className={styles.paySuccessTitle}>{paySuccessTitle}</div>
              {paySuccessText && (
                <div className={styles.paySuccessText}>{paySuccessText}</div>
              )}
              <div className={styles.paySuccessText}>
                {timeClose}秒后关闭窗口...
              </div>
            </div>
          )}
          <div className={styles.packageTitle}>1、选择版权授权类型</div>
          <div className={styles.vipTypes}>
            {vipPackages?.[activeTab].packages.map((item, index) => {
              return (
                <div
                  className={cls([
                    styles.typeItem,
                    index === activeTypeIndex && styles.active,
                  ])}
                  key={index}
                  onClick={() => onChangeVipType(item.alias, index)}
                >
                  <div>{item.name}</div>
                  <div className={styles.desc}>{item.desc}</div>
                </div>
              );
            })}
            {activeTab === 'full_site_vips' && (
              <div
                onClick={() => onChangeVipType('custom', COMPANY_INDEX)}
                className={cls([
                  styles.typeItem,
                  activeTypeIndex === COMPANY_INDEX && styles.active,
                ])}
              >
                <div>企业定制服务</div>
                <div className={styles.desc}>定制席位</div>
              </div>
            )}
          </div>
          {activeTypeIndex !== COMPANY_INDEX ? (
            <>
              <div className={cls([styles.packageTitle, 'mt-4'])}>
                2、选择购买时长
              </div>
              <div className={styles.packages}>
                {packageList().map((item, index) => (
                  <div
                    key={index}
                    className={cls([
                      styles.packageItem,
                      index === selected && styles.active,
                    ])}
                    onClick={() => onChangePackage(index)}
                  >
                    {item.corner_text && (
                      <div className={styles.corner}>{item.corner_text}</div>
                    )}
                    <div className={styles.name}>{item.name}</div>
                    <div className={styles.price}>
                      ¥<span>{item.total / 100}</span>
                    </div>
                    {item.original_total && +item.original_total > 0 && (
                      <div className={styles.originalPrice}>
                        原价 ¥{+item.original_total / 100}
                      </div>
                    )}
                    <div className={styles.tip}>{item.tips_text}</div>
                  </div>
                ))}
              </div>
              {getDiscountAmount() > 0 && (
                <div className={styles.coupon}>
                  <div className={styles.tag}>优惠券</div>
                  <span className={styles.name}>限时优惠</span>
                  <span className={styles.countdown}>
                    {time.hour} 时 {time.min} 分 {time.sec} 秒 后失效
                  </span>
                </div>
              )}
              <div className={styles.payWrap}>
                <div className={styles.qrcode}>
                  {!qrcode && (
                    <div className={styles.qrcodeLoading}>
                      <Loading />
                    </div>
                  )}
                  <QRCodeCanvas
                    value={qrcode}
                    style={{
                      width: 110,
                      height: 110,
                    }}
                  />
                </div>

                <div className={styles.payInfo}>
                  <div className={styles.payTotal}>
                    实付金额：
                    <span className={styles.price}>¥{realTotal()}</span>
                    {getDiscountAmount() > 0 && (
                      <div className={styles.discount}>
                        已优惠{getDiscountAmount()}元
                      </div>
                    )}
                  </div>
                  <div className='mb-7'>
                    开通后有效期至：
                    <span className={styles.date}>{vipQuantity()}</span>
                  </div>
                  <div className='flex my-1 items-center'>
                    <img
                      src='https://res.maka.im/cdn/webstore7/assets/icon_wxpay.png'
                      alt=''
                      className={styles.payType}
                    />
                    <img
                      src='https://res.maka.im/cdn/webstore7/assets/icon_ali.png'
                      alt=''
                      className={styles.payType}
                    />
                    <span>微信/支付宝扫码支付</span>
                    <span>微信扫码支付</span>
                    <span className='mx-1'>支付成功可</span>
                    <ResponsiveTooltip
                      contentProps={{
                        className: cls(['light', styles.invoice]),
                      }}
                      trigger='click'
                      defaultOpen={false}
                      content={
                        <div className={styles.invoice}>
                          <div className={styles.title}>
                            <span className={styles.tit}>开具发票规则</span>
                            <a
                              className={styles.desc}
                              target='_blank'
                              rel='noreferrer'
                              href={`${API('根域名')}/userinfo/myinvoice/invoiceinfolist`}
                            >
                              <span>查看开票流程</span>
                              <ArrowRight size={14} />
                            </a>
                          </div>
                          <img src='https://img2.maka.im/cdn/webstore7/assets/vip/img_invoice.png' />
                        </div>
                      }
                    >
                      <a
                        className='underline'
                        href={`${API('根域名')}/userinfo/myinvoice/invoiceinfolist`}
                        target='_blank'
                        rel='noreferrer'
                      >
                        开具发票
                      </a>
                    </ResponsiveTooltip>
                  </div>
                  <div>
                    支付即表示你同意
                    <a
                      target='_blank'
                      href='https://nwap.maka.im/nwap/clause'
                      rel='noreferrer'
                    >
                      《MAKA会员服务协议》
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.serviceWrap}>
              <div className={styles.qrcode}>
                <img src='https://img2.maka.im/pic/GHC2LL1C07.png' />
              </div>
              <div>
                <p className={styles.tit}>扫码联系销售</p>
                <p className={styles.desc}>为企业用户定制营销解决方案</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VipModalForPc = () => {
  const { vipShow, setVipShow } = useStore();

  return (
    <>
      <ResponsiveDialog
        isOpen={vipShow}
        handleOnly
        contentProps={{
          className: 'rounded-t-xl w-[920px] max-w-full',
        }}
        onOpenChange={value => {
          setVipShow(value);
        }}
      >
        <VipModalV1 onClose={() => setVipShow(false)} />
      </ResponsiveDialog>
    </>
  );
};

export default observer(VipModalForPc);
