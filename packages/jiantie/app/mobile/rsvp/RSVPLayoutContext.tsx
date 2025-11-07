'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface RSVPLayoutContextValue {
  title: string;
  setTitle: (title: string) => void;
}

const RSVPLayoutContext = createContext<RSVPLayoutContextValue | undefined>(
  undefined
);

export function RSVPLayoutProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('RSVP');

  return (
    <RSVPLayoutContext.Provider value={{ title, setTitle }}>
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
