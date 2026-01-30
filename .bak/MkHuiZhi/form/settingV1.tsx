import {
  EditorSDK,
  LayerElemItem,
} from '@/components/GridEditorV3/works-store/types';
import { formEntityServiceApi, getPageId, getUid } from '@/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Separator } from '@workspace/ui/components/separator';
import { Switch } from '@workspace/ui/components/switch';
import cls from 'classnames';
import { CircleCheck, Power, PowerOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

interface SettingAttrsData {
  MkHuiZhi: LayerElemItem | null;
  MkBulletScreen_v2: LayerElemItem | null;
  MkMapV3: LayerElemItem | null;
  MkGift: LayerElemItem | null;
}

interface Props {
  onFormValueChange: (elemId: string, value: any) => void;
  onChange: (value: SettingAttrsData) => void;
  compAttrsMap: SettingAttrsData;
  onClose: () => void;
  editorSDK?: EditorSDK;
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

const MkHuiZhiSetting = (props: Props) => {
  const { onClose, onFormValueChange, editorSDK } = props;
  const [compAttrsMap, setCompAttrsMap] = useState(props.compAttrsMap);
  const [feedback, setFeedback] = useState(
    compAttrsMap.MkHuiZhi?.attrs.feedback ||
      '感谢您的回复！我们期待与您共同分享这个美好时刻。'
  );

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
          <span>请帖回执设置</span>
        </div>
        <div className={styles.desc}>收集宾客的信息</div>
      </div>
      <Separator />
      <div className={styles.content}>
        <div className={styles.huizhiSetting}>
          <div>
            <div className={styles.tit}>
              <Icon name='people-fill' size={18} color='var(--theme-color)' />
              <span>出席信息</span>
            </div>
            <div className={styles.subTit}>将收集宾客姓名和参与人数信息</div>
          </div>
          <Switch checked disabled />
        </div>
        <Separator />
        <div className={styles.compSetting}>
          <div className={styles.tit}>
            <Icon name='ai-magic' size={18} color='var(--theme-color)' />
            <span>特殊功能</span>
          </div>
          <div className={styles.compItem}>
            <div>
              <div className={styles.tit}>
                <Icon name='comment' size={18} color='#000' />
                <span>留言</span>
              </div>
              <div className={styles.desc}>允许宾客留下祝福留言</div>
            </div>

            <Switch
              checked={compAttrsMap.MkBulletScreen_v2?.attrs.show}
              onCheckedChange={value => {
                if (!compAttrsMap.MkBulletScreen_v2) {
                  addComponent('MkBulletScreen_v2');
                  return;
                }
                onChange({
                  ...compAttrsMap,
                  MkBulletScreen_v2: {
                    ...compAttrsMap.MkBulletScreen_v2,
                    attrs: {
                      ...compAttrsMap.MkBulletScreen_v2.attrs,
                      show: value,
                    },
                  },
                });
                onFormValueChange(compAttrsMap.MkBulletScreen_v2!.elemId, {
                  show: value,
                });
              }}
            />
          </div>
          <div className={styles.compItem}>
            <div>
              <div className={styles.tit}>
                <Icon name='gift' size={18} color='#000' />
                <span>礼物</span>
              </div>
              <div className={styles.desc}>提供多种虚拟礼物选择</div>
            </div>

            <Switch
              checked={compAttrsMap.MkGift?.attrs.show}
              onCheckedChange={value => {
                if (!compAttrsMap.MkGift) {
                  addComponent('MkGift');
                  return;
                }
                console.log('onChange', value);
                onChange({
                  ...compAttrsMap,
                  MkGift: {
                    ...compAttrsMap.MkGift,
                    attrs: {
                      ...compAttrsMap.MkGift.attrs,
                      show: value,
                    },
                  },
                });
                onFormValueChange(compAttrsMap.MkGift!.elemId, {
                  show: value,
                });
              }}
            />
          </div>
        </div>
        <Separator />
        <div className={styles.tit} style={{ margin: '16px 0 8px' }}>
          <Icon name='message-sent-fill' size={18} color='var(--theme-color)' />
          <span>提交成功反馈</span>
        </div>
        <textarea
          className={styles.textarea}
          placeholder='请输入'
          value={feedback}
          onChange={e => {
            setFeedback(e.target.value);
            onChange({
              ...compAttrsMap,
              MkHuiZhi: {
                ...compAttrsMap.MkHuiZhi,
                attrs: {
                  ...compAttrsMap.MkHuiZhi?.attrs,
                  feedback: e.target.value,
                },
              } as LayerElemItem,
            });
            onFormValueChange(compAttrsMap.MkHuiZhi!.elemId, {
              feedback: e.target.value,
            });
          }}
        />
      </div>
      <div className={styles.footer}>
        {!compAttrsMap.MkHuiZhi?.attrs.show && (
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
              className={styles.open_btn}
              size='lg'
              onClick={() => {
                onChange({
                  ...compAttrsMap,
                  MkHuiZhi: {
                    ...compAttrsMap.MkHuiZhi,
                    attrs: {
                      ...compAttrsMap.MkHuiZhi?.attrs,
                      show: true,
                    },
                  } as LayerElemItem,
                });
                onFormValueChange(compAttrsMap.MkHuiZhi!.elemId, {
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
        {compAttrsMap.MkHuiZhi?.attrs.show && (
          <>
            <Button
              className={cls([styles.close_btn, 'hover:bg-background'])}
              size='lg'
              variant='outline'
              onClick={() => {
                onChange({
                  ...compAttrsMap,
                  MkHuiZhi: {
                    ...compAttrsMap.MkHuiZhi,
                    attrs: {
                      ...compAttrsMap.MkHuiZhi?.attrs,
                      show: false,
                    },
                  } as LayerElemItem,
                });
                onFormValueChange(compAttrsMap.MkHuiZhi!.elemId, {
                  show: false,
                });
                onClose();
              }}
            >
              <PowerOff size={20} />
              关闭功能
            </Button>
            <Button
              className={styles.open_btn}
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

export default MkHuiZhiSetting;
