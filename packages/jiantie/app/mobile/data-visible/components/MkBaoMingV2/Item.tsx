import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import { safeCopy } from '@/utils';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useState } from 'react';
const Item = ({ item, customFields }: any) => {
  const [expand, setExpand] = useState(false);
  return (
    <div className={styles.listItem} key={item.id}>
      <div className={styles.content}>
        <div className='flex items-center justify-between mb-2'>
          <div className={styles.name}>{item.name}</div>
          <div className={styles.time}>
            {dayjs(item.submitDate).format('MM.DD HH:mm')}
          </div>
        </div>
        <div className={styles.fieldItem}>
          <Icon size={14} name='building-one' />
          <span>{item.oragnization || '-'}</span>
        </div>
        <div className='flex'>
          <div
            className={styles.fieldItem}
            style={{
              flex: 1,
            }}
          >
            <Icon size={14} name='mail' />
            <span>{item.position || '-'}</span>
          </div>
          <div
            className={styles.fieldItem}
            style={{
              flex: 1,
            }}
          >
            <Icon size={14} name='iphone' />
            <span>{item.phone || '-'}</span>
            <div
              className={styles.copy}
              onClick={() => {
                safeCopy(item.phone);
                toast.success('复制成功');
              }}
            >
              <Icon size={14} name='copy' />
              <span>复制</span>
            </div>
          </div>
        </div>
        {expand && (
          <div className={styles.other}>
            {customFields.map((field: any) => {
              return (
                <div className={styles.otherItem} key={field.id}>
                  <div className={styles.label}>{field.label}</div>
                  <div className={styles.value}>{item[field.id]}</div>
                </div>
              );
            })}
            <div className={styles.otherItem}>
              <div className={styles.label}>备注</div>
              <div className={styles.value}>{item.remarks || '-'}</div>
            </div>
          </div>
        )}
      </div>
      <div className={styles.expand} onClick={() => setExpand(!expand)}>
        <span>{expand ? '收起详情' : '展开详情'}</span>
        <Icon name={expand ? 'up-bold' : 'down-bold'} size={14} />
      </div>
    </div>
  );
};

export default Item;
