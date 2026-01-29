import { Icon } from '@workspace/ui/components/Icon';
import { cn } from '@workspace/ui/lib/utils';

interface Props {
  className?: string;
  size?: number;
}
export function Loading(props: Props) {
  const { className, size } = props;
  return (
    <Icon
      name='loading'
      size={size || 24}
      className={cn(['animate-spin', className])}
    />
  );
}
