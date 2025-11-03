import { move } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import cls from 'classnames';
import { CircleCheck, Power, PowerOff } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MkBaoMingV2Props } from '../../shared';
import './index.scss';

interface Props {
  onClose: () => void;
  onFormValueChange: (values: any) => void;
  formControledValues: MkBaoMingV2Props;
  editorCtx: any;
  showContactsSetting?: boolean;
  onChange?: (values: any) => void;
}

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

  const { ref } = useSortable({ id: item.id, index, handle: handle.current });

  return (
    <div className={cls('item')} key={item.id} ref={ref}>
      <div
        id='field_drag'
        ref={handle}
        className='flex items-center justify-center'
      >
        <Icon name='drag' size={16} color='#000' />
      </div>
      <div className='flex-1'>
        <div className='item_label'>
          {item.label}
          {item.required && <span className='required'>*</span>}
          <div className='item_desc'>
            {fieldTypes.find(i => i.value === item.type)?.label}
          </div>
        </div>

        {item.options && ['radio', 'checkbox'].includes(item.type) && (
          <div className='flex items-center gap-1 mt-1'>
            {item.options
              .split(/[，,\s]+/)
              .filter(Boolean)
              .map((item: string, index: number) => (
                <div key={index} className='course_item'>
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
      <Icon
        name='edit'
        size={16}
        onClick={() => {
          onEdit();
          // setEditingField(item);
          // setShowFieldSetting(true);
        }}
      />
      <Icon name='delete-g8c551hn' size={16} onClick={() => onDelete()} />
      {/* <div className="item_desc">{item.desc}</div> */}
    </div>
  );
}

// const fields = [
//   {
//     label: "参会姓名",
//     id: "name",
//     required: true,
//   },
//   {
//     label: "联系电话",
//     id: "phone",
//     required: true,
//   },
//   {
//     label: "所在单位",
//     desc: "单选",
//     id: "organization",
//   },
//   {
//     label: "职务职位",
//     id: "position",
//   },
//   {
//     label: "备注信息",
//     id: "remarks",
//   },
// ];

const EditingPanel = (props: Props) => {
  const {
    onClose,
    onFormValueChange,
    formControledValues,
    editorCtx,
    onChange,
  } = props;

  // const [selectedFields, setSelectedFields] = useState<string[]>(
  //   formControledValues.collectFields || ["name", "phone"]
  // );
  const [feedback, setFeedback] = useState(
    formControledValues.feedback ||
      '报名成功！会议信息将发送到您的邮箱。请保持手机畅通，我们会在会议前一天确认参会信息。'
  );
  const [customFields, setCustomFields] = useState(
    formControledValues.customFields || []
  );

  const [show, setShow] = useState(
    formControledValues !== undefined ? formControledValues.show : true
  );

  const [showFieldSetting, setShowFieldSetting] = useState(false);
  const [editingField, setEditingField] = useState<any>({
    label: '',
    type: 'text',
    required: false,
    options: '',
  });

  // const handleFieldClick = (key: string) => {
  //   const nextValue = selectedFields.includes(key)
  //     ? selectedFields.filter((item) => item !== key)
  //     : [...selectedFields, key];
  //   setSelectedFields(nextValue);
  //   onFormValueChange({
  //     collectFields: nextValue,
  //   });
  //   onChange?.({
  //     collectFields: nextValue,
  //   });
  // };

  const onAddField = () => {
    if (!editingField.label) {
      toast.error('请填写字段名称');
      return;
    }

    editingField.id = nanoid(8);

    const nextValue = [...customFields, editingField];
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
  };

  const onDeleteField = (id: string) => {
    const nextValue = customFields.filter(item => item.id !== id);
    setCustomFields(nextValue);
    onFormValueChange({
      customFields: nextValue,
    });
  };

  const handleDragEnd = (e: any) => {
    console.log(e.operation.source.sortable.index);
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

  return (
    <>
      <div className='mk_baoming_editing_container'>
        <div className='title'>
          <div className='flex items-center gap-1'>
            <Icon name='form-fill' />
            <span>会议报名表单设置</span>
          </div>
          <div className='desc'>配置会议报名表单的内容和反馈信息</div>
        </div>
        <Icon name='close' onClick={onClose} size={22} className='close_icon' />
        <div className={cls(['content'])}>
          <div className='fields_list'>
            {/* {customFields.map((item, index) => (
              <div className={cls("item")} key={item.id}>
                <div className="flex-1">
                  <div className="item_label">
                    {item.label}
                    {item.required && <span className="required">*</span>}
                    <div className="item_desc">
                      {fieldTypes.find((i) => i.value === item.type)?.label}
                    </div>
                  </div>

                  {item.options &&
                    ["radio", "checkbox"].includes(item.type) && (
                      <div className="flex items-center gap-1 mt-1">
                        {editingField.options
                          .split(/[，,\s]+/)
                          .filter(Boolean)
                          .map((item: string, index: number) => (
                            <div key={index} className="course_item">
                              {item}
                            </div>
                          ))}
                      </div>
                    )}
                </div>
                <Icon
                  name="up-bold"
                  size={16}
                  color={index === 0 ? "rgba(0,0,0,0.45)" : "#000"}
                  onClick={() => onUpFieldItem(index)}
                />
                <Icon
                  name="down-bold"
                  size={16}
                  color={
                    index === customFields.length - 1
                      ? "rgba(0,0,0,0.45)"
                      : "#000"
                  }
                  onClick={() => onDownFieldItem(index)}
                />

                <Icon
                  name="edit"
                  size={16}
                  color="#000"
                  onClick={() => {
                    setEditingField(item);
                    setShowFieldSetting(true);
                  }}
                />
                <Icon
                  name="delete-g8c551hn"
                  size={16}
                  onClick={() => onDeleteField(item.id)}
                />
              </div>
            ))} */}
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

          <Button
            variant='outline'
            className='add_field_btn'
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

          <Separator
            style={{
              margin: '12px 0',
            }}
          />
          <div className='label'>报名成功反馈的信息</div>
          <div className='desc mb-1'>
            标有*建议控制在1-建议控制在1-2句话，简洁明了地告知用户后续操作
          </div>
          <textarea
            placeholder='请输入'
            value={feedback}
            onChange={e => {
              setFeedback(e.target.value);
              onFormValueChange({
                feedback: e.target.value,
              });
              onChange?.({
                feedback: e.target.value,
              });
            }}
          ></textarea>
        </div>
        <div className='footer'>
          {!show && (
            <>
              <Button
                variant='outline'
                className='flex-1 hover:bg-background'
                size='lg'
                onClick={() => onClose()}
              >
                暂不开启
              </Button>
              <Button
                className='flex-1 gap-1 open_btn'
                size='lg'
                onClick={() => {
                  setShow(true);
                  onFormValueChange({
                    show: true,
                  });
                  onChange?.({
                    show: true,
                  });
                  onClose();
                }}
              >
                <Power />
                开启功能
              </Button>
            </>
          )}
          {show && (
            <>
              <Button
                className='flex-1 close_btn hover:bg-background'
                size='lg'
                variant='outline'
                onClick={() => {
                  setShow(false);
                  onFormValueChange({
                    show: false,
                  });
                  onChange?.({
                    show: false,
                  });
                  onClose();
                }}
              >
                <PowerOff size={20} />
                关闭功能
              </Button>
              <Button
                className='flex-1 gap-1 open_btn'
                size='lg'
                onClick={() => {
                  onClose();
                  toast.success('报名表单设置已完成');
                }}
              >
                <CircleCheck size={20} />
                完成设置
              </Button>
            </>
          )}
        </div>
      </div>
      <ResponsiveDialog
        isOpen={showFieldSetting}
        onOpenChange={setShowFieldSetting}
      >
        <div className='field_setting'>
          <div className='field_setting_title'>
            {editingField.id ? '修改自定义字段' : '添加自定义字段'}
          </div>
          <div className='field_setting_item'>
            <div className='field_setting_item_title'>字段名称</div>
            <Input
              value={editingField.label}
              onChange={e => {
                setEditingField({
                  ...editingField,
                  label: e.target.value,
                });
              }}
              placeholder='请输入，如：学历信息'
              className='w-full'
            />
          </div>

          <div className='field_setting_item'>
            <div className='field_setting_item_title'>字段类型</div>
            <div className='field_types'>
              {fieldTypes.map(item => (
                <div
                  key={item.value}
                  className={cls([
                    'field_type_item',
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
                    <Icon className='selected' name='selected' size={20} />
                  )}
                </div>
              ))}
            </div>
            {['radio', 'checkbox'].includes(editingField.type) && (
              <div className='options'>
                <div className='field_setting_item_title'>选项配置</div>
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
                    <div className='course_label'>选项预览</div>
                    <div className='flex items-center gap-1'>
                      {editingField.options
                        .split(/[，,\s]+/)
                        .filter(Boolean)
                        .map((item: string, index: number) => (
                          <div key={index} className='course_item'>
                            {item}
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className='field_setting_item'>
            <div
              className='field_required'
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

          <div className='field_setting_footer'>
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
    </>
  );
};

export default EditingPanel;
