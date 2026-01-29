import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { cn } from '@workspace/ui/lib/utils';
import React, { useState } from 'react';

interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  className?: string;
}

const PageIndicator: React.FC<PageIndicatorProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePageClick = (pageIndex: number) => {
    onPageChange(pageIndex);
    setIsOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          'z-[111] absolute bottom-2 right-2 cursor-pointer',
          'bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5',
          'text-white text-xs sm:text-sm font-medium',
          'hover:bg-black/70 transition-colors',
          'select-none',
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        {currentPage + 1} / {totalPages}
      </div>

      <ResponsiveDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="选择页面"
        description={`共 ${totalPages} 页`}
        contentProps={{
          className: 'max-w-[400px] w-full',
        }}
      >
        <div className="p-4">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto">
            {Array.from({ length: totalPages }, (_, index) => (
              <Button
                key={index}
                variant={index === currentPage ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-10 min-w-[40px]',
                  index === currentPage && 'bg-primary text-primary-btn'
                )}
                onClick={() => handlePageClick(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
};

export default PageIndicator;
