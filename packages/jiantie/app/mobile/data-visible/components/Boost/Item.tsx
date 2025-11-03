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
import { useStore } from '@/store';

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

const Item = ({ item, showVipPage, isMiniProgram }: any) => {
  const [subBoostActivityDetail, setSubBoostActivityDetail] =
    useState<any>(item);
  const onChangeStatus = async (value: number) => {
    await request.put(
      `${worksServerV2()}/boost-activity/sub-activity/${item.id}/status`,
      {
        status: value,
      }
    );

    setSubBoostActivityDetail({
      ...subBoostActivityDetail,
      status: value,
    });
  };

  return (
    <div className={styles.listItem} key={subBoostActivityDetail.id}>
      <div className={styles.content}>
        <div className='flex items-center justify-between mb-2'>
          <div className={styles.name}>
            {subBoostActivityDetail.phone ? (
              <>
                <span>手机号：{subBoostActivityDetail.phone}</span>
                <div
                  className={styles.copy}
                  onClick={() => {
                    if (subBoostActivityDetail.phone.indexOf('****') > -1) {
                      showVipPage();
                      return;
                    }
                    safeCopy(subBoostActivityDetail.phone);
                    toast.success('复制成功');
                  }}
                >
                  <Icon name='copy' size={14} />
                  <span>复制</span>
                </div>
              </>
            ) : (
              <span>{subBoostActivityDetail.nickname}</span>
            )}
          </div>
          <div className='flex items-center gap-1'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* <Icon name="more" size={18} color="#71717A" /> */}
                <div
                  className={cls([
                    styles.status,
                    'flex items-center gap-1',
                    styles[
                      subBoostActivityStatus[subBoostActivityDetail.status]
                        .style
                    ],
                  ])}
                >
                  {subBoostActivityStatus[subBoostActivityDetail.status].text}
                  <Icon name='down-bold' size={12} color='#71717A' />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-18' side='bottom' align='end'>
                <DropdownMenuGroup>
                  {status.map(item => (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={() => onChangeStatus(item.value)}
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
          <span>助力人数：{item.score || 0}</span>
        </div>
        <div
          className={styles.fieldItem}
          style={{
            flex: 1,
          }}
        >
          <span>
            发起时间：
            {dayjs(subBoostActivityDetail.startTime).format('MM.DD HH:mm')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Item;
