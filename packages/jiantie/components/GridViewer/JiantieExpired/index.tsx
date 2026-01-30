import { cdnApi } from '@/services';
import { useTranslations } from 'next-intl';
import styles from './index.module.scss';

const JiantieExpired = ({ label }: { label?: string }) => {
  const t = useTranslations('Viewer');
  return (
    <div className={styles.jiantieExpired}>
      <img src={cdnApi('/cdn/webstore10/jiantie/expired.png')} alt='' />
      <span>{label || t('offline')}</span>
    </div>
  );
};

export default JiantieExpired;
