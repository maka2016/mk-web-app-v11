export default function () {
  return {
    $referrer: document.referrer,
    $url: window.location.href,
    $pathname: window.location.pathname,
  };
}
