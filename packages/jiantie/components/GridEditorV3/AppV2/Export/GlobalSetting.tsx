import { observer } from 'mobx-react';
import ImageEditingPanelModal from '../../components/Picture/ImgLiteEditingPanel';
import { PreviewContentModal } from '../../componentsForEditor/PreviewContent';
import { useWorksStore } from '../../works-store/store/hook';
import DownloadHelperForInvitees from './DownloadHelperForInvitees';
import DownloadHelperForPoster from './DownloadHelperForPoster';
import RSVPHelper from './RSVPHelper';

/**
 * 全局可用的弹窗组件
 */
function GlobalSetting() {
  const worksStore = useWorksStore();
  const {
    worksData,
    widgetStateV2,
    setWidgetStateV2,
    worksDetail,
    config: { readonly },
  } = worksStore;
  const { gridProps } = worksData;
  const { showDownloadInviteeManager, showDownloadPoster, showPreviewModal } =
    widgetStateV2;
  return (
    <>
      <DownloadHelperForPoster
        showModal={!!showDownloadPoster}
        setShowModal={(show: boolean) => {
          setWidgetStateV2({
            showDownloadPoster: show,
          });
        }}
        worksDetail={worksDetail}
      />
      <DownloadHelperForInvitees
        inEditor={!readonly}
        worksDetail={worksDetail}
        showModal={!!showDownloadInviteeManager}
        setShowModal={(show: boolean) => {
          setWidgetStateV2({
            showDownloadInviteeManager: show,
          });
        }}
        onUpdate={() => {
          setTimeout(() => {
            worksStore?.setGridProps({
              _updateVersion: (gridProps._updateVersion || 0) + 1,
            });
          }, 300);
        }}
      />

      <ImageEditingPanelModal />

      <RSVPHelper />

      <PreviewContentModal
        worksDetail={worksDetail}
        open={!!showPreviewModal}
        onOpenChange={(open: boolean) => {
          setWidgetStateV2({
            showPreviewModal: open,
          });
        }}
      />
    </>
  );
}
export default observer(GlobalSetting);
