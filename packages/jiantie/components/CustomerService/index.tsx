import { safeCopy } from '@/utils';
import styles from './index.module.scss';
import { Icon } from '@workspace/ui/components/Icon';
import toast from 'react-hot-toast';

const CustomerService = (props: { onClose: () => void }) => {
  const { onClose } = props;
  return (
    <div className={styles.customerService}>
      {/* <div className={styles.overlay}></div> */}
      <div className={styles.content}>
        <div className={styles.img}>
          <img src='/assets/customerService.png' alt='' />
        </div>
        <div className={styles.title}>客服微信</div>
        <div className={styles.desc}>长按保存图片，使用微信扫描二维码添加</div>
        <div className={styles.qrcode}>
          <img
            src='https://work.weixin.qq.com/kf/kefu/qrcode?kfcode=kfc815adea102660ae6'
            alt=''
          />
        </div>
        <div className={styles.title}>客服电话</div>
        <div className={styles.tel}>
          <a href='tel:020-39340995'>020-39340995</a>
          <Icon
            name='copy'
            size={14}
            color='#969696'
            onClick={() => {
              safeCopy('020-39340995');
              toast.success('复制成功');
            }}
          />
        </div>
      </div>
      <div className={styles.close} onClick={() => onClose()}>
        <Icon name='close' size={24} />
      </div>
    </div>
  );
};

export default CustomerService;
