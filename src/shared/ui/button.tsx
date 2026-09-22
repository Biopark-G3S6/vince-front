import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@shared/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-vince-primary text-white shadow-sm hover:bg-[#571424] active:bg-[#4c101e] disabled:bg-[#b9949c]',
  secondary:
    'bg-vince-tertiary text-vince-primary hover:bg-[#ead8dc] active:bg-[#e2cbd1] disabled:text-[#9f848a]',
  outline:
    'border border-vince-border bg-white text-vince-primary hover:bg-vince-tertiary active:bg-[#ead8dc] disabled:text-[#9f848a]',
  ghost: 'bg-transparent text-vince-muted hover:bg-vince-tertiary active:bg-[#ead8dc]',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-9 gap-2 px-3 text-sm',
  md: 'h-11 gap-2 px-5 text-base',
  lg: 'h-14 gap-3 px-7 text-lg',
  icon: 'h-10 w-10 p-0',
};

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  type = 'button',
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-padrao font-semibold transition-colors disabled:cursor-not-allowed',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
