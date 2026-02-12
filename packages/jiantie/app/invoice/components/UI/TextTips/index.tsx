import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';

interface Props {
  type?: 'info' | 'error';

  text: string;

  renderIcon?: React.ReactNode;
}

const TextTips: React.FC<Props> = props => {
  const { type = 'info' } = props;
  const config = {
    iconColor: 'rgba(21, 94, 239, 1)',
    bgColor: 'rgba(239, 248, 255, 1)',
    color: 'rgba(0, 0, 0, 0.6)',
  };

  if (type === 'error') {
    config.iconColor = 'rgba(245, 90, 90, 1)';
    config.bgColor = 'rgba(255, 245, 245, 1)';
    config.color = '#f74a4a';
  }

  return (
    <div
      className={styles.main}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <div className={styles.info}>
        {props.renderIcon === undefined ? (
          <Icon name='info-fo194bgf' color={config.iconColor} size={18} />
        ) : (
          props.renderIcon
        )}
      </div>
      {props.text}
    </div>
  );
};

export default TextTips;
