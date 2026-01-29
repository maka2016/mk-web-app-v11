/**
 * 文本处理工具函数
 * 确保数据源始终为纯文本的处理函数
 * 保存时除了换行符、空格外，不应该保存任何HTML相关标签
 */
export const getPlainTextValue = (rawValue: string): string => {
  if (!rawValue) return '';

  // 如果输入已经是纯文本（不包含HTML标签），直接返回
  if (!/<[^>]+>/.test(rawValue)) {
    // 只处理HTML实体编码
    return rawValue
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  // 先处理 br 标签，将其转换为换行符（在所有情况下都需要处理）
  let processedValue = rawValue
    .replace(/<br\s*\/?>/gi, '\n') // 将 <br> 或 <br /> 替换为换行符（不区分大小写）
    .replace(/&nbsp;/g, ' ') // 将 &nbsp; 替换为空格
    .replace(/&amp;/g, '&') // 将 &amp; 替换为 &
    .replace(/&lt;/g, '<') // 将 &lt; 替换为 <
    .replace(/&gt;/g, '>') // 将 &gt; 替换为 >
    .replace(/&quot;/g, '"') // 将 &quot; 替换为 "
    .replace(/&#39;/g, "'"); // 将 &#39; 替换为 '

  // 如果包含HTML标签，提取纯文本内容
  if (processedValue.includes('<ul') || processedValue.includes('<li')) {
    return processedValue
      .replace(/<ul[^>]*>/g, '') // 移除ul标签
      .replace(/<\/ul>/g, '') // 移除ul结束标签
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/g, '') // 移除svg标签及其内容（支持换行）
      .replace(/<img[^>]*>/g, '') // 移除img标签（自定义图标）
      .replace(/<iconpark-icon[^>]*><\/iconpark-icon>/g, '') // 移除iconpark-icon标签
      .replace(/<li[^>]*>/g, '') // 移除li开始标签
      .replace(/<\/li>\s*/g, '\n') // li结束标签替换为换行，同时移除后面的空白
      .replace(/<span[^>]*>/g, '') // 移除span开始标签
      .replace(/<\/span>/g, '') // 移除span结束标签
      .replace(/<div[^>]*>/g, '') // 移除所有div开始标签（包括text-paragraph等）
      .replace(/<\/div>/g, '') // 移除所有div结束标签
      .replace(/\s*\n\s*/g, '\n') // 规范化换行符：移除换行前后的空白字符
      .replace(/\n{2,}/g, '\n') // 多个连续换行合并为单个
      .trim(); // 去除首尾空白
  }

  // 对于普通文本，移除所有HTML标签（包括嵌套的div、span等所有标签）
  // 使用更严格的正则，确保移除所有可能的HTML标签
  processedValue = processedValue
    .replace(/<[^>]+>/g, '') // 移除所有HTML标签
    .replace(/<\/[^>]+>/g, ''); // 再次确保移除所有结束标签（双重保险）

  return processedValue.trim();
};

/**
 * 从DOM元素中安全提取纯文本内容
 * 确保即使DOM中包含HTML结构也能正确提取纯文本，并保留换行符
 */
export const extractPlainTextFromElement = (element: HTMLElement): string => {
  // 对于 plaintext-only 模式的 contenteditable，textContent 应该已经保留了换行符
  // 但为了处理可能存在的 HTML 结构（如列表、段落等），我们需要特殊处理

  // 如果没有 innerHTML 或者是纯文本，直接使用 textContent（它保留换行符）
  if (!element.innerHTML || element.innerHTML === element.textContent) {
    return element.textContent || element.innerText || '';
  }

  // 创建一个临时元素来复制HTML结构，这样可以安全地处理节点
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = element.innerHTML;

  // 遍历所有节点，将 <br> 转换为换行符，处理块级元素
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as HTMLElement;
      const tagName = elem.tagName.toLowerCase();

      // <br> 标签直接转换为换行符
      if (tagName === 'br') {
        return '\n';
      }

      // 处理子节点
      let result = '';
      for (const child of Array.from(elem.childNodes)) {
        result += processNode(child);
      }

      // 块级元素（如 div, p 等）在结束后添加换行符
      // 但排除 ul/ol，因为它们内部的 li 已经处理了换行
      const blockElements = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      if (blockElements.includes(tagName)) {
        result += '\n';
      }

      // li 元素在结束后添加换行符
      if (tagName === 'li') {
        result += '\n';
      }

      return result;
    }

    return '';
  };

  let text = '';
  for (const child of Array.from(tempDiv.childNodes)) {
    text += processNode(child);
  }

  // 保留所有换行符，不删除它们
  // 只清理换行前后的多余空格（保留换行符本身）
  return text
    .replace(/[ \t]+/g, ' ') // 多个空格合并为一个
    .replace(/([ \t]*\n[ \t]*)/g, '\n'); // 换行前后的空格清理，但保留换行符
};

/**
 * 验证文本是否包含HTML标签
 */
export const containsHtmlTags = (text: string): boolean => {
  return /<[^>]+>/.test(text);
};
