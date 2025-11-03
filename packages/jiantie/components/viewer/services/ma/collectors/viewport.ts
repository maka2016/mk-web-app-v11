export default function () {
  const docEl = document.documentElement;
  const body = document.body as HTMLBodyElement | null;
  const width =
    window.innerWidth || docEl.clientWidth || (body ? body.clientWidth : 0);
  const height =
    window.innerHeight || docEl.clientHeight || (body ? body.clientHeight : 0);
  return {
    $viewport_width: width,
    $viewport_height: height,
  };
}
