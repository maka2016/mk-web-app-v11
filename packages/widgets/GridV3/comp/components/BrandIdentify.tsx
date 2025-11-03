import { cdnApi } from '@mk/services';
import { queryToObj } from '@mk/utils';
import React from 'react';

const BrandIdentify = () => {
  const query = queryToObj();
  if (query.appid !== 'jiantie') {
    return null;
  }
  return (
    <div className='jiantie_band_container'>
      <div
        className='jiantie_band'
        onClick={() => {
          window.location.href = `https://www.maka.im/mk-store-7/wapdownload/h5tail?ref_objtype=fanyeh5_viewer_prod_identify_btn&appid=${
            query.appid || ''
          }`;
        }}
      >
        <img
          src={cdnApi('/cdn/webstore10/jiantie/band_logo.png', {
            format: 'webp',
          })}
          alt=''
          className='jiantie_band_logo'
        />
        <span>自适应邀请函，重要时刻不将就</span>
        <div className='jiantie_band_btn'>制作同款 {`>`}</div>
      </div>
    </div>
  );
};

export default BrandIdentify;
