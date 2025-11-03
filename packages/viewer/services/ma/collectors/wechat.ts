import getQuery from 'micell/qs/get';

export default function () {
  return {
    $wechat_from: getQuery('from', window.location.search),
  };
}
