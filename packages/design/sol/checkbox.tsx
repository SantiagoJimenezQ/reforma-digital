'use client';

import type { ReactNode } from 'react';
import * as Primitive from '@radix-ui/react-checkbox';

export function Checkbox({
  checked,
  onCheckedChange,
  icon,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="sol-checkbox">
      <Primitive.Root
        className="sol-checkbox-control"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      >
        <Primitive.Indicator>{icon}</Primitive.Indicator>
      </Primitive.Root>
      <span>{children}</span>
    </label>
  );
}
