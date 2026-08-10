import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatePicker } from './DatePicker';
import { DateTimePicker } from './DateTimePicker';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  align?: 'left' | 'right';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, align = 'left', ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  if (type === 'date') {
    return <DatePicker ref={ref} className={className} align={align} {...props} />;
  }

  if (type === 'datetime-local') {
    return <DateTimePicker ref={ref} className={className} align={align} {...props} />;
  }

  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="relative w-full flex items-center">
      <input
        ref={ref}
        type={resolvedType}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isPassword ? 'pr-10' : '',
          className,
        )}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none flex items-center justify-center p-1 rounded-md hover:bg-slate-100/50 transition-colors"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
});
Input.displayName = 'Input';
