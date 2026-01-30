import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Settings } from 'lucide-react';
import React, { useState } from 'react';
import { BtnLite } from '../style-comps';
import EditingPanel from './EditingPanel';

interface Props {
  onFormValueChange: (nextVal: any) => void;
  formControledValues: any;
  entityInfo: { id: string };
}
const MapV4Form: React.FC<Props> = props => {
  const {
    onFormValueChange,
    formControledValues,
    entityInfo: { id },
  } = props;

  const [show, setShow] = useState(false);

  const showEditingPanel = () => {
    setShow(true);
  };

  return (
    <>
      <BtnLite onClick={() => showEditingPanel()}>
        <Settings size={16} />
        <span>地址设置</span>
      </BtnLite>
      <ResponsiveDialog isOpen={show} onOpenChange={setShow} handleOnly={true}>
        <EditingPanel
          formControledValues={formControledValues}
          onFormValueChange={onFormValueChange}
          entityInfo={{ id }}
          onClose={() => setShow(false)}
        />
      </ResponsiveDialog>
    </>
  );
};

export default MapV4Form;
