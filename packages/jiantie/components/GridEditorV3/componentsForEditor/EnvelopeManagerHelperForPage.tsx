import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { trpc } from '../../../utils';
import EnvelopeEditor from '../../Envelope/EnvelopeEditor';
import { EnvelopeConfig } from '../../Envelope/types';
import { useWorksStore } from '../works-store/store/hook';

export const EnvelopeManagerHelperForPage = () => {
  const worksStore = useWorksStore();
  const { worksDetail } = worksStore;
  const [showEnvelopeForm, setShowEnvelopeForm] = useState(false);
  const isTemplate = worksDetail?.template_id === worksDetail?.id;

  // 获取当前信封配置
  const envelopeConfig = worksDetail?.envelope_config as
    | EnvelopeConfig
    | undefined;

  const handleSave = async (config: EnvelopeConfig) => {
    if (!worksDetail?.id) return;

    try {
      if (isTemplate) {
        await trpc.template.update.mutate({
          id: worksDetail.id,
          envelope_enabled: true,
          envelope_config: config,
        });
      } else {
        trpc.works.update.mutate({
          id: worksDetail.id,
          envelope_enabled: true,
          envelope_config: config as any,
        });
      }

      setShowEnvelopeForm(false);
    } catch (error) {
      throw error;
    }
  };

  const handleRemove = async () => {
    if (!worksDetail?.id) return;

    try {
      if (isTemplate) {
        await trpc.template.update.mutate({
          id: worksDetail.id,
          envelope_enabled: false,
          envelope_config: null,
        });
      } else {
        trpc.works.update.mutate({
          id: worksDetail.id,
          envelope_enabled: false,
          envelope_config: null,
        });
      }

      setShowEnvelopeForm(false);
      toast.success('删除成功');
    } catch (error) {
      toast.error('删除失败');
    }
  };

  return (
    <>
      <Button
        className='trggier px-2'
        variant='outline'
        style={{
          pointerEvents: 'auto',
        }}
        onClick={() => {
          setShowEnvelopeForm(true);
        }}
      >
        信封2.0设置(最新)
      </Button>
      <ResponsiveDialog
        isOpen={showEnvelopeForm}
        onOpenChange={setShowEnvelopeForm}
        title={'信封设置'}
        contentProps={{
          style: { width: '70vw', maxWidth: '800px' },
        }}
      >
        <EnvelopeEditor
          value={envelopeConfig}
          onChange={handleSave}
          onRemove={handleRemove}
        />
      </ResponsiveDialog>
    </>
  );
};
