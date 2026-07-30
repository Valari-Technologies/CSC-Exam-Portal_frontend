import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** When true, a red asterisk is shown after the label to mark the field required. */
  requiredMark?: boolean;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, error, className, id, requiredMark, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium">
            {label}
            {requiredMark && <span className="ml-0.5 text-destructive">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 bg-background text-foreground outline-none transition-all duration-150',
            'focus:scale-[1.005]',
            error ? 'border-destructive focus:border-destructive' : 'border-input focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  },
);
AnimatedInput.displayName = 'AnimatedInput';
