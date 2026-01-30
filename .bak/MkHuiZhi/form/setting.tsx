import {
  EditorSDK,
  LayerElemItem,
} from '@/components/GridEditorV3/works-store/types';
import { formEntityServiceApi, getPageId, getUid } from '@/services';
import { move } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import cls from 'classnames';
import { Upload } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CustomFields, MkHuiZhiProps } from '../shared/types';
import styles from './index.module.scss';

interface SettingAttrsData {
  MkBulletScreen_v2: LayerElemItem | null;
  MkGift: LayerElemItem | null;
}

interface Props {
  onFormValueChange: (value: any) => void;
  onChange: (value: SettingAttrsData) => void;
  compAttrsMap: SettingAttrsData;
  onClose: () => void;
  editorSDK?: EditorSDK;
  editorCtx?: any;
  formControledValues: MkHuiZhiProps;
}

const FormContent: Record<string, any> = {
  MkGift: {
    formName: '礼物',
    fields: [
      {
        id: 'content',
        label: '内容',
      },
      {
        id: 'nickname',
        label: '姓名',
      },
    ],
  },
  MkBulletScreen_v2: {
    formName: '弹幕',
    fields: [
      {
        id: 'content',
        label: '弹幕内容',
      },
      {
        id: 'headImg',
        label: '微信头像',
      },
      {
        id: 'nickname',
        label: '微信昵称',
      },
    ],
  },
  MkHuiZhi: {
    formName: '回执',
    fields: [
      {
        label: '姓名',
        id: 'name',
      },
      {
        label: '出席人数',
        id: 'guestCount',
      },
    ],
  },
};

const fieldTypes = [
  {
    label: '文本',
    value: 'text',
  },
  {
    label: '手机',
    value: 'tel',
  },
  {
    label: '单选',
    value: 'radio',
  },
  {
    label: '多选',
    value: 'checkbox',
  },
];

function Sortable({
  item,
  index,
  onEdit,
  onDelete,
  onUpFieldItem,
  onDownFieldItem,
  length,
}: any) {
  const handle = useRef<any>(null);

  const { ref } = useSortable({ id: item.id, index, handle: handle });

  return (
    <div className={styles.item} key={item.id} ref={ref}>
      <div
        id='field_drag'
        ref={handle}
        className='flex items-center justify-center'
      >
        <Icon name='drag' size={16} color='#000' />
      </div>
      <div className='flex-1'>
        <div className={styles.item_label}>
          {item.label}
          {item.required && <span className='required'>*</span>}
          <div className={styles.item_desc}>
            {fieldTypes.find(i => i.value === item.type)?.label}
          </div>
        </div>

        {item.options && ['radio', 'checkbox'].includes(item.type) && (
          <div className='flex items-center gap-1 mt-1'>
            {item.options
              .split(/[，,\s]+/)
              .filter(Boolean)
              .map((item: string, index: number) => (
                <div key={index} className={styles.course_item}>
                  {item}
                </div>
              ))}
          </div>
        )}
      </div>

      <Icon
        name='up-bold'
        size={16}
        color={index === 0 ? 'rgba(0,0,0,0.45)' : '#000'}
        onClick={() => onUpFieldItem()}
      />
      <Icon
        name='down-bold'
        size={16}
        color={index === length - 1 ? 'rgba(0,0,0,0.45)' : '#000'}
        onClick={() => onDownFieldItem()}
      />
      <div className='flex items-center gap-1 text-[#3358D4]'>
        <Icon
          name='edit'
          size={16}
          onClick={() => {
            onEdit();
          }}
        />
        <span className='text-xs flex-shrink-0'>编辑</span>
      </div>

      <Icon name='delete-g8c551hn' size={16} onClick={() => onDelete()} />
      {/* <div className="item_desc">{item.desc}</div> */}
    </div>
  );
}

const MkHuiZhiSetting = (props: Props) => {
  const {
    onClose,
    onFormValueChange,
    formControledValues,
    editorSDK,
    editorCtx,
  } = props;
  const [compAttrsMap, setCompAttrsMap] = useState(props.compAttrsMap);
  const [feedback, setFeedback] = useState(
    formControledValues.feedback ||
      '感谢您的回复！我们期待与您共同分享这个美好时刻。'
  );
  const [feedbackPicture, setFeedbackPicture] = useState(
    formControledValues.feedbackPicture || ''
  );
  const [customFields, setCustomFields] = useState<CustomFields>(
    formControledValues.customFields || []
  );
  console.log('customFields', customFields);

  const [showFieldSetting, setShowFieldSetting] = useState(false);
  const [editingField, setEditingField] = useState<any>({
    label: '',
    type: 'text',
    required: false,
    options: '',
  });

  const addComponent = async (elementRef: string) => {
    if (!editorSDK) {
      return;
    }
    let formRefId = '';

    if (FormContent[elementRef]) {
      const res = await formEntityServiceApi.create({
        uid: +getUid(),
        works_id: getPageId(),
        type: elementRef,
        content: FormContent[elementRef],
      });

      if (res.data.formId) {
        formRefId = res.data.formId;
      }
    }

    editorSDK?.addComponent({
      elementRef: elementRef,
      attrs: {
        show: true,
        formRefId: formRefId,
      },
    });
  };

  const onChange = (value: SettingAttrsData) => {
    setCompAttrsMap(value);
    props.onChange(value);
  };

  const onAddField = () => {
    if (!editingField.label) {
      toast.error('请填写字段名称');
      return;
    }

    const newEditingField = { ...editingField, id: nanoid(8) };

    const nextValue = [...customFields, newEditingField];
    setCustomFields(nextValue);
    onFormValueChange({
      customFields: nextValue,
    });
    setShowFieldSetting(false);
  };

  const onChangeField = () => {
    const index = customFields.findIndex(item => item.id === editingField.id);
    const nextValue = [...customFields];
    nextValue[index] = editingField;
    setCustomFields(nextValue);
    onFormValueChange({
      customFields: nextValue,
    });
    setShowFieldSetting(false);
  };

  const onDeleteField = (id: string) => {
    const nextValue = customFields.filter(item => item.id !== id);
    setCustomFields(nextValue);
    onFormValueChange({
      customFields: nextValue,
    });
  };

  const onUpFieldItem = (index: number) => {
    if (index === 0) {
      return;
    }
    const nextValue = [...customFields];
    const item = nextValue[index];
    nextValue[index] = nextValue[index - 1];
    nextValue[index - 1] = item;
    setCustomFields(nextValue);
    onFormValueChange({
      customFields: nextValue,
    });
  };

  const onDownFieldItem = (index: number) => {
    if (index === customFields.length - 1) {
      return;
    }
    const nextValue = [...customFields];
    const item = nextValue[index];
    nextValue[index] = nextValue[index + 1];
    nextValue[index + 1] = item;
    setCustomFields(nextValue);
    onFormValueChange({
      customFields: nextValue,
    });
  };

  const onUploadFeedbackPicture = () => {
    console.log('editorCtx', editorCtx);
    // 处理图片上传
    editorCtx?.utils.showSelector({
      onSelected: (params: any) => {
        if (params.ossPath || params.url) {
          const imageSource = params.url || params.ossPath;
          console.log('imageSource', imageSource);
          setFeedbackPicture(imageSource);
          onFormValueChange({
            feedbackPicture: imageSource,
          });
        }
      },
      type: 'picture',
    });
  };

  return (
    <div className='relative'>
      <Icon
        name='close'
        size={20}
        className={styles.close}
        color='#000'
        onClick={() => onClose()}
      />
      <div className={styles.title}>
        <div className='flex items-center gap-1'>
          <Icon name='form-fill' />
          <span>表单设置</span>
        </div>
        <div className={styles.desc}>配置表单项和反馈信息，拖拽可排序</div>
      </div>
      <Separator />
      <div className={styles.content}>
        <div className={styles.card}>
          <div className='flex items-center justify-between mb-3'>
            <div className={styles.tit}>表单项配置</div>
            <Button
              variant='outline'
              className={styles.add_field_btn}
              size='sm'
              onClick={() => {
                setShowFieldSetting(true);
                setEditingField({
                  label: '',
                  type: 'text',
                  required: false,
                  options: '',
                });
              }}
            >
              <Icon name='add-one' size={16} />
              添加字段
            </Button>
          </div>
          <div className={styles.fields_list}>
            <DragDropProvider
              onDragEnd={event => {
                setCustomFields(items => move(items, event));
              }}
            >
              {customFields.map((item, index) => (
                <Sortable
                  key={item.id}
                  item={item}
                  index={index}
                  onEdit={() => {
                    setEditingField(item);
                    setShowFieldSetting(true);
                  }}
                  onDelete={() => onDeleteField(item.id)}
                  onUpFieldItem={() => onUpFieldItem(index)}
                  onDownFieldItem={() => onDownFieldItem(index)}
                  length={customFields.length}
                />
              ))}
            </DragDropProvider>
          </div>
        </div>

        <div className={styles.card}>
          <div className={cls([styles.tit, 'mb-2'])}>提交反馈</div>
          <div className={styles.subTitle}>成功提示信息</div>
          <textarea
            className={styles.textarea}
            placeholder='请输入'
            value={feedback}
            onChange={e => {
              setFeedback(e.target.value);
              onFormValueChange({
                feedback: e.target.value,
              });
            }}
          />
          <div className={styles.subTitle}>提示图片（可选）</div>
          <div
            className={styles.upload}
            onClick={() => onUploadFeedbackPicture()}
          >
            {feedbackPicture ? (
              <>
                <img
                  src={feedbackPicture}
                  alt='feedback'
                  className={styles.preview}
                />
                <Button
                  variant='outline'
                  size='xs'
                  className='absolute bottom-2'
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    setFeedbackPicture('');
                    onFormValueChange({
                      feedbackPicture: '',
                    });
                  }}
                >
                  删除图片
                </Button>
              </>
            ) : (
              <>
                <div className={styles.icon}>
                  <Upload size={16} className='text-gray-400 mb-1' />
                </div>
                <span>点击上传图片</span>
              </>
            )}
          </div>
        </div>
      </div>
      <ResponsiveDialog
        isOpen={showFieldSetting}
        onOpenChange={setShowFieldSetting}
      >
        <div className={styles.fieldSetting}>
          <div className={styles.fieldSettingTitle}>
            {editingField.id ? '修改自定义字段' : '添加自定义字段'}
          </div>
          <div className={styles.fieldSettingItem}>
            <div className={styles.fieldSettingItemTitle}>字段名称</div>
            <Input
              value={editingField.label}
              onChange={e => {
                setEditingField({
                  ...editingField,
                  label: e.target.value,
                });
              }}
              placeholder='请输入，如：学历信息'
              className={styles.fieldSettingItemInput}
            />
          </div>

          <div className={styles.fieldSettingItem}>
            <div className={styles.fieldSettingItemTitle}>字段类型</div>
            <div className={styles.fieldTypes}>
              {fieldTypes.map(item => (
                <div
                  key={item.value}
                  className={cls([
                    styles.fieldTypeItem,
                    editingField.type === item.value && 'active',
                  ])}
                  onClick={() => {
                    setEditingField({
                      ...editingField,
                      type: item.value,
                      options:
                        editingField.options ||
                        (item.value === 'radio' || item.value === 'checkbox'
                          ? '选项一，选项二，选项三'
                          : ''),
                    });
                  }}
                >
                  {item.label}
                  {editingField.type === item.value && (
                    <Icon
                      className={styles.selected}
                      name='selected'
                      size={20}
                    />
                  )}
                </div>
              ))}
            </div>
            {['radio', 'checkbox'].includes(editingField.type) && (
              <div className={styles.options}>
                <div className={styles.fieldSettingItemTitle}>选项配置</div>
                <textarea
                  placeholder='请输入，如：基础班，提高班，精品班'
                  value={editingField.options}
                  onChange={e => {
                    setEditingField({
                      ...editingField,
                      options: e.target.value,
                    });
                  }}
                />
                {editingField.options && (
                  <>
                    <div className={styles.course_label}>选项预览</div>
                    <div className='flex items-center gap-1'>
                      {editingField.options
                        .split(/[，,\s]+/)
                        .filter(Boolean)
                        .map((item: string, index: number) => (
                          <div key={index} className={styles.course_item}>
                            {item}
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className={styles.fieldSettingItem}>
            <div
              className={styles.fieldRequired}
              onClick={() => {
                setEditingField({
                  ...editingField,
                  required: !editingField.required,
                });
              }}
            >
              {editingField.required ? (
                <Icon
                  size={20}
                  name='danxuan-yixuan'
                  color='var(--theme-color)'
                />
              ) : (
                <Icon size={20} name='danxuan-weixuan' color='#E4E4E7' />
              )}
              <span>设为必填字段</span>
            </div>
          </div>

          <div className={styles.fieldSettingFooter}>
            <Button
              size='lg'
              variant='outline'
              className='flex-1 hover:bg-transparent'
              onClick={() => setShowFieldSetting(false)}
            >
              取消
            </Button>
            <Button
              size='lg'
              className='flex-1'
              onClick={() => {
                if (editingField.id) {
                  onChangeField();
                } else {
                  onAddField();
                }
              }}
            >
              {editingField.id ? '保存' : '添加字段'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default MkHuiZhiSetting;
