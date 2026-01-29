import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { RSVPProvider } from '../../../RSVP/RSVPContext';
import { RSVPConfigPanel } from '../../../RSVP/configPanel';
import { useWorksStore } from '../../works-store/store/hook';
/**
 * 设计师和用户共用的组件管理器
 */
function RSVPHelper() {
  const worksStore = useWorksStore();
  const { worksDetail } = worksStore;
  const [isFormSetting, setIsFormSetting] = useState(false);

  const worksId = worksDetail?.id || '';
  const isWebsite = /html/gi.test(worksDetail?.specInfo?.export_format || '');

  return (
    <>
      <div
        id='RSVP_trigger_btn'
        className='hidden absolute top-[-9999px] left-[-9999px]'
        onClick={() => setIsFormSetting(true)}
      ></div>
      {isWebsite && (
        <RSVPProvider worksId={worksId} canCreate={true}>
          <ResponsiveDialog
            isOpen={isFormSetting}
            onOpenChange={setIsFormSetting}
            handleOnly={true}
            className='max-h-[80vh] overflow-hidden'
          >
            <RSVPConfigPanel
              onEnableChange={(next: any) => {
                worksStore?.updateWorksDetailPurely({
                  rsvp_form_config: {
                    ...next,
                  },
                });
              }}
              onClose={() => {
                setIsFormSetting(false);
              }}
            />
          </ResponsiveDialog>
        </RSVPProvider>
      )}
    </>
  );
}
export default observer(RSVPHelper);
