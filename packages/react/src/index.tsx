import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
} from 'react';
import { DomBridge, type FieldSnapshot } from '@reforma-digital/bridge';

const BridgeContext = createContext<DomBridge | null>(null);
export const BridgeProvider = BridgeContext.Provider;
export function useBridge(): DomBridge {
  const bridge = useContext(BridgeContext);
  if (!bridge) throw new Error('Wrap connected components in BridgeProvider');
  return bridge;
}
export function useBoundField(binding: string): FieldSnapshot {
  const bridge = useBridge();
  return useSyncExternalStore(bridge.subscribe, () => bridge.getField(binding));
}

/** Native date pickers, file inputs, CAPTCHA, certificates and signature controls stay on the page. */
export function BoundField({
  binding,
  className = '',
  submitAction,
}: {
  binding: string;
  className?: string;
  submitAction?: string;
}) {
  const bridge = useBridge();
  const state = useBoundField(binding);
  const spec = bridge.fieldSpec(binding);
  const id = useId();
  const checkable = state.type === 'checkbox' || state.type === 'radio';
  const common = {
    id,
    disabled: state.disabled,
    required: state.required,
    'aria-describedby': spec.help ? `${id}-help` : undefined,
    'aria-invalid': spec.element.getAttribute('aria-invalid') === 'true' ? true : undefined,
    className: 'bg-field',
  };
  return (
    <div className={`bg-bound ${className}`.trim()} data-binding={binding}>
      {!checkable ? (
        <label className="bg-label" htmlFor={id}>
          {spec.label}
          {state.required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      {state.type === 'select' ? (
        <select
          {...common}
          multiple={state.multiple}
          value={state.multiple ? [...state.values] : state.value}
          onChange={(event) =>
            bridge.setValue(
              binding,
              state.multiple
                ? Array.from(event.currentTarget.selectedOptions, (o) => o.value)
                : event.currentTarget.value,
            )
          }
        >
          {state.options.map((option, index) => (
            <option
              key={`${option.value}-${index}`}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      ) : state.type === 'textarea' ? (
        <textarea
          {...common}
          value={state.value}
          readOnly={state.readOnly}
          maxLength={state.maxLength < 0 ? undefined : state.maxLength}
          placeholder={state.placeholder}
          onChange={(event) => bridge.setValue(binding, event.currentTarget.value)}
        />
      ) : checkable ? (
        <label className={`bg-choice${state.checked ? ' bg-choice-checked' : ''}`} htmlFor={id}>
          <input
            {...common}
            className=""
            type={state.type}
            checked={state.checked}
            onChange={(event) => bridge.setChecked(binding, event.currentTarget.checked)}
          />
          {spec.label}
        </label>
      ) : (
        <input
          {...common}
          type={state.type}
          value={state.value}
          readOnly={state.readOnly}
          maxLength={state.maxLength < 0 ? undefined : state.maxLength}
          minLength={state.minLength < 0 ? undefined : state.minLength}
          pattern={state.pattern || undefined}
          autoComplete={state.autocomplete || 'off'}
          placeholder={state.placeholder}
          inputMode={state.inputMode as 'text'}
          onChange={(event) => bridge.setValue(binding, event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (submitAction) bridge.activate(submitAction);
              else bridge.submitFromField(binding);
            }
          }}
        />
      )}
      {spec.help ? (
        <p id={`${id}-help`} className="bg-hint mt-1.5">
          {spec.help}
        </p>
      ) : null}
    </div>
  );
}

export function BoundButton({
  binding,
  children,
  ...props
}: { binding: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'>) {
  const bridge = useBridge();
  useSyncExternalStore(bridge.subscribe, bridge.getRevision);
  const spec = bridge.actionSpec(binding);
  return (
    <button
      {...props}
      type="button"
      disabled={
        props.disabled ||
        spec.element.matches(':disabled') ||
        spec.element.getAttribute('aria-disabled') === 'true'
      }
      onClick={() => bridge.activate(binding)}
    >
      {children ?? spec.label}
    </button>
  );
}

/**
 * Reads a value derived from official content that is not a bound control (messages loaded by
 * AJAX, validation text…) and keeps it up to date when that content changes.
 */
export function useDomValue<T>(root: Node | null, read: () => T): T {
  const readRef = useRef(read);
  readRef.current = read;
  const [value, setValue] = useState<T>(() => read());
  useEffect(() => {
    if (!root) return;
    let last = JSON.stringify(readRef.current());
    const update = () => {
      const next = readRef.current();
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setValue(next);
      }
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [root]);
  return value;
}
