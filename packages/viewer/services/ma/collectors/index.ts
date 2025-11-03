import connection from './connection';
import ip from './ip';
import page from './page';
import userAgent from './userAgent';
import viewport from './viewport';
import wechat from './wechat';

const collectors = {
  userAgent,
  viewport,
  page,
  ip,
  wechat,
  connection,
};

export default collectors;
