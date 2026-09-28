import { cn } from '@shared/lib/cn';

type BrandMarkProps = {
  align?: 'left' | 'center';
  compact?: boolean;
  className?: string;
};

export function BrandMark({ align = 'left', compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', className)}>
      <p
        className={cn(
          'font-black leading-none text-vince-primary',
          compact ? 'text-xl' : 'text-5xl',
        )}
      >
        VinceArt
      </p>
      {!compact && <p className="mt-3 text-xl text-vince-muted">Academic Portal</p>}
    </div>
  );
}
