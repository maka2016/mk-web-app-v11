import styled from '@emotion/styled';
import { cn } from '@workspace/ui/lib/utils';
import { useWorksStore } from '../../works-store/store/hook';
import SettingGroup from './SettingGroup';

const SettingWrapper = styled.div`
  /* bottom: var(--safe-area-inset-bottom, 0); */
`;

/**
 * 设计师和用户共用的组件管理器
 */
export default function SettingWidgetV4({
  onUpdate,
}: {
  onUpdate?: () => void;
}) {
  const worksStore = useWorksStore();
  const fullStack = worksStore.fullStack;
  if (fullStack) {
    return null;
  }

  return (
    <>
      <SettingWrapper
        className={cn(
          'SettingWidgetV4 fixed bottom-0 left-0 right-0 z-10 max-w-full border-t border-gray-300 shadow-[0_-6px_16px_rgba(0,0,0,0.08)] justify-center bg-white flex flex-col items-center',
          'md:bottom-auto md:top-[56px] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto md:max-w-none md:rounded-lg md:shadow-lg md:border-none overflow-hidden'
        )}
      >
        <SettingGroup onUpdate={onUpdate} />
      </SettingWrapper>
    </>
  );
}
