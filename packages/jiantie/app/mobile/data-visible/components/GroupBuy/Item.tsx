import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import { safeCopy } from '@/utils';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import cls from 'classnames';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { request, worksServerV2 } from '@/services';
import { useState } from 'react';

const subBoostActivityStatus: any = {
  0: {
    text: '未确认',
    style: 'pendding',
  },
  1: {
    text: '已添加',
    style: 'added',
  },
  2: {
    text: '已确认',
    style: 'confirmed',
  },
  3: {
    text: '已取消',
    style: 'canceled',
  },
};

const status = [
  {
    text: '未确认',
    value: 0,
  },
  {
    text: '已添加',
    value: 1,
  },
  {
    text: '已确认',
    value: 2,
  },
  {
    text: '已取消',
    value: 3,
  },
];

interface Record {
  id: number;
  avatar?: string;
  nickname?: string;
  phone?: string;
  isLeader: boolean;
  createdAt: string;
  status: number;
}

const Item = ({ item, showVipPage, isMiniProgram }: any) => {
  const [records, setRecords] = useState<Record[]>(item.groupBuyRecords);
  const [expand, setExpand] = useState(true);
  const onChangeStatus = async (recordId: number, value: number) => {
    await request.put(
      `${worksServerV2()}/group-buy/sub-activity/${recordId}/status`,
      {
        status: value,
      }
    );

    setRecords(
      records.map(record =>
        record.id === recordId
          ? {
              ...record,
              status: value,
            }
          : record
      )
    );
  };

  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>
        <span>
          {records.length >= item.requiredPeople
            ? '😄 拼团成功'
            : dayjs().isAfter(dayjs(item.endTime))
              ? '😔 拼团失败'
              : '拼团中'}
          <span className='ml-1'>
            ({records.length}/{item.requiredPeople}人)
          </span>
        </span>
        <Icon
          name={expand ? 'up-bold' : 'down-bold'}
          onClick={() => setExpand(!expand)}
        />
      </div>

      {expand && (
        <div className='flex flex-col gap-2'>
          {records.map((record: Record) => (
            <div className={styles.listItem} key={record.id}>
              {record.isLeader && <div className={styles.tag}>团长</div>}
              <div className={styles.content}>
                <div className='flex items-center justify-between mb-2'>
                  <div className={styles.name}>
                    {record.phone ? (
                      <>
                        <span>手机号：{record.phone}</span>
                        <div
                          className={styles.copy}
                          onClick={() => {
                            if (!record.phone) {
                              return;
                            }
                            if (record.phone.indexOf('****') > -1) {
                              showVipPage();
                              return;
                            }
                            safeCopy(record.phone);
                            toast.success('复制成功');
                          }}
                        >
                          <Icon name='copy' size={14} />
                          <span>复制</span>
                        </div>
                      </>
                    ) : (
                      <span>{record.nickname}</span>
                    )}
                  </div>
                  <div className='flex items-center gap-1'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div
                          className={cls([
                            styles.status,
                            'flex items-center gap-1',
                            styles[
                              subBoostActivityStatus[record.status || 0]?.style
                            ],
                          ])}
                        >
                          {subBoostActivityStatus[record.status || 0].text}
                          <Icon name='down-bold' size={12} color='#71717A' />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className='w-18'
                        side='bottom'
                        align='end'
                      >
                        <DropdownMenuGroup>
                          {status.map(item => (
                            <DropdownMenuItem
                              key={item.value}
                              onClick={() =>
                                onChangeStatus(record.id, item.value)
                              }
                            >
                              {item.text}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div
                  className={styles.fieldItem}
                  style={{
                    flex: 1,
                  }}
                >
                  <span>
                    {record.isLeader ? '发起时间：' : '拼团时间：'}
                    {dayjs(record.createdAt).format('MM.DD HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Item;
