'use client';

import { cdnApi } from '@/services';
import { trpc } from '@/utils/trpc';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import dayjs from 'dayjs';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  Settings2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function TemplateListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';

  // 筛选条件
  const [selectedLevel2, setSelectedLevel2] = useState<number | null>(null);
  const [selectedLevel3, setSelectedLevel3] = useState<number | null>(null);
  const [selectedLevel4, setSelectedLevel4] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<
    'today' | 'yesterday' | '7d' | '14d' | '30d'
  >('7d');

  // 频道数据
  const [channels, setChannels] = useState<{
    level2: Array<{
      id: number;
      display_name: string;
      alias: string;
      class: string;
      thumb_path: string | null;
      parent_id: number | null;
      sort_weight: number;
    }>;
    level3: Array<{
      id: number;
      display_name: string;
      alias: string;
      class: string;
      thumb_path: string | null;
      parent_id: number | null;
      sort_weight: number;
    }>;
    level4: Array<{
      id: number;
      display_name: string;
      alias: string;
      class: string;
      thumb_path: string | null;
      parent_id: number | null;
      sort_weight: number;
    }>;
  }>({
    level2: [],
    level3: [],
    level4: [],
  });

  // 模板列表数据
  const [templates, setTemplates] = useState<
    Array<{
      id: string;
      title: string;
      cover: string | null;
      coverV3: { url: string; width: number; height: number } | null;
      designer: {
        id: string;
        name: string;
        uid: number;
      } | null;
      create_time: string;
      status: string;
      newTemplateTag: string;
      // PV 指标（Page View - 页面浏览量）
      exposure: number; // 曝光PV：模板曝光次数
      click: number; // 点击PV：点击进入模板详情或编辑页的次数
      creation: number; // 创作PV：发起创作的次数
      success: number; // 成功PV：如分享、导出等成功行为的次数
      intercept_pv: number; // 拦截PV：如会员拦截的次数
      // UV 指标（Unique Visitor - 独立访客数）
      success_uv: number; // 成功UV：如分享、导出等成功行为的独立用户数
      intercept_uv: number; // 拦截UV：如会员拦截的独立用户数
      // 其他指标
      sales: number; // 销量：订单数
      gmv: number; // GMV：成交金额
      creation_uv_value: number; // 创作价值UV：GMV / 创作UV
      // 比率指标
      success_uv_rate: number; // 创作成功率UV：成功UV / 创作UV
      intercept_pv_rate: number; // 创作拦截率PV：拦截PV / 创作PV
      intercept_uv_rate: number; // 创作拦截率UV：拦截UV / 创作UV
      creation_order_uv_rate: number; // 创作订单率UV：订单数 / 创作UV
      composite_score?: number; // 排序分
    }>
  >([]);

  // 默认列配置
  const defaultColumnConfig: Record<string, boolean> = {
    exposure: true,
    click: true,
    creation: true,
    success: true,
    sales: true,
    gmv: true,
    creation_uv_value: true,
    success_uv: false,
    success_uv_rate: false,
    intercept_pv: false,
    intercept_uv: false,
    intercept_pv_rate: false,
    intercept_uv_rate: false,
    creation_order_uv_rate: false,
  };

  // 列配置
  const [columnConfig, setColumnConfig] =
    useState<Record<string, boolean>>(defaultColumnConfig);

  // 列配置弹窗
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // 从 localStorage 加载列配置
  useEffect(() => {
    const saved = localStorage.getItem('templateList_columnConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setColumnConfig({ ...defaultColumnConfig, ...parsed });
      } catch (e) {
        console.error('加载列配置失败:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存列配置到 localStorage
  const saveColumnConfig = (config: Record<string, boolean>) => {
    setColumnConfig(config);
    localStorage.setItem('templateList_columnConfig', JSON.stringify(config));
  };
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 排序状态
  const [sortColumn, setSortColumn] = useState<string | null>('sales');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 获取频道数据
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoadingChannels(true);
        const data = await trpc.bi.getTemplateListChannels.query({
          appid: appid || undefined,
        });
        setChannels(data);

        // 默认选择第一个
        if (data.level2.length > 0) {
          const firstLevel2 = data.level2[0];
          setSelectedLevel2(firstLevel2.id);

          // 选择第一个三级热词（如果有）
          const filteredLevel3 = data.level3.filter(
            ch => ch.parent_id === firstLevel2.id
          );
          if (filteredLevel3.length > 0) {
            const firstLevel3 = filteredLevel3[0];
            setSelectedLevel3(firstLevel3.id);

            // 选择第一个四级标签（如果有）
            const filteredLevel4 = data.level4.filter(
              ch => ch.parent_id === firstLevel3.id
            );
            if (filteredLevel4.length > 0) {
              setSelectedLevel4(filteredLevel4[0].id);
            }
          }
        }
      } catch (error) {
        console.error('获取频道数据失败:', error);
        setChannels({ level2: [], level3: [], level4: [] });
      } finally {
        setIsLoadingChannels(false);
      }
    };

    if (appid) {
      fetchChannels();
    } else {
      setIsLoadingChannels(false);
    }
  }, [appid]);

  // 获取模板列表数据
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const data = await trpc.bi.getTemplateList.query({
          appid: appid || undefined,
          level2ChannelId: selectedLevel2 || undefined,
          level3HotWordId: selectedLevel3 || undefined,
          level4TagId: selectedLevel4 || undefined,
          dateRange: dateRange,
        });

        // 数据获取后，会在 useMemo 中根据排序状态进行排序
        setTemplates(data);
      } catch (error) {
        console.error('获取模板列表失败:', error);
        setTemplates([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    if (appid) {
      fetchTemplates();
    } else {
      setIsLoadingTemplates(false);
    }
  }, [appid, selectedLevel2, selectedLevel3, selectedLevel4, dateRange]);

  // 根据选中的二级频道筛选三级热词
  const filteredLevel3 = channels.level3.filter(
    ch => !selectedLevel2 || ch.parent_id === selectedLevel2
  );

  // 根据选中的三级热词筛选四级标签
  const filteredLevel4 = channels.level4.filter(
    ch => !selectedLevel3 || ch.parent_id === selectedLevel3
  );

  // 处理列头排序点击
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // 如果点击的是当前排序列，切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 如果点击的是新列，设置为降序
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // 根据排序状态对数据进行排序
  const sortedTemplates = useMemo(() => {
    if (!sortColumn) return templates;

    const sorted = [...templates].sort((a, b) => {
      let aValue: number | string | undefined;
      let bValue: number | string | undefined;

      // 根据列名获取对应的值
      switch (sortColumn) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'designer':
          aValue = a.designer?.name || '';
          bValue = b.designer?.name || '';
          break;
        case 'create_time':
          aValue = a.create_time;
          bValue = b.create_time;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'composite_score':
          aValue = a.composite_score ?? 0;
          bValue = b.composite_score ?? 0;
          break;
        case 'exposure':
          aValue = a.exposure;
          bValue = b.exposure;
          break;
        case 'click':
          aValue = a.click;
          bValue = b.click;
          break;
        case 'creation':
          aValue = a.creation;
          bValue = b.creation;
          break;
        case 'success':
          aValue = a.success;
          bValue = b.success;
          break;
        case 'sales':
          aValue = a.sales;
          bValue = b.sales;
          break;
        case 'gmv':
          aValue = a.gmv;
          bValue = b.gmv;
          break;
        case 'creation_uv_value':
          aValue = a.creation_uv_value;
          bValue = b.creation_uv_value;
          break;
        case 'success_uv':
          aValue = a.success_uv;
          bValue = b.success_uv;
          break;
        case 'success_uv_rate':
          aValue = a.success_uv_rate;
          bValue = b.success_uv_rate;
          break;
        case 'intercept_pv':
          aValue = a.intercept_pv;
          bValue = b.intercept_pv;
          break;
        case 'intercept_uv':
          aValue = a.intercept_uv;
          bValue = b.intercept_uv;
          break;
        case 'intercept_pv_rate':
          aValue = a.intercept_pv_rate;
          bValue = b.intercept_pv_rate;
          break;
        case 'intercept_uv_rate':
          aValue = a.intercept_uv_rate;
          bValue = b.intercept_uv_rate;
          break;
        case 'creation_order_uv_rate':
          aValue = a.creation_order_uv_rate;
          bValue = b.creation_order_uv_rate;
          break;
        default:
          return 0;
      }

      // 处理 null/undefined 值
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // 数字类型排序
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // 字符串类型排序
      const aStr = String(aValue);
      const bStr = String(bValue);
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr, 'zh-CN');
      } else {
        return bStr.localeCompare(aStr, 'zh-CN');
      }
    });

    return sorted;
  }, [templates, sortColumn, sortDirection]);

  // 获取排序图标
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className='h-4 w-4 text-slate-400' />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className='h-4 w-4 text-blue-600' />;
    }
    return <ArrowDown className='h-4 w-4 text-blue-600' />;
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // 格式化金额（元）- 只显示整数
  const formatAmount = (amount: number) => {
    return `¥${Math.round(amount)}`;
  };

  // CSV 转义函数
  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 导出全部数据
  const handleExportAll = async () => {
    try {
      setIsExporting(true);

      // 获取所有2、3、4级频道的组合
      const allCombinations: Array<{
        level2Id?: number;
        level3Id?: number;
        level4Id?: number;
        level2Name?: string;
        level3Name?: string;
        level4Name?: string;
      }> = [];

      // 遍历所有2级频道
      for (const level2 of channels.level2) {
        const level3List = channels.level3.filter(
          l3 => l3.parent_id === level2.id
        );

        if (level3List.length === 0) {
          // 如果没有3级，直接添加2级
          allCombinations.push({
            level2Id: level2.id,
            level2Name: level2.display_name,
          });
        } else {
          // 遍历所有3级热词
          for (const level3 of level3List) {
            const level4List = channels.level4.filter(
              l4 => l4.parent_id === level3.id
            );

            if (level4List.length === 0) {
              // 如果没有4级，添加2、3级组合
              allCombinations.push({
                level2Id: level2.id,
                level3Id: level3.id,
                level2Name: level2.display_name,
                level3Name: level3.display_name,
              });
            } else {
              // 遍历所有4级标签
              for (const level4 of level4List) {
                allCombinations.push({
                  level2Id: level2.id,
                  level3Id: level3.id,
                  level4Id: level4.id,
                  level2Name: level2.display_name,
                  level3Name: level3.display_name,
                  level4Name: level4.display_name,
                });
              }
            }
          }
        }
      }

      // 获取所有组合的数据
      const allTemplates: Array<{
        id: string;
        title: string;
        designer: string;
        create_time: string;
        status: string;
        newTemplateTag: string;
        level2Name: string;
        level3Name: string;
        level4Name: string;
        // PV 指标（Page View - 页面浏览量）
        exposure: number; // 曝光PV：模板曝光次数
        click: number; // 点击PV：点击进入模板详情或编辑页的次数
        creation: number; // 创作PV：发起创作的次数
        success: number; // 成功PV：如分享、导出等成功行为的次数
        intercept_pv: number; // 拦截PV：如会员拦截的次数
        // UV 指标（Unique Visitor - 独立访客数）
        success_uv: number; // 成功UV：如分享、导出等成功行为的独立用户数
        intercept_uv: number; // 拦截UV：如会员拦截的独立用户数
        // 其他指标
        sales: number; // 销量：订单数
        gmv: number; // GMV：成交金额
        creation_uv_value: number; // 创作价值UV：GMV / 创作UV
        // 比率指标
        success_uv_rate: number; // 创作成功率UV：成功UV / 创作UV
        intercept_pv_rate: number; // 创作拦截率PV：拦截PV / 创作PV
        intercept_uv_rate: number; // 创作拦截率UV：拦截UV / 创作UV
        creation_order_uv_rate: number; // 创作订单率UV：订单数 / 创作UV
        composite_score: number; // 排序分
      }> = [];

      // 批量获取数据（避免并发过多）
      for (let i = 0; i < allCombinations.length; i += 10) {
        const batch = allCombinations.slice(i, i + 10);
        const promises = batch.map(async combo => {
          try {
            const data = await trpc.bi.getTemplateList.query({
              appid: appid || undefined,
              level2ChannelId: combo.level2Id,
              level3HotWordId: combo.level3Id,
              level4TagId: combo.level4Id,
              dateRange: dateRange,
            });

            const enrichedData = data.map(item => ({
              id: item.id,
              title: item.title,
              designer: item.designer?.name || '未知',
              create_time: item.create_time,
              status: item.status,
              newTemplateTag: item.newTemplateTag,
              level2Name: combo.level2Name || '',
              level3Name: combo.level3Name || '',
              level4Name: combo.level4Name || '',
              exposure: item.exposure,
              click: item.click,
              creation: item.creation,
              success: item.success,
              sales: item.sales,
              gmv: item.gmv,
              creation_uv_value: item.creation_uv_value,
              success_uv: item.success_uv,
              success_uv_rate: item.success_uv_rate,
              intercept_pv: item.intercept_pv,
              intercept_uv: item.intercept_uv,
              intercept_pv_rate: item.intercept_pv_rate,
              intercept_uv_rate: item.intercept_uv_rate,
              creation_order_uv_rate: item.creation_order_uv_rate,
              composite_score: item.composite_score || 0,
            }));

            return enrichedData;
          } catch (error) {
            console.error('获取数据失败:', error);
            return [];
          }
        });

        const results = await Promise.all(promises);
        allTemplates.push(...results.flat());
      }

      if (allTemplates.length === 0) {
        alert('暂无数据可导出');
        setIsExporting(false);
        return;
      }

      // 获取统计周期显示文本
      const dateRangeText = {
        today: '当天',
        yesterday: '昨天',
        '7d': '7天内',
        '14d': '14天内',
        '30d': '30天内',
      }[dateRange];

      // 构建 CSV 表头（根据列配置）
      const headers = [
        '模板ID',
        '标题',
        '设计师',
        '上架时间',
        '状态',
        '新模板',
        '排序分',
        '二级频道',
        '三级热词',
        '四级标签',
      ];

      const columnHeaders: Array<{ key: string; label: string }> = [
        { key: 'exposure', label: `${dateRangeText}曝光PV` },
        { key: 'click', label: `${dateRangeText}点击PV` },
        { key: 'creation', label: `${dateRangeText}创作PV` },
        { key: 'success', label: `${dateRangeText}成功PV` },
        { key: 'sales', label: `${dateRangeText}销量` },
        { key: 'gmv', label: `${dateRangeText}GMV` },
        { key: 'creation_uv_value', label: `${dateRangeText}创作价值UV` },
        { key: 'success_uv', label: `${dateRangeText}成功UV` },
        { key: 'success_uv_rate', label: `${dateRangeText}创作成功率UV` },
        { key: 'intercept_pv', label: `${dateRangeText}拦截PV` },
        { key: 'intercept_uv', label: `${dateRangeText}拦截UV` },
        {
          key: 'intercept_pv_rate',
          label: `${dateRangeText}创作拦截率PV`,
        },
        {
          key: 'intercept_uv_rate',
          label: `${dateRangeText}创作拦截率UV`,
        },
        {
          key: 'creation_order_uv_rate',
          label: `${dateRangeText}创作订单率UV`,
        },
      ];

      columnHeaders.forEach(col => {
        if (columnConfig[col.key]) {
          headers.push(col.label);
        }
      });

      // 构建 CSV 数据行
      const rows = allTemplates.map(t => {
        const baseRow = [
          t.id,
          t.title,
          t.designer,
          t.create_time,
          t.status,
          t.newTemplateTag,
          t.composite_score.toFixed(2),
          t.level2Name,
          t.level3Name,
          t.level4Name,
        ];

        const dataRow: (string | number)[] = [];
        if (columnConfig.exposure) dataRow.push(t.exposure.toString());
        if (columnConfig.click) dataRow.push(t.click.toString());
        if (columnConfig.creation) dataRow.push(t.creation.toString());
        if (columnConfig.success) dataRow.push(t.success.toString());
        if (columnConfig.sales) dataRow.push(t.sales.toString());
        if (columnConfig.gmv) dataRow.push(t.gmv.toFixed(2));
        if (columnConfig.creation_uv_value)
          dataRow.push(t.creation_uv_value.toFixed(2));
        if (columnConfig.success_uv) dataRow.push(t.success_uv.toString());
        if (columnConfig.success_uv_rate)
          dataRow.push((t.success_uv_rate * 100).toFixed(2) + '%');
        if (columnConfig.intercept_pv) dataRow.push(t.intercept_pv.toString());
        if (columnConfig.intercept_uv) dataRow.push(t.intercept_uv.toString());
        if (columnConfig.intercept_pv_rate)
          dataRow.push((t.intercept_pv_rate * 100).toFixed(2) + '%');
        if (columnConfig.intercept_uv_rate)
          dataRow.push((t.intercept_uv_rate * 100).toFixed(2) + '%');
        if (columnConfig.creation_order_uv_rate)
          dataRow.push((t.creation_order_uv_rate * 100).toFixed(2) + '%');

        return [...baseRow, ...dataRow];
      });

      // 构建 CSV 内容
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(',')),
      ].join('\n');

      // 添加 BOM 以支持中文 Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });

      // 创建下载链接
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `模板列表_${appid}_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`成功导出 ${allTemplates.length} 条记录`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (!appid) {
    return (
      <div className='min-h-screen bg-slate-50 p-6'>
        <div className='max-w-[1920px] mx-auto'>
          <div className='rounded-lg border border-dashed p-8 text-center bg-white'>
            <p className='text-slate-500'>
              请从 URL 参数中提供 appid（例如：?appid=jiantie）
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50 p-4'>
      <div className='max-w-[1920px] mx-auto'>
        {/* 标题栏和导出按钮 */}
        <div className='flex items-center justify-between mb-4'>
          <h1 className='text-xl font-bold text-slate-900'>模板列表</h1>
          <div className='flex items-center gap-3'>
            {/* 统计周期按钮组 */}
            <div className='flex items-center gap-1 bg-slate-100 rounded-md p-1'>
              {[
                { value: 'today', label: '当天' },
                { value: 'yesterday', label: '昨天' },
                { value: '7d', label: '7天内' },
                { value: '14d', label: '14天内' },
                { value: '30d', label: '30天内' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() =>
                    setDateRange(
                      option.value as
                        | 'today'
                        | 'yesterday'
                        | '7d'
                        | '14d'
                        | '30d'
                    )
                  }
                  className={`px-3 py-1.5 text-sm rounded transition-all ${
                    dateRange === option.value
                      ? 'bg-white text-blue-600 shadow-sm font-medium'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {/* 列配置按钮 */}
            <button
              onClick={() => setShowColumnConfig(true)}
              className='px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2'
            >
              <Settings2 className='h-4 w-4' />
              <span>列配置</span>
            </button>
            <button
              onClick={handleExportAll}
              disabled={isExporting}
              className='px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
            >
              {isExporting ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span>导出中...</span>
                </>
              ) : (
                <span>导出全部</span>
              )}
            </button>
          </div>
        </div>

        {/* 列配置弹窗 */}
        {showColumnConfig && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-lg font-bold text-slate-900'>列配置</h2>
                <button
                  onClick={() => setShowColumnConfig(false)}
                  className='text-slate-400 hover:text-slate-600'
                >
                  ✕
                </button>
              </div>
              <div className='space-y-2'>
                {[
                  { key: 'exposure', label: '曝光PV' },
                  { key: 'click', label: '点击PV' },
                  { key: 'creation', label: '创作PV' },
                  { key: 'success', label: '成功PV' },
                  { key: 'sales', label: '销量' },
                  { key: 'gmv', label: 'GMV' },
                  { key: 'creation_uv_value', label: '创作价值UV' },
                  { key: 'success_uv', label: '成功UV' },
                  { key: 'success_uv_rate', label: '创作成功率UV' },
                  { key: 'intercept_pv', label: '拦截PV' },
                  { key: 'intercept_uv', label: '拦截UV' },
                  { key: 'intercept_pv_rate', label: '创作拦截率PV' },
                  { key: 'intercept_uv_rate', label: '创作拦截率UV' },
                  { key: 'creation_order_uv_rate', label: '创作订单率UV' },
                ].map(col => (
                  <label
                    key={col.key}
                    className='flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer'
                  >
                    <input
                      type='checkbox'
                      checked={columnConfig[col.key] || false}
                      onChange={e => {
                        const newConfig = {
                          ...columnConfig,
                          [col.key]: e.target.checked,
                        };
                        saveColumnConfig(newConfig);
                      }}
                      className='w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500'
                    />
                    <span className='text-sm text-slate-700'>{col.label}</span>
                  </label>
                ))}
              </div>
              <div className='mt-6 flex justify-end gap-2'>
                <button
                  onClick={() => setShowColumnConfig(false)}
                  className='px-4 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-700 hover:bg-slate-50'
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 频道筛选 */}
        <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4'>
          {isLoadingChannels ? (
            <div className='flex items-center justify-center py-6'>
              <Loader2 className='h-5 w-5 animate-spin text-slate-400' />
              <span className='ml-2 text-slate-500'>加载中...</span>
            </div>
          ) : (
            <div className='space-y-3'>
              {/* 主要分类 - 图标在上，文字在下 */}
              {channels.level2.length > 0 && (
                <div className='flex flex-wrap gap-3'>
                  {channels.level2.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        const newLevel2 =
                          selectedLevel2 === ch.id ? null : ch.id;
                        setSelectedLevel2(newLevel2);

                        if (newLevel2) {
                          // 自动选择第一个3级热词
                          const firstLevel3 = channels.level3.find(
                            l3 => l3.parent_id === newLevel2
                          );
                          if (firstLevel3) {
                            setSelectedLevel3(firstLevel3.id);

                            // 自动选择第一个4级标签
                            const firstLevel4 = channels.level4.find(
                              l4 => l4.parent_id === firstLevel3.id
                            );
                            if (firstLevel4) {
                              setSelectedLevel4(firstLevel4.id);
                            } else {
                              setSelectedLevel4(null);
                            }
                          } else {
                            setSelectedLevel3(null);
                            setSelectedLevel4(null);
                          }
                        } else {
                          setSelectedLevel3(null);
                          setSelectedLevel4(null);
                        }
                      }}
                      className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                        selectedLevel2 === ch.id
                          ? 'bg-slate-100'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {ch.thumb_path ? (
                        <img
                          src={cdnApi(ch.thumb_path, {
                            resizeWidth: 40,
                            resizeHeight: 40,
                          })}
                          alt={ch.display_name}
                          className='w-10 h-10 object-contain'
                        />
                      ) : (
                        <div className='w-10 h-10 rounded bg-slate-100 flex items-center justify-center'>
                          <span className='text-slate-400 text-xs'>无图</span>
                        </div>
                      )}
                      <span className='text-xs font-medium text-slate-700'>
                        {ch.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* 当前筛选路径 */}
              {(selectedLevel2 || selectedLevel3 || selectedLevel4) && (
                <div className='pt-2 border-t border-slate-200'>
                  <div className='text-xs text-slate-600 mb-2'>
                    当前展示:{' '}
                    <span className='text-slate-900 font-medium'>
                      {selectedLevel2
                        ? channels.level2.find(ch => ch.id === selectedLevel2)
                            ?.display_name
                        : '全部'}
                      {selectedLevel3
                        ? ` / ${filteredLevel3.find(ch => ch.id === selectedLevel3)?.display_name}`
                        : ''}
                      {selectedLevel4
                        ? ` / ${filteredLevel4.find(ch => ch.id === selectedLevel4)?.display_name}`
                        : ''}
                    </span>
                  </div>

                  {/* 三级热词 - 选中时深蓝色背景，未选中时浅灰色背景 */}
                  {filteredLevel3.length > 0 && (
                    <div className='mb-2'>
                      <div className='flex flex-wrap gap-1.5'>
                        {filteredLevel3.map(ch => (
                          <button
                            key={ch.id}
                            onClick={() => {
                              const newLevel3 =
                                selectedLevel3 === ch.id ? null : ch.id;
                              setSelectedLevel3(newLevel3);

                              if (newLevel3) {
                                // 自动选择第一个4级标签
                                const firstLevel4 = channels.level4.find(
                                  l4 => l4.parent_id === newLevel3
                                );
                                if (firstLevel4) {
                                  setSelectedLevel4(firstLevel4.id);
                                } else {
                                  setSelectedLevel4(null);
                                }
                              } else {
                                setSelectedLevel4(null);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                              selectedLevel3 === ch.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {ch.display_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 四级标签 - 选中时深蓝色背景，未选中时浅灰色背景 */}
                  {filteredLevel4.length > 0 && (
                    <div>
                      <div className='flex flex-wrap gap-1.5'>
                        {filteredLevel4.map(ch => (
                          <button
                            key={ch.id}
                            onClick={() => {
                              setSelectedLevel4(
                                selectedLevel4 === ch.id ? null : ch.id
                              );
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                              selectedLevel4 === ch.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {ch.display_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 清除筛选 */}
                  <div className='mt-2 pt-2 border-t border-slate-200'>
                    <button
                      onClick={() => {
                        setSelectedLevel2(null);
                        setSelectedLevel3(null);
                        setSelectedLevel4(null);
                      }}
                      className='px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-all'
                    >
                      清除筛选
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 模板列表 */}
        <div className='bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden'>
          {isLoadingTemplates ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin text-slate-400' />
              <span className='ml-2 text-slate-500'>加载中...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className='flex items-center justify-center py-12'>
              <span className='text-slate-500'>暂无数据</span>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[200px]'>封面</TableHead>
                    <TableHead
                      className='w-[150px] cursor-pointer hover:bg-slate-50 select-none'
                      onClick={() => handleSort('id')}
                    >
                      <div className='flex items-center gap-1'>
                        模板ID
                        {getSortIcon('id')}
                      </div>
                    </TableHead>
                    <TableHead
                      className='w-[200px] cursor-pointer hover:bg-slate-50 select-none'
                      onClick={() => handleSort('title')}
                    >
                      <div className='flex items-center gap-1'>
                        标题
                        {getSortIcon('title')}
                      </div>
                    </TableHead>
                    <TableHead
                      className='w-[120px] cursor-pointer hover:bg-slate-50 select-none'
                      onClick={() => handleSort('designer')}
                    >
                      <div className='flex items-center gap-1'>
                        设计师
                        {getSortIcon('designer')}
                      </div>
                    </TableHead>
                    <TableHead className='w-[100px]'>新模板</TableHead>
                    <TableHead
                      className='w-[120px] cursor-pointer hover:bg-slate-50 select-none'
                      onClick={() => handleSort('create_time')}
                    >
                      <div className='flex items-center gap-1'>
                        上架时间
                        {getSortIcon('create_time')}
                      </div>
                    </TableHead>
                    <TableHead
                      className='w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                      onClick={() => handleSort('status')}
                    >
                      <div className='flex items-center gap-1'>
                        状态
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead
                      className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                      onClick={() => handleSort('composite_score')}
                    >
                      <div className='flex items-center justify-end gap-1'>
                        排序分
                        {getSortIcon('composite_score')}
                      </div>
                    </TableHead>
                    {columnConfig.exposure && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('exposure')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          曝光PV
                          {getSortIcon('exposure')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.click && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('click')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          点击PV
                          {getSortIcon('click')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.creation && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('creation')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          创作PV
                          {getSortIcon('creation')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.success && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('success')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          成功PV
                          {getSortIcon('success')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.sales && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('sales')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          销量
                          {getSortIcon('sales')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.gmv && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('gmv')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          GMV
                          {getSortIcon('gmv')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.creation_uv_value && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('creation_uv_value')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          创作价值UV
                          {getSortIcon('creation_uv_value')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.success_uv && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('success_uv')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          成功UV
                          {getSortIcon('success_uv')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.success_uv_rate && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('success_uv_rate')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          创作成功率UV
                          {getSortIcon('success_uv_rate')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.intercept_pv && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('intercept_pv')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          拦截PV
                          {getSortIcon('intercept_pv')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.intercept_uv && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('intercept_uv')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          拦截UV
                          {getSortIcon('intercept_uv')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.intercept_pv_rate && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('intercept_pv_rate')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          创作拦截率PV
                          {getSortIcon('intercept_pv_rate')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.intercept_uv_rate && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('intercept_uv_rate')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          创作拦截率UV
                          {getSortIcon('intercept_uv_rate')}
                        </div>
                      </TableHead>
                    )}
                    {columnConfig.creation_order_uv_rate && (
                      <TableHead
                        className='text-right w-[100px] cursor-pointer hover:bg-slate-50 select-none'
                        onClick={() => handleSort('creation_order_uv_rate')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          创作订单率UV
                          {getSortIcon('creation_order_uv_rate')}
                        </div>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTemplates.map(template => (
                    <TableRow key={template.id}>
                      <TableCell>
                        {template.coverV3?.url ? (
                          <img
                            src={cdnApi(template.coverV3.url, {
                              resizeWidth: 120,
                              resizeHeight: 120,
                            })}
                            alt={template.title}
                            className='w-24 h-24 rounded object-cover'
                          />
                        ) : (
                          <div className='w-24 h-24 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs'>
                            无封面
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => {
                            window.open(
                              `/dashboard/manager/data/template/${template.id}`,
                              '_blank'
                            );
                          }}
                          className='text-sm text-blue-600 hover:text-blue-800 font-mono hover:underline cursor-pointer'
                        >
                          {template.id}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className='font-medium text-slate-900 line-clamp-1'>
                          {template.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.designer ? (
                          <div className='text-sm text-slate-700'>
                            {template.designer.name}
                          </div>
                        ) : (
                          <span className='text-sm text-slate-400'>未知</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.newTemplateTag && (
                          <span className='inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800'>
                            {template.newTemplateTag}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className='text-sm text-slate-600'>
                          {dayjs(template.create_time).format('YYYY-MM-DD')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            template.status === '正常'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {template.status}
                        </span>
                      </TableCell>
                      <TableCell className='text-right'>
                        {template.composite_score
                          ? template.composite_score.toFixed(2)
                          : '-'}
                      </TableCell>
                      {columnConfig.exposure && (
                        <TableCell className='text-right'>
                          {formatNumber(template.exposure)}
                        </TableCell>
                      )}
                      {columnConfig.click && (
                        <TableCell className='text-right'>
                          {formatNumber(template.click)}
                        </TableCell>
                      )}
                      {columnConfig.creation && (
                        <TableCell className='text-right'>
                          {formatNumber(template.creation)}
                        </TableCell>
                      )}
                      {columnConfig.success && (
                        <TableCell className='text-right'>
                          {formatNumber(template.success)}
                        </TableCell>
                      )}
                      {columnConfig.sales && (
                        <TableCell className='text-right'>
                          {formatNumber(template.sales)}
                        </TableCell>
                      )}
                      {columnConfig.gmv && (
                        <TableCell className='text-right'>
                          {formatAmount(template.gmv)}
                        </TableCell>
                      )}
                      {columnConfig.creation_uv_value && (
                        <TableCell className='text-right'>
                          {template.creation_uv_value
                            ? `¥${template.creation_uv_value.toFixed(2)}`
                            : '-'}
                        </TableCell>
                      )}
                      {columnConfig.success_uv && (
                        <TableCell className='text-right'>
                          {formatNumber(template.success_uv)}
                        </TableCell>
                      )}
                      {columnConfig.success_uv_rate && (
                        <TableCell className='text-right'>
                          {(template.success_uv_rate * 100).toFixed(2)}%
                        </TableCell>
                      )}
                      {columnConfig.intercept_pv && (
                        <TableCell className='text-right'>
                          {formatNumber(template.intercept_pv)}
                        </TableCell>
                      )}
                      {columnConfig.intercept_uv && (
                        <TableCell className='text-right'>
                          {formatNumber(template.intercept_uv)}
                        </TableCell>
                      )}
                      {columnConfig.intercept_pv_rate && (
                        <TableCell className='text-right'>
                          {(template.intercept_pv_rate * 100).toFixed(2)}%
                        </TableCell>
                      )}
                      {columnConfig.intercept_uv_rate && (
                        <TableCell className='text-right'>
                          {(template.intercept_uv_rate * 100).toFixed(2)}%
                        </TableCell>
                      )}
                      {columnConfig.creation_order_uv_rate && (
                        <TableCell className='text-right'>
                          {(template.creation_order_uv_rate * 100).toFixed(2)}%
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
