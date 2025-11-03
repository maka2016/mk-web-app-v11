export interface MkBulletScreenProps {
  formRefId: string;
  allowComment: boolean;
  bulletColor: string;
  placeholder: string;
  showStyle: 'vertical' | 'horizontal' | 'none';
  bulletStyle: 'simple' | 'style';
  showPreview?: boolean;
  show?: boolean;
  needWXAuth?: boolean;
}

export interface Bullet {
  id?: string;
  content?: string;
  headImg?: string;
  nickname?: string;
  isActive?: boolean;
}
