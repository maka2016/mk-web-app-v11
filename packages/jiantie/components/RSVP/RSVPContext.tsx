'use client';
import { trpc } from '@/utils/trpc';
import { getPageId } from '@mk/services';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getDefaultFields,
  parseRSVPFormFields,
  RSVPAttrs,
  RSVPField,
  RsvpFormConfigEntityForUi,
  toRSVPFormFieldsJson,
} from './type';

interface RSVPContextValue {
  // 状态
  loading: boolean;
  error: string | null;
  config: RsvpFormConfigEntityForUi | null;
  configId: string | null;
  title: string;
  fields: RSVPField[];
  worksId: string; // 作品ID

  // 编辑方法
  setTitle: (title: string) => void;
  setConfig: (config: RsvpFormConfigEntityForUi) => void;
  setFields: (fields: RSVPField[]) => void;
  handleSave: () => Promise<void>;

  // 编辑器相关
  showEditDialog: boolean;
  setShowEditDialog: (show: boolean) => void;
}

const RSVPContext = createContext<RSVPContextValue | null>(null);

interface RSVPProviderProps {
  attrs: RSVPAttrs;
  editorSDK?: EditorSDK;
  layer: LayerElemItem;
  children: React.ReactNode;
}

export function RSVPProvider({
  attrs,
  editorSDK,
  layer,
  children,
}: RSVPProviderProps) {
  const { formConfigId, worksId } = attrs;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfigState] = useState<RsvpFormConfigEntityForUi | null>(
    null
  );
  const [configId, setConfigId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('诚邀');
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);

  // 从 config 中提取 fields
  const fields: RSVPField[] = useMemo(() => {
    if (!config) return [];
    return parseRSVPFormFields(config.form_fields);
  }, [config]);

  // 加载配置
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 如果既没有 formConfigId，也没有有效的 worksId，则创建一个新的
        if (editorSDK && !formConfigId && !worksId) {
          const defaultFields = getDefaultFields();
          const created = await trpc.rsvp.upsertFormConfig.mutate({
            works_id: getPageId(),
            title: '诚邀',
            desc: '',
            form_fields: toRSVPFormFieldsJson(defaultFields),
            allow_multiple_submit: true, // 默认允许，不可配置
            require_approval: false, // 默认不需要，不可配置
            max_submit_count: null, // 默认无限，不可配置
            submit_deadline: null, // 默认无限期，不可配置
            enabled: true,
          });
          const createdData = created as any;
          setConfigState(createdData);
          setConfigId(createdData.id);
          setTitle(createdData.title || '诚邀');
          setLoading(false);
          editorSDK.changeCompAttr(layer.elemId, {
            formConfigId: createdData.id,
            worksId: getPageId(),
          });
          return;
        }

        if (formConfigId) {
          // 有且只有formConfigId是可以查询的
          const data = await trpc.rsvp.getFormConfigById.query({
            id: formConfigId,
          });
          const dataAsAny = data as any;
          // 确保使用默认值，覆盖数据库中可能存在的旧值
          setConfigState({
            ...dataAsAny,
            allow_multiple_submit: true, // 固定值：允许，不可配置
            require_approval: false, // 固定值：不需要，不可配置
            max_submit_count: null, // 固定值：无限，不可配置
            submit_deadline: null, // 固定值：无限期，不可配置
          });
          setConfigId(dataAsAny?.id || null);
          setTitle(dataAsAny?.title || '诚邀');
          setLoading(false);
        }
      } catch (e: any) {
        setError(String(e?.message || '加载失败'));
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formConfigId, worksId]);

  // 更新函数
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (config) {
      setConfigState({ ...config, title: newTitle });
    }
  };

  const handleConfigChange = (newConfig: RsvpFormConfigEntityForUi) => {
    // 确保不可配置的字段始终使用默认值
    setConfigState({
      ...newConfig,
      allow_multiple_submit: true, // 固定值：允许，不可配置
      require_approval: false, // 固定值：不需要，不可配置
      max_submit_count: null, // 固定值：无限，不可配置
      submit_deadline: null, // 固定值：无限期，不可配置
    });
  };

  const handleFieldsChange = (newFields: RSVPField[]) => {
    if (config) {
      setConfigState({
        ...config,
        form_fields: { fields: newFields },
      });
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!config) return;

    setError(null);
    try {
      const { toRSVPFormFieldsJson } = await import('./type');

      const ensureOptions = (f: RSVPField): RSVPField => {
        if (f.type === 'radio' || f.type === 'checkbox') {
          return {
            ...f,
            options:
              f.options && f.options.length > 0
                ? f.options
                : [
                    { label: '选项A', value: 'A' },
                    { label: '选项B', value: 'B' },
                  ],
          };
        }
        return { ...f, options: undefined };
      };

      const payload = {
        works_id: worksId,
        title: title || '诚邀',
        desc: config.desc ?? null,
        form_fields: toRSVPFormFieldsJson(fields.map(ensureOptions)),
        allow_multiple_submit: true, // 固定值：允许，不可配置
        require_approval: false, // 固定值：不需要，不可配置
        max_submit_count: null, // 固定值：无限，不可配置
        submit_deadline: null, // 固定值：无限期，不可配置
        enabled: config.enabled ?? true,
        collect_form: config.collect_form ?? false,
      } as any;

      const saved = await trpc.rsvp.upsertFormConfig.mutate(payload);
      const savedData = saved as any;
      setConfigId(savedData.id);

      // 更新 config 状态，确保使用固定默认值
      setConfigState({
        ...config,
        id: savedData.id,
        title: savedData.title || title,
        desc: savedData.desc ?? config.desc,
        enabled: savedData.enabled ?? config.enabled,
        collect_form: savedData.collect_form ?? config.collect_form,
        allow_multiple_submit: true, // 固定值：允许，不可配置
        require_approval: false, // 固定值：不需要，不可配置
        max_submit_count: null, // 固定值：无限，不可配置
        submit_deadline: null, // 固定值：无限期，不可配置
        form_fields: savedData.form_fields || config.form_fields,
      });
      setTitle(savedData.title || title);

      // 如果有 editorSDK，更新 attrs
      if (editorSDK && savedData.id) {
        editorSDK.changeCompAttr(layer.elemId, {
          formConfigId: savedData.id,
          worksId: worksId,
        });
      }
    } catch (e: any) {
      setError(String(e?.message || '保存失败'));
      throw e;
    }
  };

  const value: RSVPContextValue = {
    loading,
    error,
    config,
    configId,
    title,
    fields,
    worksId,
    setTitle: handleTitleChange,
    setConfig: handleConfigChange,
    setFields: handleFieldsChange,
    handleSave,
    showEditDialog,
    setShowEditDialog,
  };

  return <RSVPContext.Provider value={value}>{children}</RSVPContext.Provider>;
}

export function useRSVP() {
  const context = useContext(RSVPContext);
  if (!context) {
    throw new Error('useRSVP must be used within RSVPProvider');
  }
  return context;
}
