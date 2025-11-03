import React, { useEffect, useState } from 'react';
import './index.scss';
import cls from 'classnames';
import { Icon } from '@workspace/ui/components/Icon';
import { MkPinTuanProps } from '../../shared';

import { Separator } from '@workspace/ui/components/separator';
import { formEntityServiceApi, getPageId, getUid } from '@mk/services';

interface Props {
  onFormValueChange: (values: any) => void;
  formControledValues: MkPinTuanProps;
  onChange?: (values: any) => void;
}

const fields = [
  {
    label: '学员姓名',
    id: 'name',
    required: true,
  },
  {
    label: '联系电话',
    id: 'phone',
    required: true,
  },
  {
    label: '选择课程',
    desc: '单选',
    id: 'course',
  },
  {
    label: '孩子年龄',
    id: 'age',
  },
  {
    label: '备注信息',
    id: 'remarks',
  },
];

const BaoMingEditingPanel = (props: Props) => {
  const { onFormValueChange, formControledValues, onChange } = props;
  const [selectedFields, setSelectedFields] = useState<string[]>(
    formControledValues.collectFields || ['name', 'phone']
  );
  const [feedback, setFeedback] = useState(
    formControledValues.feedback ||
      '感谢您的报名！请添加教务老师微信，我们会尽快与您联系安排课程。'
  );

  const [show, setShow] = useState(
    formControledValues !== undefined ? formControledValues.show : true
  );
  const [courseOptions, setCourseOptions] = useState(
    formControledValues.courseOptions || ''
  );

  const getFormEntity = async () => {
    const res: any = await formEntityServiceApi.findOne(
      formControledValues.formRefId
    );

    if (res.data.worksId !== getPageId()) {
      const content = res.data.content;
      delete content.formId;
      const _res = await formEntityServiceApi.create({
        content: content,
        works_id: getPageId(),
        uid: +getUid(),
      });

      console.log('_res', _res);
      onFormValueChange({
        formRefId: _res.data.formId,
      });
    }
  };

  useEffect(() => {
    getFormEntity();
  }, []);

  const handleFieldClick = (key: string) => {
    const nextValue = selectedFields.includes(key)
      ? selectedFields.filter(item => item !== key)
      : [...selectedFields, key];
    setSelectedFields(nextValue);
    onFormValueChange({
      collectFields: nextValue,
    });
    onChange?.({
      collectFields: nextValue,
    });
  };

  return (
    <div className={cls(['content'])}>
      <div className='label'>选择需要收集的报名信息</div>
      <div className='desc'>标有*的为必选字段，已默认选择</div>
      <div className='fields_list'>
        {fields.map(item => (
          <div
            className={cls('item')}
            key={item.id}
            onClick={() => {
              if (item.required && selectedFields.includes(item.id)) {
                return;
              }

              handleFieldClick(item.id);
            }}
          >
            {selectedFields.includes(item.id) ? (
              item.required ? (
                <Icon name='duoxuan' size={20} color='#BFBFBF' stroke='#fff' />
              ) : (
                <Icon
                  name='duoxuan'
                  size={20}
                  color='var(--theme-color)'
                  stroke='#000'
                />
              )
            ) : (
              <Icon name='duoxuan1' size={20} stroke='#000000' color='#fff' />
            )}
            <div className='item_label'>{item.label}</div>
            <div className='item_desc'>{item.desc}</div>
          </div>
        ))}
      </div>

      {selectedFields.includes('course') && (
        <div className='course'>
          <div className='flex items-center mb-1'>
            <div className='course_title'>课程选项配置</div>
            <div className='desc'>*输入中英文逗号或空格分隔多个课程选项</div>
          </div>
          <textarea
            placeholder='请输入，如：基础班，提高班，精品班'
            value={courseOptions}
            onChange={e => {
              setCourseOptions(e.target.value);
              onFormValueChange({
                courseOptions: e.target.value,
              });
              onChange?.({
                courseOptions: e.target.value,
              });
            }}
          />
          {courseOptions && (
            <>
              <div className='course_label'>选项预览</div>
              <div className='flex items-center gap-1'>
                {courseOptions
                  .split(/[，,\s]+/)
                  .filter(Boolean)
                  .map((item, index) => (
                    <div key={index} className='course_item'>
                      {item}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      <Separator
        style={{
          margin: '12px 0',
        }}
      />
      <div className='label'>报名成功反馈的信息</div>
      <div className='desc mb-1'>
        标有*建议控制在1-2句话，简洁明了地告知学员后续操作
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
  );
};

export default BaoMingEditingPanel;
