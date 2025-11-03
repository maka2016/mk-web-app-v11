import { FormProcessorFn } from '@mk/widgets-bridge-sdk/types';

/**
 * 表单处理器，用于基于有表单的模版和复制有表单的作品时
 */
const FormProcessor: FormProcessorFn = async ({
  createForm,
  getFormEntity,
  layerItem,
  worksId,
  uid,
}) => {
  const currFormEntity = await getFormEntity(layerItem.attrs.formRefId);

  /** 删除原来的表单实例的 id，重新创建一个 */
  delete currFormEntity.content.formId;
  const newFormEntity = await createForm({
    worksId,
    uid,
    content: currFormEntity.content,
    type: currFormEntity.type || 'MkPinTuan',
  });

  return {
    /** 转换后的 attrs */
    nextAttrs: {
      formRefId: newFormEntity.formId,
    },
  };
};

export default FormProcessor;
