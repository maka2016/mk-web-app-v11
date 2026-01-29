'use client';
import { createContext, ReactNode, useContext, useState } from 'react';

interface RSVPLayoutContextValue {
  title: string;
  setTitle: (title: string) => void;
  rightText: string;
  setRightText: (text: string) => void;
  rightContent: ReactNode | null;
  setRightContent: (content: ReactNode | null) => void;
  onRightClick?: () => void;
  setOnRightClick: (handler: (() => void) | undefined) => void;
}

const RSVPLayoutContext = createContext<RSVPLayoutContextValue | undefined>(
  undefined
);

export function RSVPLayoutProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('RSVP');
  const [rightText, setRightText] = useState('');
  const [rightContent, setRightContent] = useState<ReactNode | null>(null);
  const [onRightClick, setOnRightClick] = useState<(() => void) | undefined>();

  return (
    <RSVPLayoutContext.Provider
      value={{
        title,
        setTitle,
        rightText,
        setRightText,
        rightContent,
        setRightContent,
        onRightClick,
        setOnRightClick,
      }}
    >
      {children}
    </RSVPLayoutContext.Provider>
  );
}

export function useRSVPLayout() {
  const context = useContext(RSVPLayoutContext);
  if (!context) {
    throw new Error('useRSVPLayout must be used within RSVPLayoutProvider');
  }
  return context;
}
