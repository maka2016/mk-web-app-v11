'use client';

import { trpc } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
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
import { Switch } from '@workspace/ui/components/switch';
import { Textarea } from '@workspace/ui/components/textarea';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DEFAULT_RELAY_THEME, toRelayThemeJson } from '../type';

interface RelayConfigPanelProps {
  worksId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigChange?: () => void;
}

export default function RelayConfigPanel({
  worksId,
  open,
  onOpenChange,
  onConfigChange,
}: RelayConfigPanelProps) {
  const [saving, setSaving] = useState(false);

  // 配置数据
  const [configData, setConfigData] = useState<{
    config: any;
    relay_count: number;
    current_user_relayed: boolean;
  } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      if (!worksId) return;
      setLoadingConfig(true);
      try {
        const data = await trpc.relay.getConfig.query({ works_id: worksId });
        setConfigData(data);
      } catch (error: any) {
        console.error('Failed to load relay config:', error);
        toast.error('加载配置失败');
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
  }, [worksId]);

  const config = configData?.config;

  // 本地状态
  const [enabled, setEnabled] = useState(false);
  const [buttonText, setButtonText] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [shareDesc, setShareDesc] = useState('');
  const [showUserList, setShowUserList] = useState(true);
  const [listDisplayMode, setListDisplayMode] = useState<'horizontal' | 'grid'>(
    'horizontal'
  );
  const [maxRelayCount, setMaxRelayCount] = useState<number | null>(null);
  const [contentPrefix, setContentPrefix] = useState('我是第');
  const [contentSuffix, setContentSuffix] = useState('名接力者');
  const [enableMessage, setEnableMessage] = useState(false);
  const [messagePresets, setMessagePresets] = useState<string[]>(['加油！']);
  const [newPreset, setNewPreset] = useState('');

  // 同步配置到本地状态
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setButtonText(config.button_text || '');
      setShareTitle(config.share_title || '');
      setShareDesc(config.share_desc || '');
      setShowUserList(config.show_user_list);
      setListDisplayMode(
        (config.list_display_mode as 'horizontal' | 'grid') || 'horizontal'
      );
      setMaxRelayCount(config.max_relay_count);
      setContentPrefix(config.content_prefix ?? '我是第');
      setContentSuffix(config.content_suffix ?? '名接力者');
      setEnableMessage(config.enable_message || false);
      const presets = config.message_presets as string[] | null;
      setMessagePresets(presets && presets.length > 0 ? presets : ['加油！']);
    }
  }, [config]);

  // 添加预设词
  const handleAddPreset = () => {
    if (newPreset.trim() && !messagePresets.includes(newPreset.trim())) {
      setMessagePresets([...messagePresets, newPreset.trim()]);
      setNewPreset('');
    }
  };

  // 删除预设词
  const handleRemovePreset = (index: number) => {
    const newPresets = messagePresets.filter((_, i) => i !== index);
    // 如果删除后为空，保留默认值
    setMessagePresets(newPresets.length > 0 ? newPresets : ['加油！']);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 处理预设词：如果只有一个默认值且为空数组，保存空数组；否则保存实际值
      const presetsToSave =
        messagePresets.length === 1 && messagePresets[0] === '加油！'
          ? []
          : messagePresets;

      await trpc.relay.upsertConfig.mutate({
        works_id: worksId,
        enabled,
        button_text: buttonText || null,
        share_title: shareTitle || null,
        share_desc: shareDesc || null,
        show_user_list: showUserList,
        list_display_mode: listDisplayMode,
        max_relay_count: maxRelayCount || null,
        theme: toRelayThemeJson(DEFAULT_RELAY_THEME), // 默认主题，后续可以扩展主题配置
        content_prefix: contentPrefix || null,
        content_suffix: contentSuffix || null,
        enable_message: enableMessage,
        message_presets: presetsToSave.length > 0 ? presetsToSave : null,
      });

      toast.success('设置已保存');
      // 重新加载配置
      const data = await trpc.relay.getConfig.query({ works_id: worksId });
      setConfigData(data);
      onConfigChange?.();
      // 触发配置更新事件，通知所有 RelayComp 组件刷新
      window.dispatchEvent(
        new CustomEvent('relay-config-updated', {
          detail: { worksId },
        })
      );
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loadingConfig || (!configData && config === null)) {
    return null;
  }

  return (
    <ResponsiveDialog
      isOpen={open}
      onOpenChange={onOpenChange}
      title='接力设置'
      showCloseIcon={true}
    >
      <div className='relative flex flex-col h-full max-h-[80vh] overflow-hidden'>
        <div className='flex-1 overflow-y-auto min-h-0'>
          {/* Content */}
          <div className='px-4 py-4 flex flex-col gap-4'>
            {/* 启用接力 */}
            <div className='border border-gray-200 rounded-lg shadow-sm p-4 bg-white'>
              <div className='flex items-start justify-between mb-2'>
                <div className='flex-1'>
                  <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
                    启用接力功能
                  </div>
                  <div className='text-sm leading-5 text-black/60'>
                    允许用户参与接力并分享
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={setEnabled}
                  className='ml-4'
                />
              </div>
            </div>

            {enabled && (
              <>
                {/* 按钮设置 */}
                <div className='border border-gray-200 rounded-lg shadow-sm p-4 bg-white'>
                  <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
                    按钮设置
                  </div>
                  <div className='space-y-3'>
                    <div className='space-y-2'>
                      <Label htmlFor='button-text'>按钮文案</Label>
                      <Input
                        id='button-text'
                        variantSize='default'
                        placeholder='接力'
                        value={buttonText}
                        onChange={e => setButtonText(e.target.value)}
                      />
                      <div className='text-xs text-gray-500'>
                        留空则显示默认文案&quot;接力&quot;
                      </div>
                    </div>
                  </div>
                </div>

                {/* 内容设置 */}
                <div className='border border-gray-200 rounded-lg shadow-sm p-4 bg-white'>
                  <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
                    <span className='text-red-500 mr-1'>*</span>
                    内容设置
                  </div>
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <Input
                        id='content-prefix'
                        variantSize='default'
                        placeholder='我是第'
                        value={contentPrefix}
                        onChange={e => setContentPrefix(e.target.value)}
                        className='flex-1'
                      />
                      <span className='text-sm text-gray-600 whitespace-nowrap'>
                        {'{数量}'}
                      </span>
                      <Input
                        id='content-suffix'
                        variantSize='default'
                        placeholder='名接力者'
                        value={contentSuffix}
                        onChange={e => setContentSuffix(e.target.value)}
                        className='flex-1'
                      />
                    </div>
                    <div className='text-xs text-gray-500'>
                      中间的数量由系统自动统计并显示
                    </div>
                  </div>
                </div>

                {/* 分享设置 */}
                <div className='border border-gray-200 rounded-lg shadow-sm p-4 bg-white'>
                  <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
                    分享设置
                  </div>
                  <div className='space-y-3'>
                    <div className='space-y-2'>
                      <Label htmlFor='share-title'>分享标题</Label>
                      <Input
                        id='share-title'
                        variantSize='default'
                        placeholder='接力挑战 - 等你来接力'
                        value={shareTitle}
                        onChange={e => setShareTitle(e.target.value)}
                      />
                      <div className='text-xs text-gray-500'>
                        留空则使用默认标题
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='share-desc'>分享描述</Label>
                      <Textarea
                        id='share-desc'
                        placeholder='接力挑战，等你来参与'
                        value={shareDesc}
                        onChange={e => setShareDesc(e.target.value)}
                        rows={3}
                      />
                      <div className='text-xs text-gray-500'>
                        留空则使用默认描述
                      </div>
                    </div>
                  </div>
                </div>

                {/* 留言设置 */}
                <div className='border border-gray-200 rounded-lg shadow-sm p-4 bg-white'>
                  <div className='flex items-start justify-between mb-3'>
                    <div className='flex-1'>
                      <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
                        留言设置
                      </div>
                      <div className='text-sm leading-5 text-black/60'>
                        允许用户在接力时添加留言
                      </div>
                    </div>
                    <Switch
                      checked={enableMessage}
                      onCheckedChange={setEnableMessage}
                      className='ml-4'
                    />
                  </div>
                  {enableMessage && (
                    <div className='space-y-3 mt-3'>
                      <div className='space-y-2'>
                        <Label>预设词</Label>
                        <div className='flex flex-wrap gap-2 mb-2'>
                          {messagePresets.map((preset, index) => (
                            <Badge
                              key={index}
                              variant='outline'
                              className='flex items-center gap-1 pr-1'
                            >
                              {preset}
                              <X
                                className='h-3 w-3 cursor-pointer hover:text-destructive'
                                onClick={() => handleRemovePreset(index)}
                              />
                            </Badge>
                          ))}
                        </div>
                        <div className='flex gap-2'>
                          <Input
                            variantSize='default'
                            placeholder='输入预设词'
                            value={newPreset}
                            onChange={e => setNewPreset(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddPreset();
                              }
                            }}
                          />
                          <Button
                            type='button'
                            variant='outline'
                            size='default'
                            onClick={handleAddPreset}
                          >
                            <Plus className='h-4 w-4' />
                          </Button>
                        </div>
                        <div className='text-xs text-gray-500'>
                          用户可以在接力时快速选择预设词，也可以自定义输入
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 列表设置 */}
                <div className='border border-gray-200 rounded-lg shadow-sm p-4 bg-white'>
                  <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
                    列表设置
                  </div>
                  <div className='space-y-3'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='font-medium text-sm text-[#09090B] mb-1'>
                          显示用户列表
                        </div>
                        <div className='text-xs text-gray-500'>
                          在接力按钮上方显示已接力用户列表
                        </div>
                      </div>
                      <Switch
                        checked={showUserList}
                        onCheckedChange={setShowUserList}
                        className='ml-4'
                      />
                    </div>

                    {showUserList && (
                      <div className='space-y-2'>
                        <Label htmlFor='list-display-mode'>列表展示模式</Label>
                        <Select
                          value={listDisplayMode}
                          onValueChange={(value: 'horizontal' | 'grid') =>
                            setListDisplayMode(value)
                          }
                        >
                          <SelectTrigger id='list-display-mode'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='horizontal'>横向滚动</SelectItem>
                            <SelectItem value='grid'>网格布局</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 限制设置 */}
                <div className='border border-gray-200 rounded-lg shadow-sm p-4 bg-white'>
                  <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
                    限制设置
                  </div>
                  <div className='space-y-3'>
                    <div className='space-y-2'>
                      <Label htmlFor='max-relay-count'>最大接力人数</Label>
                      <Input
                        id='max-relay-count'
                        type='number'
                        variantSize='default'
                        placeholder='不限制'
                        value={maxRelayCount || ''}
                        onChange={e => {
                          const value = e.target.value;
                          setMaxRelayCount(
                            value === '' ? null : parseInt(value, 10) || null
                          );
                        }}
                        min={1}
                      />
                      <div className='text-xs text-gray-500'>
                        留空则不限制接力人数
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='sticky bottom-0 border-t border-black/10 bg-white px-4 py-3 flex justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button size='sm' onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
