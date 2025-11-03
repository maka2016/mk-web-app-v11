import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';

// 模拟 ReactDOM.render
// eslint-disable-next-line react/no-deprecated
ReactDOM.render = (Component, container, callback) => {
  if (!container._reactRoot) {
    container._reactRoot = createRoot(container); // 为容器创建一个根
  }
  container._reactRoot.render(Component); // 使用新的 render 方法
  if (callback) {
    setTimeout(callback);
  }
};

// 模拟 ReactDOM.unmountComponentAtNode
// eslint-disable-next-line react/no-deprecated
ReactDOM.unmountComponentAtNode = container => {
  if (container._reactRoot) {
    container._reactRoot.unmount(); // 使用新的 unmount 方法
    delete container._reactRoot;
  }
};

ReactDOM.findDOMNode = component => {
  return null;
};
