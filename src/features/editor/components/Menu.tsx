import type { ReactNode } from 'react';

import * as Dropdown from '@radix-ui/react-dropdown-menu';

import { cn } from '@shared/lib/cn';

export const Menu = Dropdown.Root;
export const MenuTrigger = Dropdown.Trigger;

export function MenuContent({
  children,
  className,
  align = 'start',
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        className={cn(
          'z-50 min-w-[200px] rounded-md border border-vince-border bg-white p-1 text-xs shadow-lg print:hidden',
          className,
        )}
        sideOffset={4}
      >
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
}

export function MenuItem({
  children,
  shortcut,
  checked,
  disabled,
  onSelect,
}: {
  children: ReactNode;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <Dropdown.Item
      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-vince-text outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-vince-tertiary"
      disabled={disabled}
      onSelect={onSelect}
    >
      <span className="w-3 text-vince-primary">{checked ? '✓' : ''}</span>
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[10px] text-vince-muted">{shortcut}</span>}
    </Dropdown.Item>
  );
}

export function MenuSeparator() {
  return <Dropdown.Separator className="my-1 h-px bg-vince-border" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <Dropdown.Label className="px-2 py-1 text-[10px] text-vince-muted">{children}</Dropdown.Label>
  );
}
