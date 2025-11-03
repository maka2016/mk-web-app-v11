export default function () {
  return {
    $wechat_from:
      new URLSearchParams(window.location.search).get('from') || undefined,
  };
}
