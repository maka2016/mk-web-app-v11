'use client';

import { SerializedWorksEntity } from '@/utils';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Switch } from '@workspace/ui/components/switch';
import { Textarea } from '@workspace/ui/components/textarea';
import {
  Bug,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AIGeneratedContent, AIWorksSDK } from '../../../ai-template-search/utils/ai-works-sdk';
import GridCompWrapper from '../../../components/GridEditorV3/AppV2';
import { WorksStore } from '../../../components/GridEditorV3/works-store/store';
import { IWorksData } from '../../../components/GridEditorV3/works-store/types';
import { TemplateFormData, TemplateFormField } from './types';

// 固定测试数据（用于调试）
const DEBUG_TEST_DATA: AIGeneratedContent = {
  pages: [
    {
      elements: [
        {
          tag: 'text_heading1',
          text: '喜迎元旦，放假通知',
          order: 0,
        },
        {
          tag: 'text_body',
          text: '尊敬的各位员工：',
          order: 1,
        },
        {
          tag: 'text_body',
          text: '元旦佳节将至，为了让大家度过一个愉快祥和的假期，现将放假安排通知如下：',
          order: 2,
        },
      ],
    },
    {
      elements: [
        {
          tag: 'text_heading2',
          text: '放假时间',
          order: 0,
        },
        {
          tag: 'text_body',
          text: '放假时间：2024年1月1日（星期一），共1天。',
          order: 1,
        },
        {
          tag: 'text_heading2',
          text: '温馨提示',
          order: 2,
        },
        {
          tag: 'text_body',
          text: '请各位员工提前安排好工作和生活，确保节日期间安全。节日期间如有紧急情况，请及时联系：',
          order: 3,
        },
        {
          tag: 'text_free',
          text: '联系电话：13322221111',
          order: 4,
        },
      ],
    },
    {
      elements: [
        {
          tag: 'text_heading2',
          text: '节日祝福',
          order: 0,
        },
        {
          tag: 'text_body',
          text: '祝大家元旦快乐，阖家幸福！',
          order: 1,
        },
        {
          tag: 'text_body',
          text: '公司行政部',
          order: 2,
        },
        {
          tag: 'text_body',
          text: '2023年12月20日',
          order: 3,
        },
        {
          tag: 'text_desc',
          text: '（本通知主题颜色为红色）',
          order: 4,
        },
      ],
    },
  ],
};

function PreviewWorks({
  worksStore,
  previewKey,
}: {
  worksStore: WorksStore;
  previewKey: number;
}) {
  return (
    <div
      id='PreviewWorks'
      className='w-[375px] h-[667px] mx-auto overflow-hidden'
    // key={`preview-${previewKey}`}
    >
      <GridCompWrapper
        readonly={true}
        worksData={worksStore.worksData}
        worksDetail={worksStore.worksDetail}
        worksId={`preview-${previewKey}`}
      />
    </div>
  );
}

/**
 * 格式化列表数据为文本描述
 */
function formatListData(
  listField: TemplateFormField,
  listData: Array<Record<string, any>>
): string {
  if (!listData || listData.length === 0) {
    return '';
  }

  const itemTexts = listData.map((item, index) => {
    const fieldTexts = (listField.itemFields || [])
      .map(field => {
        const value = item[field.key];
        return value && String(value).trim() ? `${field.label}：${value}` : '';
      })
      .filter(Boolean);
    return `第${index + 1}项-${fieldTexts.join('，')}`;
  });

  return `${listField.label}包含${listData.length}项：${itemTexts.join('；')}`;
}

/**
 * 将表单数据格式化为描述文本
 */
function formatFormDataToDescription(
  formData: TemplateFormData,
  formFields: TemplateFormField[]
): string {
  const parts: string[] = [];
  Object.entries(formData).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    const field = formFields.find(f => f.key === key);
    if (!field) {
      return;
    }

    // 处理列表类型字段
    if (field.type === 'list' && Array.isArray(value)) {
      const listText = formatListData(field, value);
      if (listText) {
        parts.push(listText);
      }
    } else if (field.type !== 'list') {
      // 处理普通字段
      parts.push(`${field.label}：${value}`);
    }
  });
  return parts.join('，');
}

function AIGenWorksPageInner() {
  const [templateId, setTemplateId] = useState('');
  const [userInput, setUserInput] = useState(''); // 单输入框模式的输入
  const [useFormMode, setUseFormMode] = useState(true); // 是否使用表单模式
  const [formFields, setFormFields] = useState<TemplateFormField[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewWorksStore, setPreviewWorksStore] = useState<WorksStore | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0); // 用于强制重新渲染预览组件

  // 使用react-hook-form管理表单数据
  const form = useForm<TemplateFormData>({
    defaultValues: {},
  });

  // 分析模版，提取表单字段
  const handleAnalyzeTemplate = async () => {
    if (!templateId.trim()) {
      toast.error('请输入模版ID');
      return;
    }

    try {
      setAnalyzing(true);

      const response = await fetch('/api/ai-generate/analyze-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: templateId.trim(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || '分析模版失败，请重试');
        return;
      }

      if (!result.fields || result.fields.length === 0) {
        toast.error('未能从模版中提取到表单字段');
        return;
      }

      // 设置表单字段
      setFormFields(result.fields);

      // 初始化表单默认值，使用从模版中提取的默认值
      const defaultValues: TemplateFormData = {};
      result.fields.forEach((field: TemplateFormField) => {
        if (field.type === 'list') {
          // 列表类型：使用每个列表项对应的默认值
          if (field.defaultItems && field.defaultItems.length > 0) {
            // 使用API返回的每个列表项的默认值
            defaultValues[field.key] = field.defaultItems;
          } else {
            // 如果没有defaultItems，则创建默认数量的空列表项
            const itemCount = field.defaultItemCount || 1;
            const listItems: Array<Record<string, string>> = [];
            for (let i = 0; i < itemCount; i++) {
              const item: Record<string, string> = {};
              (field.itemFields || []).forEach(itemField => {
                item[itemField.key] = '';
              });
              listItems.push(item);
            }
            defaultValues[field.key] = listItems;
          }
        } else {
          // 普通字段：如果字段有默认值，使用默认值；否则使用空字符串
          defaultValues[field.key] =
            field.defaultValue !== undefined && field.defaultValue !== null
              ? field.defaultValue
              : '';
        }
      });
      form.reset(defaultValues);

      toast.success(`成功提取 ${result.fields.length} 个表单字段`);
    } catch (error) {
      console.error('[AIGenWorks] 分析模版失败:', error);
      toast.error(
        error instanceof Error ? error.message : '分析模版失败，请重试'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // 单输入框模式的生成函数（原来的逻辑）
  const handleGenerateSimple = async () => {
    if (!userInput.trim()) {
      toast.error('请输入一句话描述您的需求');
      return;
    }

    if (!templateId.trim()) {
      toast.error('请输入模版ID');
      return;
    }

    try {
      setIsLoading(true);

      // 1. 通过 trpc 获取模版数据
      let templateData;
      try {
        templateData = await trpc.template.getTemplateData.query({
          id: templateId.trim(),
        });
      } catch (error) {
        console.error('[AIGenWorks] 获取模版数据失败:', error);
        toast.error(
          error instanceof Error
            ? `获取模版数据失败: ${error.message}`
            : '获取模版数据失败，请检查模版ID是否正确'
        );
        return;
      }

      if (!templateData || !templateData.work_data) {
        toast.error('模版数据无效，请检查模版ID');
        return;
      }

      // 2. 提取模版内容
      const templateWorksStore = new WorksStore({
        worksId: () => templateId.trim(),
        readonly: false,
        autoSaveFreq: -1,
        worksData: templateData.work_data as unknown as IWorksData,
        worksDetail: templateData.detail as unknown as SerializedWorksEntity,
      });

      const templateElements = AIWorksSDK.extractTemplateTextElements(
        templateWorksStore.worksData
      );

      // 3. 调用AI生成文案（传递模版内容）
      const response = await fetch('/api/ai-generate/template-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: userInput.trim(),
          templateElements:
            templateElements.length > 0 ? templateElements : undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || '生成失败，请重试');
        return;
      }

      // 4. 验证返回的数据
      if (
        !result.content ||
        !result.content.pages ||
        result.content.pages.length === 0
      ) {
        toast.error('AI返回的数据无效，请重试');
        return;
      }

      // 5. 使用AIWorksSDK创建页面（基于模版数据）
      try {
        const previewWorksStore = await AIWorksSDK.createPagesWithContent(
          result.content,
          templateWorksStore
        );

        const totalElements = result.content.pages.reduce(
          (sum: number, page: any) => sum + (page.elements?.length || 0),
          0
        );

        toast.success(`成功创建，包含 ${totalElements} 个文本元素`);
        setPreviewWorksStore(previewWorksStore);
        setShowPreview(true);
        setPreviewKey(prev => prev + 1); // 更新 key 强制重新渲染
        setUserInput(''); // 清空输入框
      } catch (sdkError) {
        console.error('[AIGenWorks] SDK创建页面失败:', sdkError);
        toast.error(
          sdkError instanceof Error ? sdkError.message : '创建页面失败，请重试'
        );
      }
    } catch (error) {
      console.error('[AIGenWorks] 生成失败:', error);
      toast.error(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 表单模式的生成函数
  const handleGenerate = async (formData: TemplateFormData) => {
    if (!templateId.trim()) {
      toast.error('请输入模版ID');
      return;
    }

    if (formFields.length === 0) {
      toast.error('请先分析模版');
      return;
    }

    try {
      setIsLoading(true);

      // 1. 将表单数据格式化为描述文本
      const formattedInput = formatFormDataToDescription(formData, formFields);

      if (!formattedInput.trim()) {
        toast.error('请填写至少一个表单字段');
        return;
      }

      // 2. 通过 trpc 获取模版数据
      let templateData;
      try {
        templateData = await trpc.template.getTemplateData.query({
          id: templateId.trim(),
        });
      } catch (error) {
        console.error('[AIGenWorks] 获取模版数据失败:', error);
        toast.error(
          error instanceof Error
            ? `获取模版数据失败: ${error.message}`
            : '获取模版数据失败，请检查模版ID是否正确'
        );
        return;
      }

      if (!templateData || !templateData.work_data) {
        toast.error('模版数据无效，请检查模版ID');
        return;
      }

      // 3. 提取模版内容
      const templateWorksStore = new WorksStore({
        worksId: () => templateId.trim(),
        readonly: false,
        autoSaveFreq: -1,
        worksData: templateData.work_data as unknown as IWorksData,
        worksDetail: templateData.detail as unknown as SerializedWorksEntity,
      });

      const templateElements = AIWorksSDK.extractTemplateTextElements(
        templateWorksStore.worksData
      );

      // 4. 调用AI生成文案（传递模版内容和格式化的表单数据）
      const response = await fetch('/api/ai-generate/template-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: formattedInput.trim(),
          templateElements:
            templateElements.length > 0 ? templateElements : undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || '生成失败，请重试');
        return;
      }

      // 5. 验证返回的数据
      if (
        !result.content ||
        !result.content.pages ||
        result.content.pages.length === 0
      ) {
        toast.error('AI返回的数据无效，请重试');
        return;
      }

      // 6. 使用AIWorksSDK创建页面（基于模版数据）
      try {
        const previewWorksStore = await AIWorksSDK.createPagesWithContent(
          result.content,
          templateWorksStore
        );

        const totalElements = result.content.pages.reduce(
          (sum: number, page: any) => sum + (page.elements?.length || 0),
          0
        );

        toast.success(`成功创建，包含 ${totalElements} 个文本元素`);
        setPreviewWorksStore(previewWorksStore);
        setShowPreview(true);
        setPreviewKey(prev => prev + 1); // 更新 key 强制重新渲染
      } catch (sdkError) {
        console.error('[AIGenWorks] SDK创建页面失败:', sdkError);
        toast.error(
          sdkError instanceof Error ? sdkError.message : '创建页面失败，请重试'
        );
      }
    } catch (error) {
      console.error('[AIGenWorks] 生成失败:', error);
      toast.error(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 调试功能：使用固定数据，不走AI生成
  const handleDebug = async () => {
    try {
      setIsLoading(true);

      // 直接使用固定测试数据
      console.log('[AIGenWorks] 使用调试数据:', DEBUG_TEST_DATA);
      const previewWorksStore =
        await AIWorksSDK.createPagesWithContent(DEBUG_TEST_DATA);
      setPreviewWorksStore(previewWorksStore);
      setShowPreview(true);
      setPreviewKey(prev => prev + 1); // 更新 key 强制重新渲染

      const totalElements = DEBUG_TEST_DATA.pages.reduce(
        (sum: number, page: any) => sum + (page.elements?.length || 0),
        0
      );

      toast.success(`[调试模式] 成功创建，包含 ${totalElements} 个文本元素`);
    } catch (error) {
      console.error('[AIGenWorks] 调试模式创建页面失败:', error);
      toast.error(
        error instanceof Error ? error.message : '调试模式创建页面失败'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 重置状态，清理生成的数据
  const handleReset = () => {
    setTemplateId('');
    setUserInput('');
    setFormFields([]);
    form.reset({});
    setPreviewWorksStore(null);
    setShowPreview(false);
    toast.success('已重置，可以重新生成');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerateSimple();
    }
  };

  return (
    <div className='flex h-screen overflow-hidden'>
      {/* 左侧输入区域 */}
      <div className='w-[400px] border-r flex-shrink-0 overflow-y-auto'>
        <Card className='flex h-full flex-col border-0 rounded-none'>
          <CardHeader className='border-b'>
            <CardTitle className='flex items-center gap-2'>
              <Sparkles className='h-5 w-5' />
              AI 主题模板文案生成
            </CardTitle>
            <CardDescription>
              输入模版ID，AI将分析模版并生成表单，填写后生成结构化的文案并创建页面
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-1 flex-col gap-4 p-6'>
            <div className='flex flex-col gap-4 overflow-y-auto'>
              {/* 模式切换 */}
              <div className='flex items-center justify-between rounded-lg border bg-muted/50 p-3'>
                <div className='flex flex-col gap-1'>
                  <Label htmlFor='mode-switch' className='text-sm font-medium'>
                    {useFormMode ? '表单模式' : '简单模式（调试用）'}
                  </Label>
                  <p className='text-xs text-muted-foreground'>
                    {useFormMode ? '分析模版生成表单字段' : '直接输入描述文本'}
                  </p>
                </div>
                <Switch
                  id='mode-switch'
                  checked={useFormMode}
                  onCheckedChange={setUseFormMode}
                  disabled={isLoading || analyzing}
                />
              </div>

              <div className='space-y-2'>
                <label
                  htmlFor='template-id'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  模版ID
                </label>
                <div className='flex gap-2'>
                  <Input
                    id='template-id'
                    value={templateId}
                    onChange={e => setTemplateId(e.target.value)}
                    placeholder='请输入模版ID'
                    disabled={isLoading || analyzing}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleAnalyzeTemplate();
                      }
                    }}
                  />
                  {useFormMode && (
                    <Button
                      onClick={handleAnalyzeTemplate}
                      disabled={isLoading || analyzing || !templateId.trim()}
                      variant='outline'
                      size='lg'
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          分析中...
                        </>
                      ) : (
                        <>
                          <Search className='mr-2 h-4 w-4' />
                          分析模版
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {useFormMode
                    ? '输入要使用的模版ID，点击分析模版按钮提取表单字段'
                    : '输入要使用的模版ID，系统将通过该模版提取结构信息'}
                </p>
              </div>

              {/* 简单模式：单输入框 */}
              {!useFormMode && (
                <div className='space-y-2'>
                  <label
                    htmlFor='user-input'
                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                  >
                    输入您的需求
                  </label>
                  <Textarea
                    id='user-input'
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='例如：元旦放假通知、公司年会邀请函、产品发布会宣传...'
                    className='min-h-[120px] resize-none'
                    disabled={isLoading}
                  />
                  <p className='text-xs text-muted-foreground'>
                    提示：按 Cmd/Ctrl + Enter 快速生成
                  </p>
                </div>
              )}

              {/* 表单模式：动态表单 */}
              {useFormMode && formFields.length > 0 && (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleGenerate)}
                    className='space-y-4'
                  >
                    {formFields.map(field => {
                      // 列表类型字段的特殊处理
                      if (field.type === 'list') {
                        return (
                          <FormField
                            key={field.key}
                            control={form.control}
                            name={field.key}
                            rules={{
                              required: field.required
                                ? `${field.label}不能为空`
                                : false,
                            }}
                            render={({ field: formField }) => {
                              const listData = ((formField.value as
                                | Array<Record<string, string>>
                                | undefined) || []) as Array<
                                  Record<string, string>
                                >;

                              const addListItem = () => {
                                const newItem: Record<string, string> = {};
                                (field.itemFields || []).forEach(itemField => {
                                  newItem[itemField.key] =
                                    itemField.defaultValue !== undefined &&
                                      itemField.defaultValue !== null
                                      ? String(itemField.defaultValue)
                                      : '';
                                });
                                formField.onChange([...listData, newItem]);
                              };

                              const removeListItem = (index: number) => {
                                const minItems = field.minItems || 1;
                                if (listData.length <= minItems) {
                                  toast.error(
                                    `至少需要保留${minItems}个列表项`
                                  );
                                  return;
                                }
                                const newData = listData.filter(
                                  (_, i) => i !== index
                                );
                                formField.onChange(newData);
                              };

                              const updateListItemField = (
                                itemIndex: number,
                                fieldKey: string,
                                value: string
                              ) => {
                                const newData = [...listData];
                                if (!newData[itemIndex]) {
                                  newData[itemIndex] = {};
                                }
                                newData[itemIndex][fieldKey] = value;
                                formField.onChange(newData);
                              };

                              return (
                                <FormItem>
                                  <FormLabel>
                                    {field.label}
                                    {field.required && (
                                      <span className='text-destructive ml-1'>
                                        *
                                      </span>
                                    )}
                                  </FormLabel>
                                  <FormControl>
                                    <div className='space-y-3'>
                                      {listData.map((item, itemIndex) => (
                                        <Card
                                          key={itemIndex}
                                          className='p-4 border'
                                        >
                                          <div className='flex items-center justify-between mb-3'>
                                            <span className='text-sm font-medium text-muted-foreground'>
                                              列表项 {itemIndex + 1}
                                            </span>
                                            <Button
                                              type='button'
                                              variant='ghost'
                                              size='sm'
                                              onClick={() =>
                                                removeListItem(itemIndex)
                                              }
                                              disabled={
                                                isLoading ||
                                                listData.length <=
                                                (field.minItems || 1)
                                              }
                                              className='h-8 w-8 p-0'
                                            >
                                              <Trash2 className='h-4 w-4 text-destructive' />
                                            </Button>
                                          </div>
                                          <div className='space-y-3'>
                                            {(field.itemFields || []).map(
                                              itemField => (
                                                <div key={itemField.key}>
                                                  <Label
                                                    htmlFor={`${field.key}_${itemIndex}_${itemField.key}`}
                                                    className='text-sm'
                                                  >
                                                    {itemField.label}
                                                    {itemField.required && (
                                                      <span className='text-destructive ml-1'>
                                                        *
                                                      </span>
                                                    )}
                                                  </Label>
                                                  {itemField.type ===
                                                    'textarea' ? (
                                                    <Textarea
                                                      id={`${field.key}_${itemIndex}_${itemField.key}`}
                                                      value={
                                                        item[itemField.key] ||
                                                        ''
                                                      }
                                                      onChange={e =>
                                                        updateListItemField(
                                                          itemIndex,
                                                          itemField.key,
                                                          e.target.value
                                                        )
                                                      }
                                                      placeholder={
                                                        itemField.placeholder
                                                      }
                                                      disabled={isLoading}
                                                      className='min-h-[80px] resize-none mt-1'
                                                    />
                                                  ) : (
                                                    <Input
                                                      id={`${field.key}_${itemIndex}_${itemField.key}`}
                                                      value={
                                                        item[itemField.key] ||
                                                        ''
                                                      }
                                                      onChange={e =>
                                                        updateListItemField(
                                                          itemIndex,
                                                          itemField.key,
                                                          e.target.value
                                                        )
                                                      }
                                                      placeholder={
                                                        itemField.placeholder
                                                      }
                                                      disabled={isLoading}
                                                      className='mt-1'
                                                    />
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </Card>
                                      ))}
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={addListItem}
                                        disabled={isLoading}
                                        className='w-full'
                                      >
                                        <Plus className='mr-2 h-4 w-4' />
                                        添加列表项
                                      </Button>
                                    </div>
                                  </FormControl>
                                  {field.description && (
                                    <FormDescription>
                                      {field.description}
                                    </FormDescription>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        );
                      }

                      // 普通字段的渲染
                      return (
                        <FormField
                          key={field.key}
                          control={form.control}
                          name={field.key}
                          rules={{
                            required: field.required
                              ? `${field.label}不能为空`
                              : false,
                          }}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel>
                                {field.label}
                                {field.required && (
                                  <span className='text-destructive ml-1'>
                                    *
                                  </span>
                                )}
                              </FormLabel>
                              <FormControl>
                                {field.type === 'textarea' ? (
                                  <Textarea
                                    {...formField}
                                    placeholder={field.placeholder}
                                    disabled={isLoading}
                                    className='min-h-[100px] resize-none'
                                    value={
                                      typeof formField.value === 'string'
                                        ? formField.value
                                        : ''
                                    }
                                  />
                                ) : field.type === 'date' ? (
                                  <Input
                                    {...formField}
                                    type='date'
                                    placeholder={field.placeholder}
                                    disabled={isLoading}
                                    value={
                                      typeof formField.value === 'string'
                                        ? formField.value
                                        : ''
                                    }
                                  />
                                ) : field.type === 'number' ? (
                                  <Input
                                    {...formField}
                                    type='number'
                                    placeholder={field.placeholder}
                                    disabled={isLoading}
                                    onChange={e => {
                                      const value = e.target.value;
                                      formField.onChange(
                                        value === '' ? '' : Number(value)
                                      );
                                    }}
                                    value={
                                      typeof formField.value === 'number'
                                        ? formField.value
                                        : typeof formField.value === 'string'
                                          ? formField.value
                                          : ''
                                    }
                                  />
                                ) : (
                                  <Input
                                    {...formField}
                                    type='text'
                                    placeholder={field.placeholder}
                                    disabled={isLoading}
                                    value={
                                      typeof formField.value === 'string'
                                        ? formField.value
                                        : ''
                                    }
                                  />
                                )}
                              </FormControl>
                              {field.description && (
                                <FormDescription>
                                  {field.description}
                                </FormDescription>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      );
                    })}

                    <div className='flex gap-2 pt-2'>
                      <Button
                        type='submit'
                        disabled={isLoading}
                        className='flex-1'
                        size='lg'
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            AI 正在生成中...
                          </>
                        ) : (
                          <>
                            <Sparkles className='mr-2 h-4 w-4' />
                            生成文案并创建页面
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleDebug}
                        disabled={isLoading}
                        variant='outline'
                        size='lg'
                        type='button'
                        title='使用固定测试数据，跳过AI生成（调试用）'
                      >
                        <Bug className='h-4 w-4' />
                      </Button>
                      <Button
                        onClick={handleReset}
                        disabled={isLoading || !showPreview}
                        variant='outline'
                        size='lg'
                        type='button'
                        title='重置状态，清理生成的数据'
                      >
                        <RotateCcw className='h-4 w-4' />
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* 简单模式：生成按钮 */}
              {!useFormMode && (
                <div className='flex gap-2'>
                  <Button
                    onClick={handleGenerateSimple}
                    disabled={
                      isLoading || !userInput.trim() || !templateId.trim()
                    }
                    className='flex-1'
                    size='lg'
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        AI 正在生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className='mr-2 h-4 w-4' />
                        生成文案并创建页面
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDebug}
                    disabled={isLoading}
                    variant='outline'
                    size='lg'
                    type='button'
                    title='使用固定测试数据，跳过AI生成（调试用）'
                  >
                    <Bug className='h-4 w-4' />
                  </Button>
                  <Button
                    onClick={handleReset}
                    disabled={isLoading || !showPreview}
                    variant='outline'
                    size='lg'
                    type='button'
                    title='重置状态，清理生成的数据'
                  >
                    <RotateCcw className='h-4 w-4' />
                  </Button>
                </div>
              )}

              {analyzing && (
                <div className='rounded-lg border bg-muted/50 p-4'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span>正在分析模版内容，提取表单字段...</span>
                  </div>
                </div>
              )}

              {isLoading && formFields.length === 0 && (
                <div className='rounded-lg border bg-muted/50 p-4'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span>正在调用AI生成结构化文案...</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 右侧预览区域 */}
      <div className='flex-1 overflow-y-auto bg-muted/30 flex items-center justify-center p-8'>
        {showPreview && previewWorksStore ? (
          <PreviewWorks
            worksStore={previewWorksStore}
            previewKey={previewKey}
          />
        ) : (
          <div className='text-center text-muted-foreground'>
            <Sparkles className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p className='text-lg font-medium'>等待生成内容</p>
            <p className='text-sm mt-2'>
              {useFormMode
                ? formFields.length === 0
                  ? '在左侧输入模版ID并点击分析模版'
                  : '在左侧填写表单并点击生成按钮'
                : '在左侧输入需求并点击生成按钮'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIGenWorksPage() {
  return <AIGenWorksPageInner />;
}
