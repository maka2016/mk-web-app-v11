import React from 'react';
import styles from './index.module.scss';

const PreloadPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.html_loading_area}>
        <div className={styles.cycle_container}>
          <div className={styles.outer_circle}></div>
          <div className={styles.inner_circle}></div>
        </div>
      </div>

      {/* <div className={styles.logo}>
        <img
          src={("https://img2.maka.im/cdn/webstore7/assets/app/common/jiantie_loading_logo.png")}
          alt=""
          style={{
            height: 80
          }}
        />
      </div> */}
    </div>
  );
};

export default PreloadPage;
