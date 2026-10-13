'use client';

import { useState, type ReactNode } from 'react';
import * as Primitive from '@radix-ui/react-select';

type Option = { value: string; label: string };

export function Select({
  id,
  name,
  label,
  defaultValue,
  options,
  icon,
  selectedIcon,
  disabled = false,
}: {
  id?: string;
  name: string;
  label: string;
  defaultValue: string;
  options: Option[];
  icon: ReactNode;
  selectedIcon: ReactNode;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(() =>
    options.some((option) => option.value === defaultValue)
      ? defaultValue
      : (options[0]?.value ?? ''),
  );
  const selected = options.findIndex((option) => option.value === value);
  return (
    <>
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <Primitive.Root
        value={String(selected)}
        disabled={disabled}
        onValueChange={(index) => {
          const option = options[Number(index)];
          if (option) setValue(option.value);
        }}
      >
        <Primitive.Trigger id={id} className="campo sol-select" aria-label={label}>
          <Primitive.Value>{options[selected]?.label}</Primitive.Value>
          <Primitive.Icon>{icon}</Primitive.Icon>
        </Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content className="sol-select-menu" position="popper" sideOffset={8}>
            <Primitive.Viewport>
              {options.map((option, index) => (
                <Primitive.Item
                  className="sol-select-option"
                  value={String(index)}
                  key={option.value}
                >
                  <Primitive.ItemText>{option.label}</Primitive.ItemText>
                  <Primitive.ItemIndicator>{selectedIcon}</Primitive.ItemIndicator>
                </Primitive.Item>
              ))}
            </Primitive.Viewport>
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </>
  );
}
