import { API, cdnApi, getUid, request } from '@/services';
import cls from 'classnames';
import { useEffect, useRef, useState } from 'react';

import { queryToObj } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { nanoid } from 'nanoid';
import toast from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroller';
import './index.scss';

interface Item {
  url: string;
}

const PictureList = (props: any) => {
  const { worksId, onComplete } = props;
  const inputRef = useRef<any>(null);
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [nextMarker, setNextMarker] = useState('');
  const [pictures, setPictures] = useState<any[]>(props.pictures || []);

  const onUploadClick = () => {
    inputRef.current?.click();
  };

  const onChange = async (e: any) => {
    let files = [];
    if (e.target.files) {
      files = e.target.files;
    }
    if (!files.length) {
      return;
    }

    toast.loading('上传中...');

    const uploadPromises = Array.from(files).map(file => _onChange(file));
    const uploadedUrls = await Promise.all(uploadPromises);

    setList(prevList => [
      ...prevList,
      ...uploadedUrls.filter(url => url).map(url => ({ url })),
    ]);

    toast.dismiss();
  };

  const _onChange = async (file: any) => {
    const maxSize = 20;
    if ((file as File).size * 0.001 > maxSize * 1024) {
      toast.error(`文件不能超过${maxSize}mb`);
      return '';
    }

    const uid = getUid();
    const appid = queryToObj().appid || 'maka';
    const formData = new FormData();
    formData.append('file', file);
    formData.append("worksId: ''", '');

    const res = (await request.post(
      `${API('apiv10')}/oss/upload/${appid}/${uid}`,
      formData,
      {
        headers: {
          'content-type': 'multipart/form-data',
        },
      }
    )) as any;

    return res?.url;
  };

  const getUploadList = async () => {
    if (loading || finished) {
      return;
    }
    setLoading(true);
    const appid = queryToObj().appid || 'maka';

    const res = (await request.get(
      `${API('apiv10')}/oss/files/${appid}/${getUid()}`,
      {
        params: {
          worksId: '',
          nextMarker,
        },
      }
    )) as any;

    if (res.objects) {
      setList(list.concat(res.objects));
      setFinished(!res.isTruncated);
      setNextMarker(res.nextMarker);
      setLoading(false);
    }
  };

  useEffect(() => {
    getUploadList();
  }, []);

  const onSelectItem = async (url: string, index: number) => {
    if (pictures.length >= 12) {
      return;
    }
    setPictures([
      ...pictures,
      {
        id: nanoid(6),
        ossPath: url,
      },
    ]);
  };

  return (
    <>
      <div className='picturePanel'>
        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          loadMore={() => {
            getUploadList();
          }}
          hasMore={!finished}
          useWindow={false}
          className='scroll_list'
        >
          <div className='upload' onClick={() => onUploadClick()}>
            <Icon name='plus' size={32} />
            <span>上传素材</span>
          </div>
          {list.map((item, index) => {
            const selected = pictures.find(i => i.ossPath === item.url);
            return (
              <div
                key={item.url}
                className={cls(['item'])}
                onClick={() => {
                  onSelectItem(item.url, index);
                }}
              >
                {selected && <div className='selected'>已添加</div>}
                <img
                  src={cdnApi(item.url, {
                    resizeWidth: 200,
                  })}
                />
              </div>
            );
          })}
        </InfiniteScroll>
        <input
          id={nanoid()}
          className='uploadInput'
          ref={inputRef}
          onChange={onChange}
          type='file'
          multiple
          accept='image/*'
          disabled={false}
          readOnly={false}
        />
      </div>

      <div className='selectedPictures'>
        <div className='flex justify-between items-center mb-2'>
          <span className='tit'>
            请选择2-12张图片
            <span>
              （已选<span>{pictures.length}</span>张）
            </span>
          </span>
          <Button
            // size='sm'
            disabled={pictures.length < 2}
            onClick={() => {
              if (pictures.length < 2) {
                toast.error('请选择2-12张图片');
                return;
              }

              onComplete(pictures);
            }}
          >
            下一步
          </Button>
        </div>
        <div className='pictureList'>
          {pictures.map((item, index) => (
            <div
              className='item'
              key={item.id}
              onClick={() => {
                setPictures(prev => prev.filter(i => i.id !== item.id));
              }}
            >
              <img src={cdnApi(item.ossPath)} />
              <div className='delete'>
                <Icon name='close' size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default PictureList;
