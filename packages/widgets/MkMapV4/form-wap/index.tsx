import React, { useState } from 'react';
import { EditableFormProps } from '@mk/widgets-bridge-sdk';
import EditingPanel from './EditingPanel';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import './index.scss';

interface Props {
  onFormValueChange: (nextVal: any) => void;
  formControledValues: any;
  entityInfo: { id: string };
}
const MkMapForm: React.FC<Props> = props => {
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
    <div className='mk_map_v4_wap_form'>
      <div className='form_btn' onClick={() => showEditingPanel()}>
        <Icon name='shezhi' size={16} />
        <span>地址设置</span>
      </div>
      <ResponsiveDialog isOpen={show} onOpenChange={setShow} handleOnly={true}>
        <EditingPanel
          formControledValues={formControledValues}
          onFormValueChange={onFormValueChange}
          entityInfo={{ id }}
          onClose={() => setShow(false)}
        />
      </ResponsiveDialog>
    </div>
  );
};

export default MkMapForm;
