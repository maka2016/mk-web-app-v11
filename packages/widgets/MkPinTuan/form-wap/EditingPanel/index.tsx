import React, { useState } from 'react';
import './index.scss';
import cls from 'classnames';
import { Icon } from '@workspace/ui/components/Icon';
import { MkPinTuanProps } from '../../shared';
import toast from 'react-hot-toast';
import { Button } from '@workspace/ui/components/button';
import { CircleCheck, Power, PowerOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { getPageId, getUid, request } from '@mk/services';
import { worksServerV2 } from '../../shared/api';
import BoostEditingPanel from './BoostActivity';
import BaoMingEditingPanel from './BaoMing';
import GroupBuyEditingPanel from './GroupBuy';

interface Props {
  onClose: () => void;
  onFormValueChange: (values: any) => void;
  formControledValues: MkPinTuanProps;
  editorCtx: any;
  showContactsSetting?: boolean;
  onChange?: (values: any) => void;
}

const activityTypes = [
  {
    label: '课程报名',
    desc: '收集报名信息',
    value: 'baoming',
  },
  {
    label: '好友助力',
    desc: '邀请好友助力获得优惠',
    value: 'boost',
  },
  {
    label: '拼团',
    desc: '邀请好友共同拼课，成团即享优惠价',
    value: 'groupbuy',
  },
];

const title: Record<string, string> = {
  boost: '好友助力',
  groupbuy: '拼团',
  baoming: '课程报名',
};

const EditingPanel = (props: Props) => {
  const { onClose, onFormValueChange, formControledValues, onChange } = props;
  const [show, setShow] = useState(
    formControledValues !== undefined ? formControledValues.show : true
  );

  const [type, setType] = useState(formControledValues.type || 'baoming');
  const [boostActivityId, setBoostActivityId] = useState(
    formControledValues.boostActivityId
  );
  const [groupBuyActivityId, setGroupBuyActivityId] = useState(
    formControledValues.groupBuyActivityId
  );
  console.log('formControledValues', formControledValues);

  const onChangeType = async (value: 'baoming' | 'boost' | 'groupbuy') => {
    if (value === 'boost' && !formControledValues.boostActivityId) {
      const res: any = await request.post(`${worksServerV2()}/boost-activity`, {
        requiredPeople: 10,
        timeLimit: 24,
        uid: +getUid(),
        worksId: getPageId(),
        type: 'once',
      });

      if (!res.id) {
        toast.error('创建助力活动失败');
        return;
      }

      onFormValueChange({
        type: value,
        boostActivityId: res.id,
      });
      setBoostActivityId(res.id);
    } else if (
      value === 'groupbuy' &&
      !formControledValues.groupBuyActivityId
    ) {
      const res: any = await request.post(`${worksServerV2()}/group-buy`, {
        requiredPeople: 3,
        timeLimit: 24,
        uid: +getUid(),
        worksId: getPageId(),
      });

      if (!res.id) {
        toast.error('创建拼团活动失败');
        return;
      }

      setGroupBuyActivityId(res.id);

      onFormValueChange({
        type: value,
        groupBuyActivityId: res.id,
      });
    } else {
      onFormValueChange({
        type: value,
      });
    }
    setType(value);
  };

  const renderContent = () => {
    if (type === 'boost') {
      return (
        <BoostEditingPanel
          onChange={onChange}
          boostActivityId={boostActivityId}
          formControledValues={formControledValues}
          onFormValueChange={onFormValueChange}
        />
      );
    }

    if (type === 'groupbuy') {
      return (
        <GroupBuyEditingPanel
          onChange={onChange}
          groupBuyActivityId={groupBuyActivityId}
          formControledValues={formControledValues}
          onFormValueChange={onFormValueChange}
        />
      );
    }

    return (
      <BaoMingEditingPanel
        onChange={onChange}
        formControledValues={formControledValues}
        onFormValueChange={onFormValueChange}
      />
    );
  };

  return (
    <div className='mk_pintuan_editing_container'>
      <div className='title'>
        <div className='flex items-center gap-1'>
          <Icon name={type === 'boost' ? 'team' : 'form-fill'} />
          <span>{title[type]}设置</span>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className='activity_type_selector'>
                <Icon name='switch' size={16} />
                <span>更换互动工具</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {activityTypes.map(item => (
                <DropdownMenuItem
                  key={item.value}
                  className={cls([
                    'activity_type_item',
                    item.value === type && 'active',
                  ])}
                  onClick={() => {
                    if (item.value === type) {
                      return;
                    }
                    onChangeType(item.value as 'baoming' | 'boost');
                  }}
                >
                  <div className='label'>{item.label}</div>
                  <div className='desc'>{item.desc}</div>
                  {item.value === type && (
                    <Icon name='check' size={16} color='#3358D4' />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className='desc'>配置活动信息</div>
      </div>
      <Icon name='close' onClick={onClose} size={22} className='close_icon' />

      {renderContent()}

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
  );
};

export default EditingPanel;
