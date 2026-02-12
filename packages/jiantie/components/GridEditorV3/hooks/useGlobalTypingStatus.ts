import { useEffect, useRef, useState } from 'react';

/**
 * 全局监听用户是否正在输入（<input>、<textarea>、contenteditable）
 * @param delay 多久无输入后视为未输入，默认 1000ms
 */
export function useGlobalTypingStatus(delay = 1000): boolean {
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleActivity = (e: Event) => {
      const target = e.target as HTMLElement;
      const active = document.activeElement;

      const isEditable =
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable)) &&
        target === active;

      if (isEditable) {
        setIsTyping(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIsTyping(false);
        }, delay);
      }
    };

    document.addEventListener('input', handleActivity, true);
    document.addEventListener('keydown', handleActivity, true);

    return () => {
      document.removeEventListener('input', handleActivity, true);
      document.removeEventListener('keydown', handleActivity, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [delay]);

  return isTyping;
}
