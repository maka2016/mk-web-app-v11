import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Info, MessageCircle, Trash2, UserCheck, UserPlus } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { BtnLite } from '../../components/style-comps';
import { useWorksStore } from '../../works-store/store/hook';

/**
 * 系统变量编辑弹窗
 */
const SettingElemV3PopForSys = () => {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const { editingElemId } = widgetStateV2 || {};
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  if (!editingElemId) {
    return <></>;
  }

  // 有选中元素
  const layer = worksStore.getLayer(editingElemId);
  if (!layer) return <></>;

  const renderBtns = () => {
    return (
      <>
        <BtnLite
          title='帮助'
          onClick={() => {
            setShowInfoDialog(true);
          }}
        >
          <Info size={20} />
          帮助
        </BtnLite>
        <BtnLite
          title='填写名单'
          onClick={() => {
            setWidgetStateV2({
              showDownloadInviteeManager: true,
            });
          }}
        >
          <UserPlus size={20} />
          填写名单
        </BtnLite>
        <BtnLite
          title='恢复默认'
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('guest_name');
            window.history.pushState({}, '', url.toString());
            worksStore.changeCompAttr(editingElemId, {
              systemVariable: {
                ...layer.attrs.systemVariable,
                removed: !layer.attrs.systemVariable?.removed,
              },
            });
          }}
        >
          <Trash2 size={20} />
          {layer.attrs.systemVariable?.removed ? '恢复' : '删除'}
        </BtnLite>
      </>
    );
  };
  return (
    <>
      {renderBtns()}
      <ResponsiveDialog
        isDialog
        isOpen={showInfoDialog}
        onOpenChange={setShowInfoDialog}
        contentProps={{
          className: 'rounded-[20px] max-w-full w-[80%] p-0',
        }}
      >
        <div className='p-6'>
          {/* 标题 */}
          <div className='text-center mb-2'>
            <h2 className='text-2xl font-bold text-[#151515] mb-2'>
              这个格子有什么用?
            </h2>
            <p className='text-base text-[#666666]'>一图两用, 智能切换</p>
          </div>

          {/* 功能说明区域 */}
          <div className='mt-6 space-y-4'>
            {/* 第一个功能块 */}
            <div className='bg-[#F5F5F5] rounded-[12px] p-4 flex items-start gap-4 shadow-sm'>
              <div className='w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-[#E5E5E5]'>
                <MessageCircle size={20} className='text-[#666666]' />
              </div>
              <div className='flex-1'>
                <h3 className='text-base font-medium text-[#151515] mb-1'>
                  没名单时 (发群里)
                </h3>
                <p className='text-sm text-[#151515] leading-relaxed'>
                  直接生成一张图, 显示默认文字 (如「尊敬的嘉宾」)。
                </p>
              </div>
            </div>

            {/* 第二个功能块 */}
            <div className='bg-[#E8F4FF] rounded-[12px] p-4 flex items-start gap-4 shadow-sm'>
              <div className='w-10 h-10 rounded-full bg-[#1890FF] flex items-center justify-center flex-shrink-0 border-2 border-white'>
                <UserCheck size={20} className='text-white' />
              </div>
              <div className='flex-1'>
                <h3 className='text-base font-medium text-[#151515] mb-1'>
                  有名单时 (发个人)
                </h3>
                <p className='text-sm text-[#151515] leading-relaxed'>
                  自动把名字填进去, 生成100张带名字的专属海报。
                </p>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            {/* 底部按钮 */}
            <Button
              variant={'outline'}
              onClick={() => setShowInfoDialog(false)}
              className='w-full mt-6'
            >
              明白了
            </Button>

            {/* 底部按钮 */}
            <Button
              onClick={() => {
                setShowInfoDialog(false);
                setWidgetStateV2({
                  showDownloadInviteeManager: true,
                });
              }}
              className='w-full mt-6'
            >
              添加嘉宾
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
};

export default observer(SettingElemV3PopForSys);
