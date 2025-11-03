import * as Yup from 'yup';
import { FormDataProtocolClass } from '../dto/form';
import { SubmissionRule } from '../form';

/**
 * 将表单的字段配置转化成提交规则，用于校验表单数据是否合规
 */
export const convertFormEntityFieldsToSubmitRule = (
  submitFormData: FormDataProtocolClass
) => {
  const {
    fields = [],
    submissionMaxLimit,
    submissionMaxNum,
    oneSubmissionPerPerson,
  } = submitFormData;
  const validateShape: any = {};

  fields
    .filter(f => !f.disabled)
    .forEach(field => {
      switch (field.type) {
        case 'Address':
          validateShape[field.id] = Yup.object({
            province: Yup.string(),
            city: Yup.string(),
            county: Yup.string(),
            detailAddress: Yup.string(),
          });
        case 'Checkbox':
          // validateShape[field.id] = Yup.object({
          //   province: Yup.string(),
          //   city: Yup.string(),
          //   county: Yup.string(),
          //   detailAddress: Yup.string(),
          // });
          validateShape[field.id] = Yup.string();
          break;
        case 'DatePicker':
          validateShape[field.id] = Yup.string();
          break;
        case 'Dropdown':
          validateShape[field.id] = Yup.string();
          break;
        case 'ImgAddon':
          validateShape[field.id] = Yup.string();
          break;
        case 'Input':
          validateShape[field.id] = Yup.string();
          if (field.validate === 'email') {
            validateShape[field.id] =
              validateShape[field.id].email('请填写正确的 email 地址');
          }
          if (field.validate === 'phone') {
            validateShape[field.id] = validateShape[field.id].matches(
              /^1[3|4|5|6|7|8|9]\d{9}$/,
              '请输入正确的手机号'
            );
          }
          break;
        case 'Radio':
          validateShape[field.id] = Yup.string();
          break;
        case 'Textarea':
          validateShape[field.id] = Yup.string();
          break;
        default:
          break;
      }
      if (field.required) {
        validateShape[field.id] = validateShape[field.id].required(
          `${field.label}必填`
        );
      }
    });

  return {
    submitSchema: Yup.object().shape(validateShape),
    submissionRule: {
      submissionMaxLimit,
      submissionMaxNum,
      oneSubmissionPerPerson,
    } as SubmissionRule,
  };
};
