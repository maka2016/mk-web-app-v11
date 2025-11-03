import React, { useEffect, useState } from 'react';
import './index.scss';
import cls from 'classnames';
import { Icon } from '@workspace/ui/components/Icon';
import { MkPinTuanProps } from '../../shared';

import { Separator } from '@workspace/ui/components/separator';
import { getPageId, getUid, request } from '@mk/services';
import { worksServerV2 } from '../../shared/api';
import { Slider } from '@workspace/ui/components/slider';

const timeLimitOptions = [
  {
    label: '24小时',
    value: 24,
  },
  {
    label: '48小时',
    value: 48,
  },
  {
    label: '72小时',
    value: 72,
  },
];

const boostTypeOptions = [
  {
    label: '每人仅限助力一次',
    value: 'once',
  },
  {
    label: '每人每天限助力一次',
    value: 'daily',
  },
];

interface Props {
  boostActivityId?: number;
  onFormValueChange: (values: any) => void;
  formControledValues: MkPinTuanProps;
  onChange?: (values: any) => void;
}

interface BoostActivity {
  id: number;
  requiredPeople: number;
  timeLimit: number;
  type: string;
}

const BoostEditingPanel = (props: Props) => {
  const { boostActivityId, onFormValueChange } = props;
  const [activityDetail, setActivityDetail] = useState<BoostActivity>();
  const [isInput, setIsInput] = useState(false);

  const getBoostActivity = async () => {
    if (!boostActivityId) {
      return;
    }
    const res: any = await request.get(
      `${worksServerV2()}/boost-activity/${boostActivityId}`
    );

    if (res.worksId !== getPageId()) {
      const createRes: any = await request.post(
        `${worksServerV2()}/boost-activity`,
        {
          requiredPeople: res.requiredPeople,
          timeLimit: res.timeLimit,
          uid: +getUid(),
          worksId: getPageId(),
          type: res.type,
        }
      );

      onFormValueChange({
        boostActivityId: createRes.id,
      });

      if (![24, 48, 72].includes(createRes.timeLimit)) {
        setIsInput(true);
      }
      setActivityDetail(createRes);
      return;
    }

    if (![24, 48, 72].includes(res.timeLimit)) {
      setIsInput(true);
    }
    setActivityDetail(res);
  };

  const updateBoostActivity = async (value: Record<string, any>) => {
    if (!boostActivityId) {
      return;
    }
    await request.put(
      `${worksServerV2()}/boost-activity/${boostActivityId}`,
      value
    );
  };

  useEffect(() => {
    getBoostActivity();
  }, []);

  if (!activityDetail) {
    return <></>;
  }

  return (
    <div className={cls(['content'])}>
      <div className='label'>助力人数要求</div>
      <div className='slider_wrap'>
        <div className='start'>2人</div>
        <div className='end'>100人</div>
        <div
          className='current'
          style={{
            left: `${Math.min(((activityDetail?.requiredPeople || 0) / 100) * 100, 95)}%`,
          }}
        >
          {activityDetail?.requiredPeople}人
        </div>
        <Slider
          className='h-10'
          min={2}
          max={100}
          size='lg'
          defaultValue={[activityDetail?.requiredPeople || 0]}
          onValueChange={value => {
            setActivityDetail({
              ...activityDetail,
              requiredPeople: value[0],
            });
          }}
          onValueCommit={value => {
            updateBoostActivity({
              requiredPeople: value[0],
            });
          }}
        />
      </div>

      <Separator
        style={{
          margin: '12px 0',
        }}
      />
      <div className='label mb-2'>活动时长</div>
      <div className='field_types'>
        {timeLimitOptions.map(item => (
          <div
            key={item.value}
            className={cls([
              'field_type_item',
              !isInput && activityDetail.timeLimit === item.value && 'active',
            ])}
            onClick={() => {
              setIsInput(false);
              setActivityDetail({
                ...activityDetail,
                timeLimit: item.value,
              });
              updateBoostActivity({
                timeLimit: item.value,
              });
            }}
          >
            {item.label}
            {!isInput && activityDetail.timeLimit === item.value && (
              <Icon className='selected' name='selected' size={20} />
            )}
          </div>
        ))}
        <div className={cls(['field_type_item', isInput && 'active'])}>
          <input
            type='number'
            value={isInput ? activityDetail.timeLimit : ''}
            placeholder='自定义输入'
            onClick={() => {
              setIsInput(true);
            }}
            onChange={e => {
              setActivityDetail({
                ...activityDetail,
                timeLimit: +e.target.value,
              });
            }}
            onBlur={e => {
              updateBoostActivity({
                timeLimit: +e.target.value,
              });
            }}
          />
          {isInput && <Icon className='selected' name='selected' size={20} />}
        </div>
      </div>
      <Separator
        style={{
          margin: '12px 0',
        }}
      />
      <div className='label mb-2'>助力限制</div>
      <div className='field_types'>
        {boostTypeOptions.map(item => (
          <div
            key={item.value}
            className={cls([
              'field_type_item',
              activityDetail.type === item.value && 'active',
            ])}
            onClick={() => {
              setActivityDetail({
                ...activityDetail,
                type: item.value,
              });

              updateBoostActivity({
                type: item.value,
              });
            }}
          >
            {item.label}
            {activityDetail.type === item.value && (
              <Icon className='selected' name='selected' size={20} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoostEditingPanel;
