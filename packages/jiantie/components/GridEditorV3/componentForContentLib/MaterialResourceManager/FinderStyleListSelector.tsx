import MaterialFloorManager from './MaterialFloorManager';
import { MaterialFloor, MaterialResourceManagerAPI } from './services';

interface FinderStyleListSelectorProps {
  materialManager?: MaterialResourceManagerAPI;
  allCategories?: MaterialFloor[];
  selectedFloorId: string;
  onFloorSelect: (floorId: string, floor: MaterialFloor | null) => void;
  className?: string;
  placeholder?: string;
  showSearch?: boolean;
  showRefresh?: boolean;
}

export default function FinderStyleListSelector({
  materialManager,
  allCategories,
  selectedFloorId,
  onFloorSelect,
  className,
  placeholder = '搜索分类...',
  showSearch = true,
  showRefresh = false,
}: FinderStyleListSelectorProps) {
  return (
    <MaterialFloorManager
      materialManager={materialManager}
      allCategories={allCategories}
      mode='selector'
      selectedFloorId={selectedFloorId}
      onFloorSelect={onFloorSelect}
      className={className}
      placeholder={placeholder}
      showSearch={showSearch}
      showRefresh={showRefresh}
      showCreateEdit={false}
    />
  );
}
