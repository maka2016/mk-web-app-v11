'use client';
import { getPageId } from '@/services';
import { trpc } from '@/utils/trpc';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getDefaultFields,
  LEGACY_RSVP_DISPLAY_MODE,
  parseRSVPFormFields,
  parseRSVPSuccessFeedbackConfig,
  RSVPDisplayMode,
  RSVPField,
  RsvpFormConfigEntityForUi,
  toRSVPFormFieldsJson,
  toRSVPSuccessFeedbackConfigJson,
} from './type';

interface RSVPContextValue {
  isTemplate: boolean;
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
  displayMode: RSVPDisplayMode;
  setDisplayMode: (mode: RSVPDisplayMode) => void;
  handleSave: () => Promise<void>;

  // 编辑器相关
  showEditDialog: boolean;
  setShowEditDialog: (show: boolean) => void;
}

const RSVPContext = createContext<RSVPContextValue | null>(null);

interface RSVPProviderProps {
  /** 默认显示模式 */
  defaultDisplayMode?: RSVPDisplayMode;
  /** 作品ID（可选，如果不提供则从attrs或getPageId获取） */
  worksId?: string;
  /** 是否允许创建配置（默认true，如果有worksId则允许创建） */
  canCreate?: boolean;
  children: React.ReactNode;
}

export function RSVPProvider({
  defaultDisplayMode = LEGACY_RSVP_DISPLAY_MODE,
  worksId: providedWorksId,
  canCreate = true,
  children,
}: RSVPProviderProps) {
  // 优先使用提供的worksId，其次使用attrs中的worksId，最后使用getPageId()
  const currWorksId = providedWorksId || getPageId();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfigState] = useState<RsvpFormConfigEntityForUi | null>(
    null
  );
  const [configId, setConfigId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('诚邀');
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [displayMode, setDisplayModeState] =
    useState<RSVPDisplayMode>(defaultDisplayMode);
  const isTemplate = /^T_/gi.test(getPageId() || '');

  useEffect(() => {
    setDisplayModeState(defaultDisplayMode);
  }, [defaultDisplayMode]);

  // displayMode变更仅更新本地状态，不再更新画布数据
  const handleDisplayModeChange = (mode: RSVPDisplayMode) => {
    setDisplayModeState(mode);
  };

  // 从 config 中提取 fields，合并远程配置和系统默认字段
  // 确保所有系统字段都显示出来
  const fields: RSVPField[] = useMemo(() => {
    if (!config) return [];

    // 获取远程配置中的字段
    const remoteFields = parseRSVPFormFields(config.form_fields);

    // 获取系统默认字段
    const systemFields = getDefaultFields();

    // 创建远程字段的 Map，方便查找
    const remoteFieldsMap = new Map<string, RSVPField>();
    remoteFields.forEach(field => {
      remoteFieldsMap.set(field.id, field);
    });

    // 合并系统字段：以系统默认字段为基础，如果远程配置中有对应的系统字段，则合并属性
    const mergedSystemFields = systemFields.map(systemField => {
      const remoteField = remoteFieldsMap.get(systemField.id);
      if (remoteField && remoteField.isSystem) {
        // 远程配置中有对应的系统字段，合并属性（保留用户的修改）
        // 但确保 isSystem 始终为 true
        return {
          ...systemField,
          ...remoteField,
          isSystem: true, // 确保系统字段标识不被覆盖
        };
      }
      // 远程配置中没有，使用系统默认值
      return systemField;
    });

    // 获取所有非系统字段（用户自定义的字段）
    const customFields = remoteFields.filter(field => !field.isSystem);
    // 最终字段：先系统字段，再自定义字段
    return [...mergedSystemFields, ...customFields];
  }, [config]);

  // 加载配置
  // 现在RSVP配置直接关联到worksId，不再依赖画布数据
  useEffect(() => {
    // 模板模式：从模版的rsvp_config字段读取配置
    if (isTemplate) {
      (async () => {
        setLoading(true);
        setError(null);
        try {
          if (!currWorksId) {
            setError('无法获取模版ID，无法加载RSVP配置');
            setLoading(false);
            return;
          }

          // 获取模版详情
          const template = await trpc.template.findById.query({
            id: currWorksId,
          });

          if (template && template.rsvp_config) {
            // 模版有RSVP配置，使用模版的配置
            const rsvpConfig = template.rsvp_config as any;
            const defaultFields = getDefaultFields();
            const remoteFields = parseRSVPFormFields(rsvpConfig.form_fields);

            // 合并系统字段和远程字段
            const remoteFieldsMap = new Map<string, RSVPField>();
            remoteFields.forEach(field => {
              remoteFieldsMap.set(field.id, field);
            });

            const mergedSystemFields = getDefaultFields().map(systemField => {
              const remoteField = remoteFieldsMap.get(systemField.id);
              if (remoteField && remoteField.isSystem) {
                return {
                  ...systemField,
                  ...remoteField,
                  isSystem: true,
                };
              }
              return systemField;
            });

            const customFields = remoteFields.filter(field => !field.isSystem);
            const mergedFields = [...mergedSystemFields, ...customFields];

            const successFeedbackConfig = parseRSVPSuccessFeedbackConfig(
              rsvpConfig.success_feedback_config
            );

            setConfigState({
              works_id: currWorksId,
              title: rsvpConfig.title || '诚邀',
              desc: rsvpConfig.desc ?? '',
              form_fields: { fields: mergedFields },
              allow_multiple_submit: true,
              require_approval: false,
              max_submit_count: null,
              submit_deadline: null,
              enabled: rsvpConfig.enabled ?? false,
              collect_form: rsvpConfig.collect_form ?? false,
              success_feedback_config: successFeedbackConfig,
              deleted: false,
            });
            setConfigId(null); // 模版模式下没有configId
            setTitle(rsvpConfig.title || '诚邀');
            setLoading(false);
          } else {
            // 模版没有RSVP配置，使用默认配置
            const defaultFields = getDefaultFields();
            const defaultConfig: RsvpFormConfigEntityForUi = {
              works_id: currWorksId || '',
              title: '诚邀',
              desc: '',
              form_fields: { fields: defaultFields },
              allow_multiple_submit: true,
              require_approval: false,
              max_submit_count: null,
              submit_deadline: null,
              enabled: false,
              collect_form: false,
              deleted: false,
            };
            setConfigState(defaultConfig);
            setConfigId(null);
            setTitle('诚邀');
            setLoading(false);
          }
        } catch (e: any) {
          setError(String(e?.message || '加载失败'));
          setLoading(false);
        }
      })();
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 如果没有有效的worksId，无法加载配置
        if (!currWorksId) {
          setError('无法获取作品ID，无法加载RSVP配置');
          setLoading(false);
          return;
        }

        // 通过worksId查询
        const existingConfig = await trpc.rsvp.getFormConfigByWorksId.query({
          works_id: currWorksId,
        });

        if (existingConfig && !existingConfig.deleted) {
          // 已有配置，直接使用
          const existingData = existingConfig as any;
          // 解析成功反馈配置
          const successFeedbackConfig = parseRSVPSuccessFeedbackConfig(
            existingData.success_feedback_config
          );
          setConfigState({
            ...existingData,
            allow_multiple_submit: true,
            require_approval: false,
            max_submit_count: null,
            submit_deadline: null,
            success_feedback_config: successFeedbackConfig,
          });
          setConfigId(existingData.id);
          setTitle(existingData.title || '诚邀');
          setLoading(false);
        } else {
          // 没有配置，根据canCreate决定是否创建
          if (canCreate) {
            // 允许创建：创建新配置
            const defaultFields = getDefaultFields();
            const created = await trpc.rsvp.upsertFormConfig.mutate({
              works_id: currWorksId,
              title: '诚邀',
              desc: '',
              form_fields: toRSVPFormFieldsJson(defaultFields),
              allow_multiple_submit: true,
              require_approval: false,
              max_submit_count: null,
              submit_deadline: null,
              enabled: false,
            });
            const createdData = created as any;
            setConfigState(createdData);
            setConfigId(createdData.id);
            setTitle(createdData.title || '诚邀');
            setLoading(false);
          } else {
            // 不允许创建：显示错误
            setError('表单配置不存在，无法提交。请联系管理员配置表单。');
            setLoading(false);
          }
        }
      } catch (e: any) {
        setError(String(e?.message || '加载失败'));
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currWorksId, isTemplate]);

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
  // 现在RSVP配置直接保存到数据库，不再更新画布数据
  const handleSave = async () => {
    if (!config || !currWorksId) return;

    // 模板模式：保存到模版的rsvp_config字段
    if (isTemplate) {
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

        const rsvpConfig = {
          title: title || '诚邀',
          desc: config.desc ?? null,
          form_fields: toRSVPFormFieldsJson(fields.map(ensureOptions)),
          success_feedback_config: toRSVPSuccessFeedbackConfigJson(
            config.success_feedback_config
          ),
          enabled: config.enabled ?? false,
          collect_form: config.enabled ?? false, // collect_form 跟随 enabled
        };

        // 更新模版的rsvp_config字段
        await trpc.template.update.mutate({
          id: currWorksId,
          rsvp_config: rsvpConfig,
        });

        // 更新本地状态 - 使用保存后的值，确保 enabled 状态正确更新
        // 注意：需要创建新对象以确保 React 检测到状态变化
        setConfigState({
          ...config,
          title: title || '诚邀',
          enabled: rsvpConfig.enabled, // 直接使用保存后的值，不使用 ??
          collect_form: rsvpConfig.collect_form, // 直接使用保存后的值
        });
      } catch (e: any) {
        setError(String(e?.message || '保存失败'));
        throw e;
      }
      return;
    }

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
        works_id: currWorksId,
        title: title || '诚邀',
        desc: config.desc ?? null,
        form_fields: toRSVPFormFieldsJson(fields.map(ensureOptions)),
        success_feedback_config: toRSVPSuccessFeedbackConfigJson(
          config.success_feedback_config
        ),
        allow_multiple_submit: true, // 固定值：允许，不可配置
        require_approval: false, // 固定值：不需要，不可配置
        max_submit_count: null, // 固定值：无限，不可配置
        submit_deadline: null, // 固定值：无限期，不可配置
        enabled: config.enabled ?? false,
        collect_form: config.enabled ?? false, // collect_form 跟随 enabled
      } as any;

      const saved = await trpc.rsvp.upsertFormConfig.mutate(payload);
      const savedData = saved as any;
      setConfigId(savedData.id);

      // 解析保存后的成功反馈配置
      const savedSuccessFeedbackConfig = parseRSVPSuccessFeedbackConfig(
        savedData.success_feedback_config
      );

      // 更新 config 状态，确保使用固定默认值
      // 注意：enabled 可能是 false，不能使用 ??，需要明确检查
      // 直接使用 savedData 中的值，确保状态正确更新
      setConfigState({
        ...config,
        id: savedData.id,
        title: savedData.title || title,
        desc: savedData.desc ?? config.desc,
        enabled: savedData.enabled !== undefined && savedData.enabled !== null ? savedData.enabled : (config.enabled ?? false),
        collect_form: savedData.collect_form !== undefined && savedData.collect_form !== null ? savedData.collect_form : (savedData.enabled !== undefined && savedData.enabled !== null ? savedData.enabled : (config.enabled ?? false)), // collect_form 跟随 enabled
        allow_multiple_submit: true, // 固定值：允许，不可配置
        require_approval: false, // 固定值：不需要，不可配置
        max_submit_count: null, // 固定值：无限，不可配置
        submit_deadline: null, // 固定值：无限期，不可配置
        form_fields: savedData.form_fields || config.form_fields,
        success_feedback_config: savedSuccessFeedbackConfig,
      });
      setTitle(savedData.title || title);
    } catch (e: any) {
      setError(String(e?.message || '保存失败'));
      throw e;
    }
  };

  const value: RSVPContextValue = {
    isTemplate,
    loading,
    error,
    config,
    configId,
    title,
    fields,
    worksId: currWorksId || '', // 使用当前作品ID
    displayMode,
    setTitle: handleTitleChange,
    setConfig: handleConfigChange,
    setFields: handleFieldsChange,
    setDisplayMode: handleDisplayModeChange,
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
