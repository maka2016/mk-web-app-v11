import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Switch } from '@workspace/ui/components/switch';
import { observer } from 'mobx-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { UserEditorSetting } from '../../types';
import { useWorksStore } from '../../works-store/store/hook';
import { EnvelopeManagerHelperForPage } from '../EnvelopeManagerHelperForPage';

const CoverAnimateManagerHelperForPage = () => {
  const [showLayoutForm, setShowLayoutForm] = useState(false);

  return (
    <>
      <Button
        className='trggier px-2'
        variant='outline'
        style={{
          pointerEvents: 'auto',
        }}
        onClick={() => {
          setShowLayoutForm(true);
        }}
      >
        开幕设置(旧的信封，即将废弃)
      </Button>
    </>
  );
};

function SettingPanel() {
  const worksStore = useWorksStore();
  const { worksData } = worksStore;
  const { gridProps } = worksData;
  // 从 fullSDK 获取最新的 worksDetail，每次渲染时获取最新值
  const worksDetail = worksStore.worksDetail;
  // 使用 state 来强制重新渲染，当 worksDetail 更新时触发
  const [, forceUpdate] = useState(0);

  // 判断是否是模板
  const isTemplate = /^T_/gi.test(worksDetail?.id || '');

  const shareType =
    (worksDetail?.share_type as 'invite' | 'poster' | 'other') || 'other';

  const userEditorSetting: UserEditorSetting = gridProps.userEditorSetting || {
    blockSelectable: false,
  };

  const handleBlockSelectableChange = (checked: boolean) => {
    const nextSetting: UserEditorSetting = {
      ...userEditorSetting,
      blockSelectable: checked,
    };
    worksStore.setGridProps({
      userEditorSetting: nextSetting,
    });
  };

  const handleShareTypeChange = async (
    value: 'invite' | 'poster' | 'other'
  ) => {
    if (!worksDetail?.id) return;

    try {
      if (isTemplate) {
        await trpc.template.update.mutate({
          id: worksDetail.id,
          share_type: value,
        });
        worksStore.updateWorksDetailPurely({
          share_type: value,
        });
      } else {
        await worksStore.api.updateWorksDetail({
          share_type: value,
        });
      }
      // 强制重新渲染以获取最新的 worksDetail
      forceUpdate(prev => prev + 1);
      const typeNames = {
        invite: '邀请',
        poster: '海报',
        other: '其他',
      };
      toast.success(`分享类型已设置为：${typeNames[value]}`);
    } catch (error) {
      console.error('更新分享类型失败:', error);
      toast.error('更新失败，请重试');
    }
  };

  return (
    <div className='flex flex-col h-full overflow-y-auto'>
      <div className='p-4 flex flex-col gap-4'>
        <div>
          <h2 className='text-base font-semibold text-foreground mb-4'>
            用户编辑器设置
          </h2>

          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <div className='flex flex-col gap-1'>
                  <Label className='text-sm font-medium text-foreground'>
                    允许选择Block
                  </Label>
                  <p className='text-xs text-muted-foreground'>
                    控制是否允许在编辑器中选择块元素
                  </p>
                </div>
                <Switch
                  checked={userEditorSetting.blockSelectable}
                  onCheckedChange={handleBlockSelectableChange}
                />
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <CoverAnimateManagerHelperForPage />
            </div>
            <div className='flex items-center gap-2'>
              <EnvelopeManagerHelperForPage />
            </div>
            <div className='flex flex-col gap-2'>
              <div className='flex flex-col gap-1'>
                <Label className='text-sm font-medium text-foreground'>
                  分享类型
                </Label>
                <p className='text-xs text-muted-foreground'>
                  设置作品/模板的分享类型，用于区分不同的分享场景
                </p>
              </div>
              <Select value={shareType} onValueChange={handleShareTypeChange}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='选择分享类型' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='invite'>邀请</SelectItem>
                  <SelectItem value='poster'>海报</SelectItem>
                  <SelectItem value='other'>其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* <div>
          <h2 className='text-base font-semibold text-foreground mb-4'>
            RSVP表单设置
          </h2>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <div className='flex flex-col gap-1'>
                  <Label className='text-sm font-medium text-foreground'>
                    启用RSVP表单
                  </Label>
                  <p className='text-xs text-muted-foreground'>
                    开启后，作品将支持RSVP邀请和报名功能
                  </p>
                </div>
                <Switch checked={isRsvp} onCheckedChange={handleRsvpChange} />
              </div>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
export default observer(SettingPanel);
