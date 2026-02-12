export interface DashboardMenuItemConfig {
  title: string;
  url: string;
  /**
   * 用于权限匹配的路由前缀（不含 query），不配置时默认使用 url 去掉 query 部分
   */
  routePattern?: string;
}

export interface DashboardMenuCategoryConfig {
  label: string;
  items: DashboardMenuItemConfig[];
  /** 为 true 时在 GLOBAL 模式下隐藏该分组 */
  hideOnGlobal?: boolean;
}

const isGlobal = process.env.GLOBAL === '1';

// 管理后台侧边栏菜单 & 权限分组的统一数据源
const ALL_DASHBOARD_MENU_CATEGORIES: DashboardMenuCategoryConfig[] = [
  {
    label: '基础数据管理',
    items: [
      {
        title: '用户作品',
        url: '/dashboard/manager/works',
      },
      {
        title: '模板管理',
        url: '/dashboard/manager/templates',
      },
    ],
  },
  {
    label: '平台资源管理',
    hideOnGlobal: true,
    items: [
      {
        title: '规格管理',
        url: '/dashboard/manager/specs',
      },
      {
        title: '素材管理',
        url: '/dashboard/manager/material',
      },
      {
        title: '频道管理',
        url: '/dashboard/manager/channels',
      },
      {
        title: '主题任务管理',
        url: '/dashboard/manager/theme-tasks',
      },
      {
        title: '异步任务管理',
        url: '/dashboard/manager/async-tasks',
      },
      {
        title: 'AI 向量管理',
        url: '/dashboard/manager/ai-vectors',
        routePattern: '/dashboard/manager/ai-vectors',
      },
      {
        title: 'AI 生成流水',
        url: '/dashboard/manager/ai-generation-logs',
        routePattern: '/dashboard/manager/ai-generation-logs',
      },
      {
        title: '热词管理',
        url: '/dashboard/manager/search/hotwords',
        routePattern: '/dashboard/manager/search',
      },
      {
        title: '设计师管理',
        url: '/dashboard/manager/designers',
        routePattern: '/dashboard/manager/designers',
      },
    ],
  },
  {
    label: 'BI报表',
    items: [
      {
        title: '公司看板',
        url: '/dashboard/manager/data/bi/company',
        routePattern: '/dashboard/manager/data/bi',
      },
      {
        title: '简帖看板',
        url: '/dashboard/manager/data/bi/product/index?appid=jiantie',
        routePattern: '/dashboard/manager/data/bi',
      },
      {
        title: 'MAKA看板',
        url: '/dashboard/manager/data/bi/product/index?appid=maka',
        routePattern: '/dashboard/manager/data/bi',
      },
    ],
  },
  {
    label: '风控管理',
    items: [
      {
        title: '作品审核记录',
        url: '/dashboard/manager/risk/result',
        routePattern: '/dashboard/manager/risk',
      },
      {
        title: '敏感词管理',
        url: '/dashboard/manager/risk/sensitive',
        routePattern: '/dashboard/manager/risk',
      },
      {
        title: '白名单用户',
        url: '/dashboard/manager/risk/whiteUser',
        routePattern: '/dashboard/manager/risk',
      },
    ],
  },
  {
    label: '权限管理',
    items: [
      {
        title: '账号管理',
        url: '/dashboard/manager/admin/users',
        routePattern: '/dashboard/manager/admin',
      },
      {
        title: '角色管理',
        url: '/dashboard/manager/admin/roles',
        routePattern: '/dashboard/manager/admin',
      },
    ],
  },
  {
    label: '业务报表（废弃）',
    items: [
      {
        title: '简帖数据面板',
        url: '/dashboard/manager/data/channel/report?typeapp=jiantie',
        routePattern: '/dashboard/manager/data/channel',
      },
      {
        title: 'MAKA数据面板',
        url: '/dashboard/manager/data/channel/report?typeapp=maka',
        routePattern: '/dashboard/manager/data/channel',
      },
      {
        title: 'MAKA混合搜索数据',
        url: '/dashboard/manager/data/makamix',
        routePattern: '/dashboard/manager/data/makamix',
      },
    ],
  },
];

// 根据环境过滤：GLOBAL 模式下隐藏标记了 hideOnGlobal 的分组
export const DASHBOARD_MENU_CATEGORIES: DashboardMenuCategoryConfig[] = isGlobal
  ? ALL_DASHBOARD_MENU_CATEGORIES.filter(c => !c.hideOnGlobal)
  : ALL_DASHBOARD_MENU_CATEGORIES;
