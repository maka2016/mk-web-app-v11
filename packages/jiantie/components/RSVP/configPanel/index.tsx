'use client';
import { BtnLite } from '@/components/GridV3/shared/style-comps';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Switch } from '@workspace/ui/components/switch';
import cls from 'classnames';
import {
  ArrowLeft,
  CheckSquare2,
  Circle,
  GripVertical,
  Lightbulb,
  Pencil,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useRSVP } from '../RSVPContext';
import { FieldType, RSVPAttrs, RSVPField, RSVPFieldOption } from '../type';

interface BaseProps {
  attrs: RSVPAttrs;
  editorSDK?: EditorSDK;
  layer: LayerElemItem;
}

export default function RSVPConfigPanelTrigger({
  attrs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  editorSDK,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  layer,
}: BaseProps) {
  return (
    <>
      <BtnLite
        title='回执设置'
        onClick={() => {
          const trigger = document.getElementById(
            `hidden_trigger_for_rsvp_config_panel_${attrs.formConfigId}`
          );
          if (trigger) {
            trigger.click();
          }
        }}
      >
        <Icon name='form-fill' size={20} />
        <span>回执设置</span>
      </BtnLite>
    </>
  );
}

const fieldTypes = [
  { label: '文本', value: 'text' as FieldType, icon: Pencil },
  { label: '单选', value: 'radio' as FieldType, icon: Circle },
  { label: '多选', value: 'checkbox' as FieldType, icon: CheckSquare2 },
  { label: '出席人数', value: 'guest_count' as FieldType },
];

export function RSVPConfigPanel({ onClose }: { onClose?: () => void }) {
  const rsvp = useRSVP();
  const router = useRouter();
  const {
    config,
    title,
    fields,
    error,
    setTitle,
    setConfig,
    setFields,
    handleSave,
  } = rsvp;

  const [saving, setSaving] = useState<boolean>(false);
  const [showFieldEditor, setShowFieldEditor] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<RSVPField | null>(null);
  const [collectForm, setCollectForm] = useState<boolean>(
    config?.collect_form ?? fields.length > 0
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null);
  const fieldRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 同步 collectForm 状态与 config.collect_form
  useEffect(() => {
    if (config?.collect_form !== undefined) {
      setCollectForm(config.collect_form);
    } else if (fields.length > 0) {
      setCollectForm(true);
    }
  }, [config?.collect_form, fields.length]);

  if (!config) {
    return (
      <div className='w-full py-4 text-center text-sm text-gray-500'>
        配置加载中...
      </div>
    );
  }

  const addField = () => {
    setEditingField({
      id: '',
      type: 'text',
      label: '未命名字段',
      required: false,
      placeholder: '',
    });
    setShowFieldEditor(true);
  };

  // 系统字段不允许删除，保留此函数以备将来使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removeField = (id: string) => {
    // 系统字段不允许删除
    const field = fields.find(f => f.id === id);
    if (field?.isSystem) {
      return;
    }
    setFields(fields.filter((f: RSVPField) => f.id !== id));
  };

  const updateField = (id: string, patch: Partial<RSVPField>) => {
    setFields(
      fields.map((f: RSVPField) => {
        if (f.id === id) {
          // 系统字段的 isSystem 属性不能被修改
          const updated = { ...f, ...patch };
          if (f.isSystem) {
            updated.isSystem = true;
          }
          return updated;
        }
        return f;
      })
    );
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newFields = [...fields];
    const draggedField = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(dropIndex, 0, draggedField);
    setFields(newFields);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartY(null);
    setTouchCurrentY(null);
  };

  // 移动端触摸拖拽处理
  const handleTouchStart = (index: number, y: number) => {
    setDraggedIndex(index);
    setTouchStartY(y);
    setTouchCurrentY(y);
  };

  const handleTouchMove = (y: number) => {
    if (draggedIndex === null || touchStartY === null) return;
    setTouchCurrentY(y);

    // 计算当前触摸位置对应的索引
    const fieldElements = Array.from(fieldRefs.current.entries());
    let targetIndex = draggedIndex;

    // 按索引排序
    fieldElements.sort((a, b) => a[0] - b[0]);

    // 遍历所有字段元素，找到触摸位置对应的目标索引
    for (let i = 0; i < fieldElements.length; i++) {
      const [idx, element] = fieldElements[i];
      if (!element || idx === draggedIndex) continue;

      const rect = element.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;

      // 如果触摸位置在当前元素的上半部分，则插入到该元素之前
      if (y >= rect.top && y < centerY) {
        targetIndex = idx;
        break;
      }
      // 如果触摸位置在当前元素的下半部分，则插入到该元素之后
      if (y >= centerY && y <= rect.bottom) {
        targetIndex = idx + 1;
      }
    }

    // 边界处理
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= fields.length) targetIndex = fields.length - 1;

    // 如果目标索引等于拖拽索引，则不需要更新
    if (targetIndex === draggedIndex) {
      setDragOverIndex(null);
      return;
    }

    if (targetIndex !== dragOverIndex) {
      setDragOverIndex(targetIndex);
    }
  };

  const handleTouchEnd = () => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      const newFields = [...fields];
      const draggedField = newFields[draggedIndex];
      newFields.splice(draggedIndex, 1);

      // 调整插入位置（如果拖拽向下，需要减1）
      const insertIndex =
        dragOverIndex > draggedIndex ? dragOverIndex - 1 : dragOverIndex;
      newFields.splice(insertIndex, 0, draggedField);
      setFields(newFields);
    }
    handleDragEnd();
  };

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      // collect_form 已在开关切换时同步到 config，直接保存即可
      await handleSave();
    } catch {
      // 错误已在 Context 中处理
    } finally {
      setSaving(false);
      onClose?.();
    }
  };

  return (
    <div className='relative flex flex-col h-full max-h-screen overflow-hidden'>
      {/* 顶部导航栏 - 移动端风格 */}
      <div className='px-4 py-2 border-b border-black/[0.06] flex items-center justify-between bg-white flex-shrink-0 z-10'>
        <button
          onClick={() => {
            onClose?.();
          }}
          className='flex items-center gap-1 text-[#09090B]'
        >
          <ArrowLeft size={20} />
          <span className='text-sm'>返回</span>
        </button>
        <div className='flex items-center gap-2 flex-1 justify-center'>
          <span className='font-semibold text-lg leading-[26px] text-[#09090B]'>
            回执设置
          </span>
        </div>
        <Button
          onClick={handleSaveClick}
          disabled={saving}
          size='sm'
          className='bg-[#09090B] text-white hover:bg-[#09090B]/90 h-8 px-4'
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='px-4 py-4 flex flex-col gap-4'>
          {error ? <div className='text-red-500 text-sm'>{error}</div> : null}

          {/* Enable RSVP */}
          <div className='border-b border-black/[0.1] py-3'>
            <div className='flex items-start justify-between mb-2'>
              <div className='flex-1'>
                <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
                  启用回执
                </div>
                <div className='text-sm leading-5 text-black/60'>
                  允许访客在线回复是否出席
                </div>
              </div>
              <Switch
                checked={config.enabled ?? true}
                onCheckedChange={checked =>
                  setConfig({ ...config, enabled: checked })
                }
                className='ml-4'
              />
            </div>
          </div>

          {/* Collect form information */}
          <div className='border-b border-black/[0.1] py-4'>
            <div className='flex items-start justify-between mb-4'>
              <div className='flex-1'>
                <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
                  收集宾客信息
                </div>
                <div className='text-sm leading-5 text-black/60'>
                  向访客/宾客收集联系方式和相关信息
                </div>
              </div>
              <Switch
                checked={collectForm}
                onCheckedChange={checked => {
                  setCollectForm(checked);
                  // 立即同步到 config，确保状态一致
                  setConfig({
                    ...config,
                    collect_form: checked,
                  });
                }}
                className='ml-4'
              />
            </div>

            {/* 当收集表单开关打开时，显示字段列表 */}
            {collectForm && (
              <>
                <div className='flex items-center justify-between mb-3'>
                  <div className='font-semibold text-base leading-6 text-[#09090B]'>
                    表单字段
                  </div>
                  <button
                    onClick={addField}
                    className='text-[#3358D4] text-sm font-semibold hover:underline'
                  >
                    + 添加自定义
                  </button>
                </div>

                {/* 提示框 */}
                <div className='bg-[#E6F0FF] border border-[#B3D9FF] rounded-lg p-3 mb-3 flex items-start gap-2'>
                  <Lightbulb
                    size={16}
                    className='text-[#3358D4] mt-0.5 flex-shrink-0'
                  />
                  <div className='text-xs leading-5 text-[#09090B]'>
                    按住并拖拽字段以调整顺序。字段顺序会影响访客填写表单时看到的顺序
                  </div>
                </div>

                {/* 字段列表 */}
                <div className='flex flex-col gap-2'>
                  {fields.map((f: RSVPField, index: number) => (
                    <FieldItem
                      key={f.id}
                      field={f}
                      index={index}
                      isDragging={draggedIndex === index}
                      isDragOver={dragOverIndex === index}
                      touchOffsetY={
                        draggedIndex === index &&
                        touchStartY !== null &&
                        touchCurrentY !== null
                          ? touchCurrentY - touchStartY
                          : 0
                      }
                      fieldRef={el => {
                        if (el) {
                          fieldRefs.current.set(index, el);
                        } else {
                          fieldRefs.current.delete(index);
                        }
                      }}
                      onDragStart={e => handleDragStart(e, index)}
                      onDragOver={e => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(y: number) => handleTouchStart(index, y)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onToggleEnabled={(id, enabled) => {
                        updateField(id, { enabled });
                      }}
                      onToggleSplitAdultChild={(id, split) => {
                        updateField(id, { splitAdultChild: split });
                      }}
                      onToggleRequired={(id, required) => {
                        updateField(id, { required });
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 基础信息 - 暂时不需要 */}
          {/* <div className='border border-black/[0.1] rounded-xl'>
            <div
              className='p-3 flex items-center justify-between cursor-pointer'
              onClick={() => setIsBasicInfoExpanded(!isBasicInfoExpanded)}
            >
              <div className='font-semibold text-base leading-6 text-[#09090B]'>
                基础信息
              </div>
              {isBasicInfoExpanded ? (
                <ChevronUp className='h-4 w-4 text-gray-500' />
              ) : (
                <ChevronDown className='h-4 w-4 text-gray-500' />
              )}
            </div>
            {isBasicInfoExpanded && (
              <div className='px-3 pb-3 space-y-3'>
                <div>
                  <div className='font-semibold text-xs leading-[18px] text-[#0A0A0A] mb-1'>
                    标题
                  </div>
                  <Input
                    className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-xs'
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder='如：我要报名'
                  />
                </div>
                <div>
                  <div className='font-semibold text-xs leading-[18px] text-[#0A0A0A] mb-1'>
                    描述
                  </div>
                  <textarea
                    className='h-[72px] resize-none w-full border-none text-xs rounded-md px-3 py-2 outline-none bg-[#F3F3F5]'
                    value={config.desc ?? ''}
                    onChange={e =>
                      setConfig({
                        ...config,
                        desc: e.target.value || null,
                      })
                    }
                    placeholder='补充说明（可选）'
                  />
                </div>
              </div>
            )}
          </div> */}
        </div>
      </div>

      <FieldEditorDialog
        key={editingField?.id || 'new'}
        field={editingField}
        open={showFieldEditor}
        onOpenChange={setShowFieldEditor}
        onSave={(field: RSVPField) => {
          if (field.id && fields.find((f: RSVPField) => f.id === field.id)) {
            // 更新现有字段时，保留 isSystem 属性
            updateField(field.id, field);
          } else {
            // 添加新字段时，确保 isSystem 为 false（用户添加的字段不是系统字段）
            setFields([
              ...fields,
              { ...field, id: `field_${Date.now()}`, isSystem: false },
            ]);
          }
          setShowFieldEditor(false);
        }}
      />
    </div>
  );
}

interface FieldItemProps {
  field: RSVPField;
  index: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  touchOffsetY?: number;
  fieldRef?: (el: HTMLDivElement | null) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onTouchStart?: (y: number) => void;
  onTouchMove?: (y: number) => void;
  onTouchEnd?: () => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onToggleSplitAdultChild: (id: string, split: boolean) => void;
  onToggleRequired: (id: string, required: boolean) => void;
}

function FieldItem({
  field,
  isDragging = false,
  isDragOver = false,
  touchOffsetY = 0,
  fieldRef,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onToggleEnabled,
  onToggleSplitAdultChild,
  onToggleRequired,
}: FieldItemProps) {
  const touchStartRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  // 获取字段显示名称
  const getFieldDisplayLabel = (field: RSVPField) => {
    if (field.type === 'guest_count') return '出席人数（含本人）';
    if (field.id === 'phone') return '手机';
    if (field.id === 'email') return '邮箱';
    if (field.id === 'remark') return '备注';
    return field.label;
  };

  // 触摸事件处理
  const handlePointerDown = (e: React.PointerEvent) => {
    // 只在触摸设备上处理，鼠标设备使用原生拖拽
    if (e.pointerType === 'mouse') return;

    // 检查是否点击在拖拽手柄上
    const target = e.target as HTMLElement;
    const isHandle = target.closest('[data-drag-handle]');
    if (!isHandle) return;

    e.preventDefault();
    e.stopPropagation();
    touchStartRef.current = e.clientY;
    isDraggingRef.current = true;
    onTouchStart?.(e.clientY);

    const element = e.currentTarget as HTMLElement;
    element.setPointerCapture(e.pointerId);

    // 防止页面滚动
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      moveEvent.preventDefault();
      onTouchMove?.(moveEvent.clientY);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      onTouchEnd?.();
      element.releasePointerCapture(e.pointerId);
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove, {
      passive: false,
    });
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      ref={fieldRef}
      className={cls(
        'border-2 rounded-lg bg-white transition-all relative',
        isDragOver
          ? 'border-[#3358D4] border-dashed bg-[#E6F0FF]'
          : 'border-[#e4e4e7]',
        isDragging && 'opacity-50 z-50'
      )}
      style={{
        transform:
          isDragging && touchOffsetY !== 0
            ? `translateY(${touchOffsetY}px)`
            : undefined,
        transition: isDragging ? 'none' : 'all 0.2s ease',
      }}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onPointerDown={handlePointerDown}
    >
      <div className='px-3 py-2 flex items-center gap-3'>
        {/* 拖拽手柄 */}
        <div
          data-drag-handle
          className='cursor-grab active:cursor-grabbing text-gray-400 touch-none flex-shrink-0 select-none'
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={20} />
        </div>

        {/* 开关 */}
        <Switch
          checked={field.enabled !== false}
          onCheckedChange={checked => onToggleEnabled(field.id, checked)}
        />

        {/* 字段名称 */}
        <div className='flex-1'>
          <div className='font-semibold text-sm leading-5 text-[#09090B]'>
            {getFieldDisplayLabel(field)}
          </div>
        </div>

        {/* Required/Optional 标签 - 可点击切换 */}
        <div className='flex items-center gap-2'>
          <button
            onClick={() => onToggleRequired(field.id, !field.required)}
            className={
              field.required
                ? 'px-2 py-1 bg-[#09090B] text-white text-xs font-semibold rounded cursor-pointer hover:bg-[#09090B]/90 transition-colors'
                : 'px-2 py-1 bg-[#F4F4F5] text-[#09090B] text-xs font-semibold rounded cursor-pointer hover:bg-[#E4E4E7] transition-colors'
            }
          >
            {field.required ? '必填' : '选填'}
          </button>
        </div>
      </div>

      {/* Guests字段的子选项 */}
      {field.type === 'guest_count' && field.enabled !== false && (
        <div className='px-3 pb-3 pl-12'>
          <div className='flex items-center gap-2 justify-between'>
            <span className='text-xs leading-5 text-[#09090B]'>
              分别统计大人和小孩
            </span>
            <Switch
              checked={field.splitAdultChild ?? false}
              onCheckedChange={checked =>
                onToggleSplitAdultChild(field.id, checked)
              }
            />
          </div>
        </div>
      )}

      {/* 自定义字段的选项预览 */}
      {field.options && ['radio', 'checkbox'].includes(field.type) && (
        <div className='px-3 pb-3 pl-12'>
          <div className='flex items-center gap-1 flex-wrap'>
            {field.options.map((opt, idx) => (
              <div
                key={idx}
                className='border border-[#e4e4e7] bg-[#f4f4f5] rounded px-2 py-0.5 text-xs font-semibold leading-[18px] text-[#09090b]'
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FieldEditorDialogProps {
  field: RSVPField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: RSVPField) => void;
}

function FieldEditorDialog({
  field,
  open,
  onOpenChange,
  onSave,
}: FieldEditorDialogProps) {
  const getInitialField = (): RSVPField => {
    return (
      field || {
        id: '',
        type: 'text',
        label: '',
        required: false,
        placeholder: '',
        enabled: true,
      }
    );
  };

  const [localField, setLocalField] = useState<RSVPField>(getInitialField());
  // 独立的选项文本输入状态，不立即解析
  const [optionsInputText, setOptionsInputText] = useState<string>(() => {
    return field?.options?.map(o => o.label).join(', ') || '';
  });

  // 当 field 或 open 变化时，重置本地状态
  useEffect(() => {
    if (open) {
      const initialField = field || {
        id: '',
        type: 'text',
        label: '',
        required: false,
        placeholder: '',
        enabled: true,
      };
      // 使用 setTimeout 避免在 effect 中同步调用 setState
      setTimeout(() => {
        setLocalField(initialField);
        setOptionsInputText(field?.options?.map(o => o.label).join(', ') || '');
      }, 0);
    }
  }, [field, open]);

  const updateLocalField = (patch: Partial<RSVPField>) => {
    setLocalField(prev => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    if (!localField.label || !localField.label.trim()) {
      toast.error('请输入字段名称');
      return;
    }

    // 如果是单选或多选类型，需要验证选项
    if (['radio', 'checkbox'].includes(localField.type)) {
      if (!optionsInputText.trim()) {
        toast.error('请输入选项内容');
        return;
      }
      const parsedOptions = parseOptions(optionsInputText);
      if (parsedOptions.length === 0) {
        toast.error('请至少输入一个选项');
        return;
      }
      onSave({ ...localField, options: parsedOptions });
    } else {
      onSave(localField);
    }
  };

  // 解析选项文本为选项数组（仅用于预览）
  const parseOptions = (text: string): RSVPFieldOption[] => {
    if (!text.trim()) return [];
    return text
      .split(/[,，\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map((label, idx) => ({ label, value: String(idx + 1) }));
  };

  // 实时解析选项用于预览
  const previewOptions = parseOptions(optionsInputText);

  return (
    <ResponsiveDialog isOpen={open} onOpenChange={onOpenChange}>
      <div>
        <div className='font-semibold text-lg leading-6 text-[#09090b] px-4 py-4'>
          {localField.id ? '修改自定义字段' : '添加自定义字段'}
        </div>

        <div className='px-4 mb-5'>
          <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
            字段名称 <span className='text-red-500'>*</span>
          </div>
          <Input
            value={localField.label}
            onChange={e => updateLocalField({ label: e.target.value })}
            placeholder='e.g. Contact Info, Preferences'
            className='w-full bg-white border border-black/[0.06] rounded-md px-3 py-2 text-sm'
          />
        </div>

        <div className='px-4 mb-5'>
          <div className='font-semibold text-sm leading-5 text-[#09090b] mb-3'>
            字段类型
          </div>
          <div className='flex items-center gap-3 mb-2'>
            {fieldTypes
              .filter(type => type.value !== 'guest_count' && type.icon)
              .map(type => {
                const IconComponent = type.icon!;
                const isSelected = localField.type === type.value;
                return (
                  <div
                    key={type.value}
                    className={cls(
                      'relative flex-1 border rounded-lg bg-white cursor-pointer transition-all',
                      isSelected
                        ? 'border-[#09090B] shadow-sm'
                        : 'border-[#E4E4E7] hover:border-[#09090B]/50'
                    )}
                    onClick={() => {
                      const newType = type.value;
                      updateLocalField({
                        type: newType,
                        options:
                          newType === 'radio' || newType === 'checkbox'
                            ? localField.options || []
                            : undefined,
                      });
                      // 如果切换到单选或多选，且没有选项文本，设置默认值
                      if (
                        (newType === 'radio' || newType === 'checkbox') &&
                        !optionsInputText.trim()
                      ) {
                        setOptionsInputText('选项一, 选项二');
                      } else if (newType === 'text') {
                        // 切换到文本类型时，清空选项文本
                        setOptionsInputText('');
                      }
                    }}
                  >
                    <div className='flex flex-col items-center justify-center py-4 px-2'>
                      <IconComponent
                        size={24}
                        className={cls(
                          'mb-2',
                          type.value === 'text'
                            ? 'text-yellow-500'
                            : 'text-gray-500'
                        )}
                      />
                      <span className='text-xs font-medium text-[#09090B]'>
                        {type.label}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
          {['radio', 'checkbox'].includes(localField.type) && (
            <div className='mt-3'>
              <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
                选项内容 <span className='text-red-500'>*</span>
              </div>
              <Input
                value={optionsInputText}
                onChange={e => {
                  // 只更新输入文本，不做任何限制
                  setOptionsInputText(e.target.value);
                }}
                placeholder='e.g., red, blue, green'
                className='w-full bg-white border border-black/[0.06] rounded-md px-3 py-2 text-sm mb-2'
              />
              <div className='flex items-start gap-1.5 text-xs text-black/60 mb-2'>
                <Lightbulb size={14} className='mt-0.5 flex-shrink-0' />
                <span>提示：多个选项请使用逗号（,）或空格分隔</span>
              </div>
              {/* 选项预览标签 */}
              {previewOptions.length > 0 && (
                <div className='flex items-center gap-1.5 flex-wrap'>
                  {previewOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className='border border-[#e4e4e7] bg-[#f4f4f5] rounded px-2 py-0.5 text-xs font-semibold leading-[18px] text-[#09090b]'
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className='w-full p-4 flex items-center gap-3 border-t border-[#e4e4e7]'>
          <Button
            size='lg'
            variant='outline'
            className='flex-1 bg-white hover:bg-gray-50 border border-black/[0.06] text-[#09090B]'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            size='lg'
            className='flex-1 bg-[#09090B] text-white hover:bg-[#09090B]/90'
            onClick={handleSave}
          >
            {localField.id ? '保存' : '添加字段'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
