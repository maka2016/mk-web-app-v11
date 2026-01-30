import { Briefcase, Gift, Heart, Users } from 'lucide-react';

// 指标定义
export const REPORT_METRICS = [
  { key: 'view_pv', label: '浏览量 (PV)', group: '流量', format: 'number' },
  { key: 'view_uv', label: '浏览用户 (UV)', group: '流量', format: 'number' },
  { key: 'click_pv', label: '模板点击 (PV)', group: '流量', format: 'number' },
  { key: 'click_uv', label: '模板点击 (UV)', group: '流量', format: 'number' },
  { key: 'creation_pv', label: '创作量 (PV)', group: '创作', format: 'number' },
  {
    key: 'creation_uv',
    label: '创作用户 (UV)',
    group: '创作',
    format: 'number',
  },
  {
    key: 'intercept_pv',
    label: '拦截量 (PV)',
    group: '拦截',
    format: 'number',
  },
  {
    key: 'intercept_uv',
    label: '拦截用户 (UV)',
    group: '拦截',
    format: 'number',
  },
  { key: 'order_count', label: '订单数', group: '商业', format: 'number' },
  {
    key: 'transaction_amount',
    label: '成交金额 (GMV)',
    group: '商业',
    format: 'currency',
  },
  // 计算指标 - 转化率
  {
    key: 'view_click_rate_uv',
    label: '浏览点击率 (UV)',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'view_creation_rate_uv',
    label: '浏览创作率 (UV)',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'click_creation_rate_uv',
    label: '点击创作率 (UV)',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'view_intercept_rate_pv',
    label: '浏览拦截率 (PV)',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'view_intercept_rate_uv',
    label: '浏览拦截率 (UV)',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'view_order_rate_uv',
    label: '浏览订单转化率 (UV)',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'creation_order_rate_uv',
    label: '创作付费率 (UV)',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'click_order_rate_uv',
    label: '点击付费率 (UV)',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'creation_intercept_rate_uv',
    label: '创作拦截率 (UV)',
    group: '转化率',
    format: 'percent',
  },
  // 计算指标 - 价值
  {
    key: 'view_value_pv',
    label: '浏览价值 (PV)',
    group: '价值',
    format: 'currency',
  },
  {
    key: 'view_value_uv',
    label: '浏览价值 (UV)',
    group: '价值',
    format: 'currency',
  },
  {
    key: 'click_value_uv',
    label: '点击价值 (UV)',
    group: '价值',
    format: 'currency',
  },
  {
    key: 'creation_value_uv',
    label: '创作价值 (UV)',
    group: '价值',
    format: 'currency',
  },
];

// 排序指标定义
export const RANKING_METRICS = [
  // 综合分
  {
    key: 'composite_score',
    label: '综合分',
    group: '综合',
    format: 'score',
    width: 'w-24',
  },
  // 曝光pvuv
  {
    key: 'view_pv',
    label: '曝光量 (PV)',
    group: '曝光pvuv',
    format: 'number',
    width: 'w-28',
  },
  {
    key: 'view_uv',
    label: '曝光量 (UV)',
    group: '曝光pvuv',
    format: 'number',
    width: 'w-28',
  },
  // 点击pvuv
  {
    key: 'click_pv',
    label: '点击量 (PV)',
    group: '点击pvuv',
    format: 'number',
    width: 'w-28',
  },
  {
    key: 'click_uv',
    label: '点击量 (UV)',
    group: '点击pvuv',
    format: 'number',
    width: 'w-28',
  },
  // 创作量pvuv
  {
    key: 'creation_pv',
    label: '创作量 (PV)',
    group: '创作量pvuv',
    format: 'number',
    width: 'w-28',
  },
  {
    key: 'creation_uv',
    label: '创作量 (UV)',
    group: '创作量pvuv',
    format: 'number',
    width: 'w-28',
  },
  // 拦截量pvuv
  {
    key: 'intercept_pv',
    label: '拦截量 (PV)',
    group: '拦截量pvuv',
    format: 'number',
    width: 'w-28',
  },
  {
    key: 'intercept_uv',
    label: '拦截量 (UV)',
    group: '拦截量pvuv',
    format: 'number',
    width: 'w-28',
  },
  // 成功量pvuv
  {
    key: 'success_pv',
    label: '成功量 (PV)',
    group: '成功量pvuv',
    format: 'number',
    width: 'w-28',
  },
  {
    key: 'success_uv',
    label: '成功量 (UV)',
    group: '成功量pvuv',
    format: 'number',
    width: 'w-28',
  },
  // 付费量
  {
    key: 'order_count',
    label: '付费量',
    group: '付费',
    format: 'number',
    width: 'w-24',
  },
  // 付费金额
  {
    key: 'transaction_amount',
    label: '付费金额',
    group: '付费',
    format: 'currency',
    width: 'w-32',
  },
  // 环节指标 - 转化率
  {
    key: 'ctr',
    label: '曝光点击率 (CTR)',
    group: '环节指标',
    format: 'percent',
    width: 'w-32',
  },
  {
    key: 'view_creation_rate',
    label: '曝光创作率',
    group: '环节指标',
    format: 'percent',
    width: 'w-28',
  },
  {
    key: 'click_creation_rate',
    label: '点击创作率',
    group: '环节指标',
    format: 'percent',
    width: 'w-28',
  },
  {
    key: 'creation_order_rate',
    label: '创作购买率',
    group: '环节指标',
    format: 'percent',
    width: 'w-28',
  },
  {
    key: 'view_order_rate',
    label: '曝光购买率',
    group: '环节指标',
    format: 'percent',
    width: 'w-28',
  },
  // 环节指标 - 价值
  {
    key: 'view_value',
    label: '曝光价值',
    group: '环节指标',
    format: 'currency',
    width: 'w-28',
  },
  {
    key: 'click_value',
    label: '点击价值',
    group: '环节指标',
    format: 'currency',
    width: 'w-28',
  },
  {
    key: 'creation_value',
    label: '创作价值',
    group: '环节指标',
    format: 'currency',
    width: 'w-28',
  },
];

// 分类数据
export const categories = [
  { id: 'wedding', name: '婚庆', icon: Heart, color: 'text-pink-500' },
  { id: 'baby', name: '宝宝', icon: Users, color: 'text-blue-400' },
  { id: 'business', name: '商务', icon: Briefcase, color: 'text-slate-600' },
  { id: 'birthday', name: '生日', icon: Gift, color: 'text-orange-400' },
];

export const clientTypes = [
  { id: 'all', label: '全部客户端' },
  { id: 'ios', label: 'iOS 端' },
  { id: 'android', label: '安卓端' },
  { id: 'web', label: 'Web 端' },
  { id: 'wap', label: 'WAP 端' },
];

// 格式化函数
export const formatMoney = (val: number) => `¥${val.toLocaleString()}`;
export const formatNumber = (val: number) => val.toLocaleString();
