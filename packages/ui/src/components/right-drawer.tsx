'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';
import { Button } from '@workspace/ui/components/button';

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function RightDrawer({
  isOpen,
  onClose,
  title,
  children,
}: RightDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 bg-black/40 z-50'
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className='fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-lg z-50 overflow-hidden flex flex-col'
          >
            <div className='flex items-center justify-between p-4 border-b'>
              <h2 className='text-xl font-semibold'>{title}</h2>
              <Button
                variant='ghost'
                size='icon'
                onClick={onClose}
                className='rounded-full hover:bg-gray-100'
              >
                <X className='h-6 w-6' />
                <span className='sr-only'>Close111</span>
              </Button>
            </div>
            <div className='flex-1 overflow-y-auto p-4'>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
