import React from 'react';
import cls from 'classnames';

interface Props {
  name?: string;
  content?: string;
  head?: string;
  color?: string;
  className?: string;
  style?: string;
  isActive?: boolean;
}

const StyledBullet = (props: Props) => {
  const {
    content,
    name,
    className,
    color = '#fff',
    style = 'style',
    isActive,
  } = props;
  const classes = cls(
    `${style}_bullet_item`,
    className,
    isActive && 'active',
    !content && 'hide'
  );
  return (
    <div className={classes}>
      {/* {head && (
        <div className="head_img">
          <img src={head} alt="" />
        </div>
      )} */}
      <span className='name'>{name}:</span>
      <span className='content' style={{ color }}>
        {content}
      </span>
    </div>
  );
};
export default StyledBullet;
