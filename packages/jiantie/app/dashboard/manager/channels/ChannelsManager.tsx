import { trpcReact } from '@/utils/trpc';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { cn } from '@workspace/ui/lib/utils';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Edit,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  Wand2,
} from 'lucide-react';
import * as React from 'react';
import toast from 'react-hot-toast';

export interface ChannelsManagerProps {
  className?: string;
  title?: string;
  templatePoolTemplateIds?: string[];
  defaultFilterEnv?: 'production' | 'test' | 'dev';
  defaultFilterLocale?: 'all' | 'zh-CN' | 'en-US';
  defaultFilterClass?: 'all' | string;
  defaultFilterAppid?: 'all' | string;
}

interface Channel {
  id: number;
  alias: string;
  display_name: string;
  desc?: string | null;
  thumb_path?: string | null;
  class: string;
  locale: string;
  template_ids: string[];
  parent_id?: number | null;
  appid?: string | null;
  env: string;
  online: boolean;
  sort_weight: number;
  children?: Channel[];
  parent?: Channel | null;
}

interface TemplateItem {
  id: string;
  title: string;
  coverV3?: { url: string; width: number; height: number } | null;
}

const CHANNEL_CLASSES = [
  { value: 'level_1', label: '一级栏目' },
  { value: 'level_2', label: '二级频道' },
  { value: 'level_3', label: '三级热词' },
  { value: 'level_4', label: '四级标签' },
] as const;

function buildChannelTree(flat: Channel[]): Channel[] {
  const channelMap = new Map<number, Channel>();
  const roots: Channel[] = [];

  flat.forEach(channel => {
    channelMap.set(channel.id, { ...channel, children: [] });
  });

  flat.forEach(channel => {
    const node = channelMap.get(channel.id);
    if (!node) return;
    if (channel.parent_id && channelMap.has(channel.parent_id)) {
      const parent = channelMap.get(channel.parent_id)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortChannels = (channels: Channel[]): Channel[] => {
    return channels
      .sort((a, b) => b.sort_weight - a.sort_weight)
      .map(channel => ({
        ...channel,
        children: channel.children ? sortChannels(channel.children) : undefined,
      }));
  };

  return sortChannels(roots);
}

function flattenChannels(tree: Channel[]): Channel[] {
  const result: Channel[] = [];
  const walk = (nodes: Channel[]) => {
    nodes.forEach(n => {
      result.push(n);
      if (n.children && n.children.length > 0) walk(n.children);
    });
  };
  walk(tree);
  return result;
}

function toTemplateItems(input: unknown): TemplateItem[] {
  if (!Array.isArray(input)) return [];
  const items: TemplateItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;
    const id = obj.id;
    const title = obj.title;
    if (typeof id !== 'string' || typeof title !== 'string') continue;
    items.push({
      id,
      title,
      coverV3: (obj.coverV3 as { url: string; width: number; height: number } | null) || null,
    });
  }
  return items;
}

// 可拖拽排序项组件
function SortableChannelItem({ channel }: { channel: Channel }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 border rounded-lg bg-background',
        isDragging && 'shadow-lg ring-2 ring-primary/20'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className='flex-shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded'
      >
        <GripVertical className='h-4 w-4 text-muted-foreground' />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='font-medium text-sm truncate'>
          {channel.display_name}
        </div>
        <div className='text-xs text-muted-foreground truncate'>
          ID: {channel.id} · 权重: {channel.sort_weight}
          {!channel.online && ' · 已下线'}
        </div>
      </div>
    </div>
  );
}

export function ChannelsManager(props: ChannelsManagerProps) {
  const {
    className,
    title = '频道管理',
    templatePoolTemplateIds,
    defaultFilterEnv = 'production',
    defaultFilterLocale = 'all',
    defaultFilterClass = 'all',
    defaultFilterAppid = 'all',
  } = props;

  const utils = trpcReact.useContext();

  const [filterClass, setFilterClass] = React.useState<string>(defaultFilterClass);
  const [filterLocale, setFilterLocale] =
    React.useState<string>(defaultFilterLocale);
  const [filterEnv, setFilterEnv] =
    React.useState<'production' | 'test' | 'dev'>(defaultFilterEnv);
  const [filterAppid, setFilterAppid] = React.useState<string>(defaultFilterAppid);

  const channelsQuery = trpcReact.adminChannel.list.useQuery({
    class: filterClass === 'all' ? undefined : filterClass,
    locale: filterLocale === 'all' ? undefined : filterLocale,
    env: filterEnv,
    appid: filterAppid === 'all' ? undefined : filterAppid || undefined,
    include_children: true,
  });

  const appidsQuery = trpcReact.adminChannel.list.useQuery({
    env: filterEnv,
    include_children: true,
  });

  const channelsTree = React.useMemo(() => {
    const flat = (channelsQuery.data || []) as Channel[];
    return buildChannelTree(flat);
  }, [channelsQuery.data]);

  const channelsFlat = React.useMemo(() => flattenChannels(channelsTree), [channelsTree]);

  const availableAppids = React.useMemo(() => {
    const flat = (appidsQuery.data || []) as Channel[];
    const appidSet = new Set<string>();
    flat.forEach(ch => {
      if (ch.appid) appidSet.add(ch.appid);
    });
    return Array.from(appidSet).sort();
  }, [appidsQuery.data]);

  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());
  const [activeLevel4Id, setActiveLevel4Id] = React.useState<number | null>(null);

  const activeLevel4Channel = React.useMemo(() => {
    if (!activeLevel4Id) return null;
    return channelsFlat.find(c => c.id === activeLevel4Id) || null;
  }, [activeLevel4Id, channelsFlat]);

  // 频道编辑/创建
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingChannel, setEditingChannel] = React.useState<Channel | null>(null);
  const [formData, setFormData] = React.useState({
    alias: '',
    display_name: '',
    desc: '',
    thumb_path: '',
    class: 'level_1',
    locale: 'zh-CN',
    parent_id: null as number | null,
    appid: '',
    env: 'production',
    online: true,
    sort_weight: 0,
  });

  // 拖拽排序弹窗
  const [sortDialogOpen, setSortDialogOpen] = React.useState(false);
  const [sortingParentChannel, setSortingParentChannel] = React.useState<Channel | null>(null);
  const [sortingChannels, setSortingChannels] = React.useState<Channel[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenSortDialog = (channel: Channel) => {
    // 获取同级兄弟节点
    let siblings: Channel[];
    if (channel.parent_id) {
      const parent = channelsFlat.find(c => c.id === channel.parent_id);
      siblings = parent?.children || [];
    } else {
      // 顶级节点
      siblings = channelsTree;
    }
    // 保持当前排序（已按 sort_weight desc 排序）
    setSortingChannels([...siblings]);
    setSortingParentChannel(channel.parent_id ? channelsFlat.find(c => c.id === channel.parent_id) || null : null);
    setSortDialogOpen(true);
  };

  const handleSortDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSortingChannels(prev => {
      const oldIndex = prev.findIndex(c => c.id === active.id);
      const newIndex = prev.findIndex(c => c.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const batchUpdateSortWeightMutation = trpcReact.adminChannel.batchUpdateSortWeight.useMutation({
    onSuccess: () => {
      toast.success('排序保存成功');
      setSortDialogOpen(false);
      channelsQuery.refetch();
    },
    onError: (e: unknown) => {
      const err = e as { message?: string };
      toast.error(err?.message || '排序保存失败');
    },
  });

  const handleSaveSortOrder = () => {
    // 按顺序从高到低分配权重（列表第一个权重最高）
    const items = sortingChannels.map((ch, index) => ({
      id: ch.id,
      sort_weight: (sortingChannels.length - index) * 10,
    }));
    batchUpdateSortWeightMutation.mutate({ items });
  };

  const createChannelMutation = trpcReact.adminChannel.create.useMutation({
    onSuccess: () => {
      toast.success('创建成功');
      setEditDialogOpen(false);
      channelsQuery.refetch();
      appidsQuery.refetch();
    },
    onError: (e: any) => {
      toast.error(e?.message || '保存失败');
    },
  });

  const updateChannelMutation = trpcReact.adminChannel.update.useMutation({
    onSuccess: () => {
      toast.success('更新成功');
      setEditDialogOpen(false);
      channelsQuery.refetch();
      appidsQuery.refetch();
    },
    onError: (e: any) => {
      toast.error(e?.message || '保存失败');
    },
  });

  const handleCreate = (parentChannel?: Channel) => {
    setEditingChannel(null);

    // 根据父级分类确定子级分类
    let childClass = '一级栏目';
    if (parentChannel) {
      const parentClass = parentChannel.class;
      if (parentClass === 'level_1' || parentClass === '一级栏目') {
        childClass = '二级频道';
      } else if (parentClass === 'level_2' || parentClass === '二级频道') {
        childClass = '三级热词';
      } else if (parentClass === 'level_3' || parentClass === '三级热词') {
        childClass = '四级标签';
      }
    }

    setFormData({
      alias: '',
      display_name: '',
      desc: '',
      thumb_path: '',
      class: childClass,
      locale: 'zh-CN',
      parent_id: parentChannel?.id || null,
      appid: parentChannel?.appid || '',
      env: filterEnv,
      online: true,
      sort_weight: 0,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      alias: channel.alias,
      display_name: channel.display_name,
      desc: channel.desc || '',
      thumb_path: channel.thumb_path || '',
      class: channel.class,
      locale: channel.locale,
      parent_id: channel.parent_id || null,
      appid: channel.appid || '',
      env: channel.env,
      online: channel.online,
      sort_weight: channel.sort_weight,
    });
    setEditDialogOpen(true);
  };

  const handleSaveChannel = () => {
    if (!formData.alias.trim() || !formData.display_name.trim()) {
      toast.error('请填写频道别名和显示名称');
      return;
    }
    if (editingChannel) {
      updateChannelMutation.mutate({
        id: editingChannel.id,
        ...formData,
        parent_id: formData.parent_id || null,
      });
      return;
    }
    createChannelMutation.mutate({
      ...formData,
      template_ids: [],
      parent_id: formData.parent_id || undefined,
    } as any);
  };

  const generateAlias = () => {
    if (!formData.display_name.trim()) {
      toast.error('请先填写显示名称');
      return;
    }

    const getParentAliasChain = (parentId: number | null): string[] => {
      if (!parentId) return [];
      const parent = channelsFlat.find(c => c.id === parentId);
      if (!parent) return [];
      return [...getParentAliasChain(parent.parent_id ?? null), parent.id + '' + parent.display_name];
    };

    const parentChain = getParentAliasChain(formData.parent_id);
    const alias = [...parentChain, formData.display_name.trim()].join('-');
    setFormData(prev => ({ ...prev, alias }));
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 右侧：模板上架配置
  const fixedPoolEnabled = (templatePoolTemplateIds?.length ?? 0) > 0;
  const fixedPoolQuery = trpcReact.template.findManyByIds.useQuery(
    { template_ids: templatePoolTemplateIds ?? [] },
    { enabled: fixedPoolEnabled }
  );
  const fixedPoolTemplates = React.useMemo(
    () => toTemplateItems(fixedPoolQuery.data),
    [fixedPoolQuery.data]
  );

  const [selectedTemplateIds, setSelectedTemplateIds] = React.useState<string[]>([]);
  const [selectedTemplates, setSelectedTemplates] = React.useState<TemplateItem[]>([]);
  const [selectedTemplatesLoading, setSelectedTemplatesLoading] = React.useState(false);

  const [templateSearchKeyword, setTemplateSearchKeyword] = React.useState('');
  const [templateFilterChannelId, setTemplateFilterChannelId] = React.useState<number | null>(null);
  const [templatePage, setTemplatePage] = React.useState(1);
  const [templates, setTemplates] = React.useState<TemplateItem[]>([]);
  const [templateTotal, setTemplateTotal] = React.useState(0);
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [batchSelectedTemplateIds, setBatchSelectedTemplateIds] = React.useState<Set<string>>(new Set());

  const loadSelectedTemplates = React.useCallback(
    async (channel: Channel) => {
      setSelectedTemplatesLoading(true);
      try {
        const ids = channel.template_ids || [];
        if (!ids || ids.length === 0) {
          setSelectedTemplateIds([]);
          setSelectedTemplates([]);
          return;
        }
        const data = await utils.template.findManyByIds.fetch({
          template_ids: ids,
        });
        setSelectedTemplateIds([...ids]);
        setSelectedTemplates(toTemplateItems(data));
      } catch (e: any) {
        toast.error(e?.message || '加载已添加模板失败');
      } finally {
        setSelectedTemplatesLoading(false);
      }
    },
    [utils.template.findManyByIds]
  );

  const loadTemplates = React.useCallback(
    async (page: number, keyword?: string) => {
      if (fixedPoolEnabled) return;
      setTemplateLoading(true);
      try {
        const result = await utils.adminChannel.getTemplates.fetch({
          keyword: keyword !== undefined ? keyword : templateSearchKeyword || undefined,
          channel_id: templateFilterChannelId || undefined,
          skip: (page - 1) * 20,
          take: 20,
        });
        if (page === 1) {
          setTemplates(result.templates as any);
          setBatchSelectedTemplateIds(new Set());
        } else {
          setTemplates(prev => [...prev, ...(result.templates as any)]);
        }
        setTemplateTotal(result.total);
      } catch (e: any) {
        toast.error(e?.message || '加载模板失败');
      } finally {
        setTemplateLoading(false);
      }
    },
    [
      fixedPoolEnabled,
      templateFilterChannelId,
      templateSearchKeyword,
      utils.adminChannel.getTemplates,
    ]
  );

  React.useEffect(() => {
    if (!activeLevel4Channel) return;
    if (activeLevel4Channel.class !== 'level_4' && activeLevel4Channel.class !== '四级标签') {
      return;
    }
    // 切换频道时：保留旧数据显示 loading，加载完成后更新
    loadSelectedTemplates(activeLevel4Channel);
    setTemplateSearchKeyword('');
    setTemplatePage(1);
    setTemplateFilterChannelId(null);
    setBatchSelectedTemplateIds(new Set());
    if (!fixedPoolEnabled) {
      setTemplates([]);
      loadTemplates(1, '');
    }
  }, [activeLevel4Channel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const visiblePoolTemplates = React.useMemo(() => {
    const pool = fixedPoolEnabled ? fixedPoolTemplates : templates;
    if (!templateSearchKeyword.trim()) return pool;
    const kw = templateSearchKeyword.trim().toLowerCase();
    return pool.filter(t => t.id.toLowerCase().includes(kw) || t.title.toLowerCase().includes(kw));
  }, [fixedPoolEnabled, fixedPoolTemplates, templates, templateSearchKeyword]);

  const addTemplate = (template: TemplateItem) => {
    if (selectedTemplateIds.includes(template.id)) return;
    setSelectedTemplateIds(prev => [...prev, template.id]);
    setSelectedTemplates(prev => [...prev, template]);
  };

  const removeTemplate = (templateId: string) => {
    setSelectedTemplateIds(prev => prev.filter(id => id !== templateId));
    setSelectedTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  const toggleBatchSelect = (templateId: string) => {
    setBatchSelectedTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const available = visiblePoolTemplates.filter(t => !selectedTemplateIds.includes(t.id));
    if (available.length === 0) return;
    const allSelected = available.every(t => batchSelectedTemplateIds.has(t.id));
    if (allSelected) {
      setBatchSelectedTemplateIds(prev => {
        const next = new Set(prev);
        available.forEach(t => next.delete(t.id));
        return next;
      });
    } else {
      setBatchSelectedTemplateIds(prev => {
        const next = new Set(prev);
        available.forEach(t => next.add(t.id));
        return next;
      });
    }
  };

  const handleBatchAddTemplates = () => {
    const newIds = Array.from(batchSelectedTemplateIds).filter(id => !selectedTemplateIds.includes(id));
    if (newIds.length === 0) {
      toast.error('请先选择要添加的模板');
      return;
    }
    const pool = fixedPoolEnabled ? fixedPoolTemplates : templates;
    const newTemplates = pool.filter(t => newIds.includes(t.id));
    setSelectedTemplateIds(prev => [...prev, ...newIds]);
    setSelectedTemplates(prev => [...prev, ...newTemplates]);
    setBatchSelectedTemplateIds(new Set());
    toast.success(`已添加 ${newIds.length} 个模板`);
  };

  const updateTemplateIdsMutation = trpcReact.adminChannel.updateTemplateIds.useMutation({
    onSuccess: () => {
      toast.success('保存成功');
      channelsQuery.refetch();
    },
    onError: (e: any) => {
      toast.error(e?.message || '保存失败');
    },
  });

  const handleSaveTemplates = () => {
    if (!activeLevel4Channel) {
      toast.error('请先选择4级频道');
      return;
    }
    updateTemplateIdsMutation.mutate({
      id: activeLevel4Channel.id,
      template_ids: selectedTemplateIds,
    });
  };

  const handleSearchTemplates = () => {
    if (fixedPoolEnabled) return;
    setTemplatePage(1);
    setTemplates([]);
    loadTemplates(1, templateSearchKeyword);
  };

  const handleFilterChannelChange = (value: string) => {
    if (fixedPoolEnabled) return;
    if (value === 'all') setTemplateFilterChannelId(null);
    else setTemplateFilterChannelId(Number(value));
    setTemplatePage(1);
    setTemplates([]);
    setBatchSelectedTemplateIds(new Set());
    setTimeout(() => {
      loadTemplates(1, templateSearchKeyword);
    }, 0);
  };

  const handleLoadMore = () => {
    if (fixedPoolEnabled) return;
    const nextPage = templatePage + 1;
    setTemplatePage(nextPage);
    loadTemplates(nextPage, templateSearchKeyword);
  };

  const filterableChannels = React.useMemo(() => {
    const result: Channel[] = [];
    const walk = (nodes: Channel[]) => {
      nodes.forEach(channel => {
        const isLevel234 =
          channel.class === 'level_2' ||
          channel.class === '二级频道' ||
          channel.class === 'level_3' ||
          channel.class === '三级热词' ||
          channel.class === 'level_4' ||
          channel.class === '四级标签';
        if (isLevel234) result.push(channel);
        if (channel.children && channel.children.length > 0) walk(channel.children);
      });
    };
    walk(channelsTree);
    return result;
  }, [channelsTree]);

  const renderChannelNode = (channel: Channel, depth = 0) => {
    const hasChildren = !!(channel.children && channel.children.length > 0);
    const isExpanded = expandedIds.has(channel.id);
    const isLevel4 = channel.class === 'level_4' || channel.class === '四级标签';
    const isActive = isLevel4 && activeLevel4Id === channel.id;

    return (
      <div key={channel.id} className='select-none'>
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-2 rounded cursor-pointer border border-transparent',
            isActive ? 'bg-primary/10 border-primary/20' : 'hover:bg-muted/50'
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (isLevel4) {
              setActiveLevel4Id(channel.id);
              return;
            }
            if (hasChildren) toggleExpand(channel.id);
          }}
        >
          <div className='flex items-center gap-1 flex-1 min-w-0'>
            {hasChildren ? (
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(channel.id);
                }}
                className='p-1 hover:bg-muted rounded'
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <div className='w-6' />
            )}

            <span className='font-medium truncate'>{channel.display_name}</span>
            <span className='text-xs text-muted-foreground whitespace-nowrap'>
              {channel.id}
            </span>
            {/* <span className='text-xs text-muted-foreground truncate'>
              ({channel.alias})
            </span>
            <span className='text-xs text-muted-foreground whitespace-nowrap'>
              [
              {CHANNEL_CLASSES.find(c => c.value === channel.class)?.label ||
                channel.class}
              ]
            </span> */}
            {!channel.online && (
              <span className='text-xs text-destructive whitespace-nowrap'>[已下线]</span>
            )}
            {isLevel4 && (
              <span className='text-xs text-primary whitespace-nowrap'>
                [模板:{channel.template_ids.length}]
              </span>
            )}
          </div>

          <div className='flex items-center gap-1 flex-shrink-0'>
            {!isLevel4 && (
              <Button
                size='xs'
                variant='ghost'
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreate(channel);
                }}
              >
                <Plus size={12} />
              </Button>
            )}
            <Button
              size='xs'
              variant='ghost'
              className='h-6 w-6 p-0'
              onClick={(e) => {
                e.stopPropagation();
                handleOpenSortDialog(channel);
              }}
              title='同级排序'
            >
              <ArrowUpDown size={12} />
            </Button>
            <Button
              size='xs'
              variant='ghost'
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(channel);
              }}
            >
              <Edit size={12} />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {channel.children!.map(child => renderChannelNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const allChannelsForParent = React.useMemo(() => {
    return channelsFlat.filter(
      c =>
        c.id !== editingChannel?.id &&
        (c.class === 'level_1' ||
          c.class === '一级栏目' ||
          c.class === 'level_2' ||
          c.class === '二级频道' ||
          c.class === 'level_3' ||
          c.class === '三级热词')
    );
  }, [channelsFlat, editingChannel?.id]);

  return (
    <div className={cn('grid grid-cols-12 gap-4 h-full', className)}>
      {/* 左：频道树 */}
      <Card className='col-span-4 flex flex-col overflow-hidden'>
        <CardHeader className='flex-shrink-0'>
          <div className='flex items-center justify-between gap-2'>
            <CardTitle>{title}</CardTitle>
            <Button onClick={(e) => {
              e.stopPropagation();
              handleCreate();
            }}>
              <Plus size={16} className='mr-2' />
              新建频道
            </Button>
          </div>
        </CardHeader>
        <CardContent className='flex-1 overflow-hidden'>
          <div className='flex flex-col gap-3 h-full'>
            {/* 筛选 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>
                  频道分类
                </Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className='h-9 w-[140px]'>
                    <SelectValue placeholder='全部' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    {CHANNEL_CLASSES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>语言</Label>
                <Select value={filterLocale} onValueChange={setFilterLocale}>
                  <SelectTrigger className='h-9 w-[120px]'>
                    <SelectValue placeholder='全部' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    <SelectItem value='zh-CN'>中文</SelectItem>
                    <SelectItem value='en-US'>英文</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>环境</Label>
                <Select
                  value={filterEnv}
                  onValueChange={v => setFilterEnv(v as any)}
                >
                  <SelectTrigger className='h-9 w-[120px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='production'>生产</SelectItem>
                    <SelectItem value='test'>测试</SelectItem>
                    <SelectItem value='dev'>开发</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>
                  应用ID
                </Label>
                <Select value={filterAppid} onValueChange={setFilterAppid}>
                  <SelectTrigger className='h-9 w-[140px]'>
                    <SelectValue placeholder='全部' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    {availableAppids.map(appid => (
                      <SelectItem key={appid} value={appid}>
                        {appid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 树 */}
            <div className='flex-1 overflow-auto border rounded-lg p-2'>
              {channelsQuery.isLoading && channelsTree.length === 0 ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='animate-spin' size={24} />
                </div>
              ) : channelsTree.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  暂无频道数据
                </div>
              ) : (
                <div className='space-y-1'>
                  {channelsTree.map(channel => renderChannelNode(channel))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 右：模板上架 */}
      <Card className='col-span-8 flex flex-col overflow-hidden'>
        <CardHeader className='flex-shrink-0'>
          <div className='flex items-center justify-between'>
            <CardTitle>配置模板上架</CardTitle>
            {activeLevel4Channel ? (
              <div className='text-sm text-muted-foreground'>
                当前频道：{activeLevel4Channel.display_name}（{activeLevel4Channel.alias}）
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className='flex-1 overflow-hidden'>
          {!activeLevel4Channel ? (
            <div className='h-full flex items-center justify-center text-sm text-muted-foreground'>
              请在左侧选择一个 4 级频道进行模板上架配置
            </div>
          ) : activeLevel4Channel.class !== 'level_4' &&
            activeLevel4Channel.class !== '四级标签' ? (
            <div className='h-full flex items-center justify-center text-sm text-muted-foreground'>
              只能对 4 级频道配置模板
            </div>
          ) : (
            <div className='h-full flex flex-col overflow-hidden'>
              <div className='grid grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden'>
                {/* 已添加 */}
                <div className='flex flex-col border rounded-lg overflow-hidden min-h-0'>
                  <div className='px-4 py-3 border-b bg-muted/30 flex-shrink-0'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-base font-semibold'>
                        已添加的模板 ({selectedTemplateIds.length})
                      </Label>
                      {selectedTemplatesLoading && (
                        <span className='text-xs text-muted-foreground'>
                          切换频道加载中...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className='flex-1 overflow-y-auto p-4 min-h-0'>
                    {selectedTemplatesLoading && selectedTemplates.length === 0 ? (
                      <div className='flex items-center justify-center py-8'>
                        <Loader2 className='animate-spin' size={24} />
                      </div>
                    ) : selectedTemplates.length === 0 ? (
                      <div className='text-center py-8 text-muted-foreground'>
                        暂无已添加的模板
                      </div>
                    ) : (
                      <div className='space-y-1.5'>
                        {selectedTemplates.map(template => {
                          const coverUrl = template.coverV3?.url || '';
                          return (
                            <div
                              key={template.id}
                              className='flex items-center gap-2 p-2 border rounded hover:bg-muted/50'
                            >
                              {coverUrl && (
                                <img
                                  src={coverUrl}
                                  alt={template.title}
                                  className='w-12 h-12 object-cover rounded flex-shrink-0'
                                />
                              )}
                              <div className='flex-1 min-w-0'>
                                <div className='text-sm font-medium truncate'>
                                  {template.title}
                                </div>
                                <div className='text-xs text-muted-foreground truncate'>
                                  ID: {template.id}
                                </div>
                              </div>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => removeTemplate(template.id)}
                                className='flex-shrink-0 h-7 w-7 p-0'
                                disabled={selectedTemplatesLoading}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 模板池 */}
                <div className='flex flex-col border rounded-lg overflow-hidden min-h-0'>
                  <div className='px-4 py-3 border-b bg-muted/30 flex-shrink-0'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-base font-semibold'>模板池</Label>
                      {batchSelectedTemplateIds.size > 0 && (
                        <Button
                          size='sm'
                          onClick={handleBatchAddTemplates}
                          className='h-7'
                          disabled={selectedTemplatesLoading}
                        >
                          批量添加 ({batchSelectedTemplateIds.size})
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className='p-4 border-b flex-shrink-0 space-y-2'>
                    <div className='flex gap-2'>
                      <Input
                        value={templateSearchKeyword}
                        onChange={e => setTemplateSearchKeyword(e.target.value)}
                        placeholder='输入模板ID或标题搜索'
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if (!fixedPoolEnabled) {
                              handleSearchTemplates();
                            }
                          }
                        }}
                        disabled={selectedTemplatesLoading}
                      />
                      {fixedPoolEnabled ? (
                        <Button
                          variant='outline'
                          onClick={() => setTemplateSearchKeyword('')}
                          disabled={!templateSearchKeyword || selectedTemplatesLoading}
                        >
                          清空
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSearchTemplates}
                          disabled={templateLoading || selectedTemplatesLoading}
                        >
                          搜索
                        </Button>
                      )}
                    </div>

                    {!fixedPoolEnabled && (
                      <div className='flex items-center gap-2'>
                        <Label className='text-sm min-w-[80px]'>频道筛选</Label>
                        <Select
                          value={templateFilterChannelId?.toString() || 'all'}
                          onValueChange={handleFilterChannelChange}
                          disabled={selectedTemplatesLoading}
                        >
                          <SelectTrigger className='h-9 flex-1'>
                            <SelectValue placeholder='全部频道' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='all'>全部频道</SelectItem>
                            {filterableChannels.map(channel => (
                              <SelectItem
                                key={channel.id}
                                value={channel.id.toString()}
                              >
                                {channel.display_name} ({channel.alias}) [
                                {CHANNEL_CLASSES.find(c => c.value === channel.class)
                                  ?.label || channel.class}
                                ]
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className='flex-1 overflow-y-auto p-4 min-h-0'>
                    {fixedPoolEnabled && fixedPoolQuery.isLoading && fixedPoolTemplates.length === 0 ? (
                      <div className='flex items-center justify-center py-8'>
                        <Loader2 className='animate-spin' size={24} />
                      </div>
                    ) : !fixedPoolEnabled && templateLoading && templates.length === 0 ? (
                      <div className='flex items-center justify-center py-8'>
                        <Loader2 className='animate-spin' size={24} />
                      </div>
                    ) : visiblePoolTemplates.length === 0 ? (
                      <div className='text-center py-8 text-muted-foreground'>
                        暂无模板
                      </div>
                    ) : (
                      <div className='space-y-1.5'>
                        {/* 全选按钮 */}
                        {visiblePoolTemplates.filter(t => !selectedTemplateIds.includes(t.id)).length > 0 && (
                          <div className='flex items-center gap-2 p-2 border-b'>
                            <input
                              type='checkbox'
                              checked={
                                visiblePoolTemplates
                                  .filter(t => !selectedTemplateIds.includes(t.id))
                                  .every(t => batchSelectedTemplateIds.has(t.id)) &&
                                visiblePoolTemplates.filter(t => !selectedTemplateIds.includes(t.id)).length > 0
                              }
                              onChange={toggleSelectAll}
                              className='w-4 h-4 cursor-pointer'
                              disabled={selectedTemplatesLoading}
                            />
                            <Label
                              className='text-sm cursor-pointer'
                              onClick={toggleSelectAll}
                            >
                              全选当前页
                            </Label>
                            {batchSelectedTemplateIds.size > 0 && (
                              <span className='text-xs text-muted-foreground'>
                                已选择 {batchSelectedTemplateIds.size} 个
                              </span>
                            )}
                          </div>
                        )}

                        {visiblePoolTemplates
                          .filter(t => !selectedTemplateIds.includes(t.id))
                          .map(template => {
                            const coverUrl = template.coverV3?.url || '';
                            const isBatchSelected = batchSelectedTemplateIds.has(template.id);
                            return (
                              <div
                                key={template.id}
                                className={cn(
                                  'flex items-center gap-2 p-2 border rounded hover:bg-muted/50',
                                  isBatchSelected ? 'bg-primary/5 border-primary/30' : ''
                                )}
                              >
                                <input
                                  type='checkbox'
                                  checked={isBatchSelected}
                                  onChange={() => toggleBatchSelect(template.id)}
                                  className='w-4 h-4 cursor-pointer flex-shrink-0'
                                  disabled={selectedTemplatesLoading}
                                />
                                {coverUrl && (
                                  <img
                                    src={coverUrl}
                                    alt={template.title}
                                    className='w-12 h-12 object-cover rounded flex-shrink-0'
                                  />
                                )}
                                <div className='flex-1 min-w-0'>
                                  <div className='text-sm font-medium truncate'>
                                    {template.title}
                                  </div>
                                  <div className='text-xs text-muted-foreground truncate'>
                                    ID: {template.id}
                                  </div>
                                </div>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => addTemplate(template)}
                                  className='flex-shrink-0 h-7 w-7 p-0'
                                  disabled={selectedTemplatesLoading}
                                >
                                  <Plus size={12} />
                                </Button>
                              </div>
                            );
                          })}

                        {!fixedPoolEnabled && templates.length < templateTotal && (
                          <Button
                            variant='outline'
                            className='w-full'
                            onClick={handleLoadMore}
                            disabled={templateLoading || selectedTemplatesLoading}
                          >
                            {templateLoading ? (
                              <Loader2 className='animate-spin mr-2' size={16} />
                            ) : null}
                            加载更多 ({templates.length}/{templateTotal})
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className='flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0'>
                <Button
                  variant='outline'
                  onClick={() => {
                    if (!activeLevel4Channel) return;
                    // 重新加载当前频道模板（回滚未保存更改）
                    loadSelectedTemplates(activeLevel4Channel);
                  }}
                  disabled={selectedTemplatesLoading || updateTemplateIdsMutation.isPending}
                >
                  重置
                </Button>
                <Button
                  onClick={handleSaveTemplates}
                  disabled={selectedTemplatesLoading || updateTemplateIdsMutation.isPending}
                >
                  {updateTemplateIdsMutation.isPending ? (
                    <>
                      <Loader2 className='animate-spin mr-2' size={16} />
                      保存中...
                    </>
                  ) : (
                    '保存'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑/创建对话框 */}
      <ResponsiveDialog
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title={editingChannel ? '编辑频道' : '新建频道'}
        isDialog
        contentProps={{
          className: 'max-w-[600px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div>
            <Label>频道别名 *</Label>
            <div className='flex gap-2'>
              <Input
                className='flex-1'
                value={formData.alias}
                onChange={e => setFormData({ ...formData, alias: e.target.value })}
                placeholder='唯一标识，用于URL等场景'
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={generateAlias}
                title='自动生成：父级alias-显示名称'
              >
                <Wand2 size={14} className='mr-1' />
                自动生成
              </Button>
            </div>
          </div>
          <div>
            <Label>显示名称 *</Label>
            <Input
              value={formData.display_name}
              onChange={e =>
                setFormData({ ...formData, display_name: e.target.value })
              }
              placeholder='频道显示名称'
            />
          </div>
          <div>
            <Label>描述</Label>
            <Input
              value={formData.desc}
              onChange={e => setFormData({ ...formData, desc: e.target.value })}
              placeholder='频道描述'
            />
          </div>
          <div>
            <Label>缩略图URL</Label>
            <Input
              value={formData.thumb_path}
              onChange={e =>
                setFormData({ ...formData, thumb_path: e.target.value })
              }
              placeholder='频道缩略图URL'
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>频道分类 *</Label>
              <Select
                value={formData.class}
                onValueChange={value => setFormData({ ...formData, class: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_CLASSES.map(c => (
                    <SelectItem key={c.value} value={c.label}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>语言 *</Label>
              <Select
                value={formData.locale}
                onValueChange={value => setFormData({ ...formData, locale: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='zh-CN'>中文</SelectItem>
                  <SelectItem value='en-US'>英文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>父频道</Label>
            <Select
              value={formData.parent_id?.toString() || 'none'}
              onValueChange={value =>
                setFormData({
                  ...formData,
                  parent_id: value === 'none' ? null : Number(value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='无（顶级频道）' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>无（顶级频道）</SelectItem>
                {allChannelsForParent.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.display_name} ({c.alias})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>应用ID</Label>
              <Input
                value={formData.appid}
                onChange={e => setFormData({ ...formData, appid: e.target.value })}
                placeholder='应用ID（可选）'
              />
            </div>
            <div>
              <Label>环境</Label>
              <Select
                value={formData.env}
                onValueChange={value => setFormData({ ...formData, env: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='production'>生产</SelectItem>
                  <SelectItem value='test'>测试</SelectItem>
                  <SelectItem value='dev'>开发</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>排序权重</Label>
              <Input
                type='number'
                value={formData.sort_weight}
                onChange={e =>
                  setFormData({
                    ...formData,
                    sort_weight: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className='flex items-center gap-2 pt-8'>
              <input
                type='checkbox'
                id='online'
                checked={formData.online}
                onChange={e =>
                  setFormData({ ...formData, online: e.target.checked })
                }
                className='w-4 h-4'
              />
              <Label htmlFor='online'>上线</Label>
            </div>
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button variant='outline' onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveChannel}
              disabled={createChannelMutation.isPending || updateChannelMutation.isPending}
            >
              {createChannelMutation.isPending || updateChannelMutation.isPending ? (
                <>
                  <Loader2 className='animate-spin mr-2' size={16} />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 拖拽排序弹窗 */}
      <ResponsiveDialog
        isOpen={sortDialogOpen}
        onOpenChange={setSortDialogOpen}
        title={
          sortingParentChannel
            ? `排序「${sortingParentChannel.display_name}」的子频道`
            : '排序顶级频道'
        }
        description='拖拽调整同级频道的排序，从上到下权重递减'
        isDialog
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='p-4 space-y-4'>
          {sortingChannels.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              没有可排序的频道
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSortDragEnd}
            >
              <SortableContext
                items={sortingChannels.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='space-y-2 max-h-[60vh] overflow-y-auto'>
                  {sortingChannels.map(channel => (
                    <SortableChannelItem
                      key={channel.id}
                      channel={channel}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <div className='flex justify-end gap-2 pt-2 border-t'>
            <Button variant='outline' onClick={() => setSortDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveSortOrder}
              disabled={batchUpdateSortWeightMutation.isPending || sortingChannels.length === 0}
            >
              {batchUpdateSortWeightMutation.isPending ? (
                <>
                  <Loader2 className='animate-spin mr-2' size={16} />
                  保存中...
                </>
              ) : (
                '保存排序'
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
