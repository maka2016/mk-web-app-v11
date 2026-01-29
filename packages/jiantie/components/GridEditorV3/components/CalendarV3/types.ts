export interface MarkGroupConfig {
  id: string; // 唯一标识
  title: string; // 显示标题
  items: string[]; // 标记项列表（字符串数组）
  style: {
    backgroundColor: string; // 日期背景色
    textColor: string; // 日期文字色
    cornerBackgroundColor: string; // 角标背景色
    cornerTextColor: string; // 角标文字色
    borderColor?: string; // 描边颜色
    borderWidth?: number; // 描边粗细（px）
  };
}

export interface IMark {
  date: string; // 日期（格式：'YYYY-MM-DD'）
  groupId: string; // 所属标记组ID
  cornerText: string; // 角标文字（从标记组的 items 中选择）
}

export interface MkCalendarV3Props {
  marks?: IMark[]; // 已标记日期列表（统一格式）
  markGroups?: MarkGroupConfig[]; // 标记组配置列表
  // 兼容旧数据格式
  mark1?: IMark[]; // 旧的放假日期标记（将被迁移）
  mark2?: IMark[]; // 旧的补班日期标记（将被迁移）
  showWeekNumber: boolean;
  startFromSunday?: boolean; // 是否从周日开始，默认 false（从周一开始）
  showMonthTitle?: boolean; // 是否显示年月标题，默认 true
  visibleDateRange?: {
    startDate: string;
    endDate: string;
  };
  showLunar?: boolean; // 是否显示农历，默认 false
  style: {
    todayColor: string;
    textColor: string;
    borderRadius: number;
    padding: number; // 日历项内边距
    visibleWeeks: number;
    borderColor?: string; // 描边颜色
    borderWidth?: number; // 描边粗细（px）
    weekDayTextColor?: string; // 周数文字颜色
    fontSize?: number; // 字体大小（px）
    fontFamily?: string; // 字体族
    fontWeight?: number | string; // 字体粗细
    lunarFontSize?: number; // 农历字体大小（px）
  };
}
