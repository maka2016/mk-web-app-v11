import viewport from 'micell/dom/viewport';

export default function () {
  const { width, height } = viewport(window);
  return {
    $viewport_width: width,
    $viewport_height: height,
  };
}
