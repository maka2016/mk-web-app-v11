import { FormFieldInput } from './Input';

export interface FormFieldTextarea extends Omit<FormFieldInput, 'type'> {
  type: 'Textarea';
}
