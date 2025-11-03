import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import { safeCopy, maskPhoneNumber } from '@/utils';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useState } from 'react';

const customFields = [
  {
    title: '姓名',
    key: 'name',
    dataIndex: 'name',
    width: 120,
  },
  {
    title: '选择课程',
    key: 'course',
    dataIndex: 'course',
    width: 120,
  },
  {
    title: '孩子年龄',
    key: 'age',
    dataIndex: 'age',
    width: 60,
  },

  {
    title: '备注',
    key: 'remarks',
    dataIndex: 'remarks',
    width: 110,
  },
];
const Item = ({
  item,
  collectFields,
  mask,
  showVipPage,
  isMiniProgram,
}: any) => {
  const [expand, setExpand] = useState(false);
  return (
    <div className={styles.listItem} key={item.id}>
      <div className={styles.content}>
        <div className='flex items-center justify-between mb-1'>
          <div className={styles.name}>
            {item.phone ? (
              <>
                <span>
                  手机号：
                  {mask ? maskPhoneNumber(item.phone) : item.phone}
                </span>
                <div
                  className={styles.copy}
                  onClick={() => {
                    if (mask && !isMiniProgram) {
                      showVipPage();
                      return;
                    }
                    safeCopy(mask ? maskPhoneNumber(item.phone) : item.phone);
                    toast.success('复制成功');
                  }}
                >
                  <Icon name='copy' size={14} />
                  <span>复制</span>
                </div>
              </>
            ) : (
              <span>{item.name}</span>
            )}
          </div>
        </div>
        <div
          className={styles.fieldItem}
          style={{
            flex: 1,
          }}
        >
          <span>
            报名时间：
            {dayjs(item.submitDate).format('MM.DD HH:mm')}
          </span>
        </div>

        {expand && (
          <div className={styles.other}>
            {customFields.map(col => {
              if (!collectFields.includes(col.key)) return null;
              return (
                <div className={styles.otherItem} key={col.key}>
                  <div className={styles.label}>{col.title}</div>
                  <div className={styles.value}>{item[col.key] || '-'}</div>
                </div>
              );
            })}

            {/* <div className={styles.otherItem}>
              <div className={styles.label}>IP</div>
              <div className={styles.value}>{item.ip || "-"}</div>
            </div> */}
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
