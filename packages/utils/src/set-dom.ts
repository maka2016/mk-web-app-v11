/**
 * 在 document.body 中创建指定 ID 的元素，并返回该元素的引用
 * @param targetID 设置的元素的 ID
 * @param className 设置的元素的 class
 */
export default function setDOMById(targetID: string, className = '') {
  if (!targetID) console.log('params id is required');
  let targetDOM = document.getElementById(targetID);
  if (!targetDOM) {
    targetDOM = document.createElement('div');
    targetDOM.id = targetID;
    targetDOM.className = className;
    document.body.appendChild(targetDOM);
  }
  return targetDOM;
}

export function destoryDOM(targetID: string) {
  const targetDOM = document.getElementById(targetID);
  targetDOM && document.body.removeChild(targetDOM);
}

export const setDOMStyleFac =
  (domPrefix = 'body') =>
  (domSelector: string, style: React.CSSProperties) => {
    const targets = document.querySelectorAll<HTMLElement>(
      `${domPrefix} ${domSelector}`
    );
    if (targets.length <= 0) return;
    for (const dom of targets as any) {
      Object.assign(dom.style, style);
    }
  };
