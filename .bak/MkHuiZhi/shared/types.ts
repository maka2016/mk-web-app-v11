export type CustomFields = Array<{
  id: string;
  label: string;
  options?: string;
  type: string;
  required?: boolean;
}>;

export interface MkHuiZhiProps {
  formRefId: string;
  show?: boolean;
  feedback?: string;
  feedbackPicture?: string;
  customFields?: CustomFields;
  style: {
    labelColor: string;
    valueColor: string;
    borderColor: string;
    backgroundColor: string;
    borderRadius: number;
    buttonBackgroundColor: string;
    buttonColor: string;
    buttonBorderColor: string;
    buttonBorderRadius: number;
  };
}
