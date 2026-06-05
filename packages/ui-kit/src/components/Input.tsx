import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, id, ...props },
  ref
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-subtle">{label}</span>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-zinc-100',
          'shadow-inner placeholder:text-subtle',
          'transition-[border-color,box-shadow,background-color] duration-200',
          'hover:border-white/15 hover:bg-black/50',
          'focus:border-gold/35 focus:bg-black/55 focus:shadow-[0_0_0_3px_rgba(232,197,71,0.12)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </label>
  );
});
