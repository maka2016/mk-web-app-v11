import React, { useState, useRef } from 'react';
import cls from 'classnames';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ImageUp, Plus, X, ZoomIn } from 'lucide-react';
import styled from '@emotion/styled';

interface Props {
  className?: string;
  label?: string;
  image?: string;
  loading?: boolean;
  replaceChild?: React.ReactNode;
  onUpload: () => void;
  onRemove?: () => void;
}

const UploadContainerRoot = styled.div`
  width: 88px;
  height: 88px;
  border-radius: var(--border-radius);
  overflow: hidden;
  .upload_select_wrap {
    width: 100%;
    height: 100%;
  }

  .upload_select {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #cdcdcf;
    background-color: var(--bg-gray-dark);
    cursor: pointer;

    &:hover {
      background-color: var(--bg-gray-hover);
    }

    .upload_label {
      font-size: 12px;
    }
  }

  .upload_image {
    position: relative;
    width: 100%;
    height: 100%;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: var(--border-radius);

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .mask {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      opacity: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      .close {
        position: absolute;
        top: 8px;
        right: 8px;
      }
    }

    &:hover {
      .mask {
        opacity: 1;
      }
    }
  }
`;

export const UploadHelper = (props: Props) => {
  const {
    image,
    className,
    loading,
    label = '上传图片',
    replaceChild,
    onUpload,
    onRemove,
  } = props;
  const classNames = cls('__mk_upload__', className);

  const [preview, setPreview] = useState(false);

  const upload = () => {
    if (loading) {
      return;
    }
    onUpload();
  };
  const isImage = image?.startsWith('http');

  const onPreview = () => {
    if (!image) {
      return;
    }
    setPreview(true);
  };

  return (
    <UploadContainerRoot className={classNames}>
      {!isImage && (
        <div onClick={upload} className='upload_select_wrap'>
          {replaceChild || (
            <div className='upload_select'>
              <Plus size={40} />
              <span className='upload_label'>{label}</span>
            </div>
          )}
        </div>
      )}

      <div className='upload_image'>
        {isImage && <img src={image} alt='' />}
        <div className='mask flex items-center justify-center gap-2'>
          <div className='close' onClick={onRemove}>
            <X size={16} color='rgba(1, 7, 13, 0.6)' />
          </div>
          <ZoomIn size={24} color='#fff' onClick={onPreview} />
          <ImageUp size={24} color='#fff' onClick={onUpload} />
        </div>
      </div>

      <ResponsiveDialog
        isOpen={preview}
        onOpenChange={open => setPreview(open)}
      >
        <div className='w-full h-full max-w-[800px] max-h-[80vh] flex items-center justify-center'>
          <img src={image} alt='' className='w-full h-full object-contain' />
        </div>
      </ResponsiveDialog>
    </UploadContainerRoot>
  );
};
