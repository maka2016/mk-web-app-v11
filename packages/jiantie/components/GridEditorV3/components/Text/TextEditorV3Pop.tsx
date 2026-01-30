import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { LibraryBig, PencilLine } from 'lucide-react';
import { useState } from 'react';
import MaterialManagerSelector from '../../componentsForEditor/DesignerOperatorV2/MaterialManagerSelector';
import { useWorksStore } from '../../works-store/store/hook';
import { BtnLite } from '../style-comps';
import TextEditDialog from './TextEditDialog';

export default function TextEditorV3Pop({ layer }: { layer: any }) {
  const worksStore = useWorksStore();
  const { materialResourcesGroup } = worksStore.worksData.gridProps;
  const [showMaterialManagerSelector, setShowMaterialManagerSelector] =
    useState(false);
  const [showTextEditDialog, setShowTextEditDialog] = useState(false);

  return (
    <>
      {layer.attrs.materialGroupRefId && (
        <BtnLite
          onClick={() => {
            setShowMaterialManagerSelector(true);
          }}
        >
          <LibraryBig size={20} />
        </BtnLite>
      )}
      <BtnLite
        title='文本'
        // className='md:hidden'
        id={`${layer.elemId}-text-edit`}
        onClick={() => {
          setShowTextEditDialog(true);
        }}
      >
        <PencilLine size={20} />
        <span>改字</span>
      </BtnLite>
      <TextEditDialog
        isOpen={showTextEditDialog}
        onOpenChange={setShowTextEditDialog}
        layer={layer}
      />
      {/* <UserColorPicker
        wrapper={trigger => {
          return <BtnLite>{trigger}</BtnLite>;
        }}
        value={layer.attrs.color}
        onChange={value => {
          worksStore.changeCompAttr(layer.elemId, {
            ...layer.attrs,
            color: colorValueBuilder(value),
          });
        }}
      /> */}
      <ResponsiveDialog
        isOpen={showMaterialManagerSelector}
        onOpenChange={setShowMaterialManagerSelector}
        title='换文案'
      >
        {materialResourcesGroup?.text && (
          <MaterialManagerSelector
            materialGroup={
              materialResourcesGroup?.text
                ? ([
                    materialResourcesGroup?.text?.find(
                      group => group.id === layer.attrs.materialGroupRefId
                    ),
                  ].filter(Boolean) as any)
                : undefined
            }
            onChange={material => {
              worksStore.changeCompAttr(layer.elemId, {
                text: material.content,
              });
              setShowMaterialManagerSelector(false);
            }}
          />
        )}
      </ResponsiveDialog>
    </>
  );
}
