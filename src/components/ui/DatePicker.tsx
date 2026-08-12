import { forwardRef, useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string | number | readonly string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (event: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBlur?: (event: any) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
}

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const formatDateForDB = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const dateOnly = dateStr.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed month
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
};

const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const dateOnly = dateStr.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
};

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ id, name, value = '', onChange, onBlur, className, placeholder = 'dd-mm-yyyy', disabled, align = 'left', ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    const stringValue = typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? (value[0] || '')
        : String(value ?? '');

    const [committedValue, setCommittedValue] = useState(stringValue);

    // Sync external value to local state
    useEffect(() => {
      setCommittedValue(stringValue);
      if (stringValue) {
        const parsed = parseDateString(stringValue);
        if (parsed) {
          setSelectedDate(parsed);
          setCurrentMonth(parsed);
        }
      } else {
        setSelectedDate(null);
        setCurrentMonth(new Date());
      }
    }, [stringValue]);

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    const handleSelectDate = (date: Date) => {
      setSelectedDate(date);
      const dbValue = formatDateForDB(date);
      setCommittedValue(dbValue);
      if (onChange) {
        onChange({
          target: {
            name,
            value: dbValue,
          },
        });
      }
      setIsOpen(false);
    };

    const prevYear = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1));
    };

    const prevMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const nextYear = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1));
    };

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Generate 42 calendar grid days (Monday through Sunday)
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOffset = (dayOfWeek + 6) % 7; // Monday-offset (0 to 6)

    const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month's trailing days
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevMonthDaysCount = getDaysInMonth(prevMonthYear, prevMonthIdx);
    for (let i = startOffset - 1; i >= 0; i--) {
      calendarDays.push({
        date: new Date(prevMonthYear, prevMonthIdx, prevMonthDaysCount - i),
        isCurrentMonth: false,
      });
    }

    // Current month's days
    const currentMonthDaysCount = getDaysInMonth(year, month);
    for (let i = 1; i <= currentMonthDaysCount; i++) {
      calendarDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month's leading days
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    let nextDay = 1;
    while (calendarDays.length < 42) {
      calendarDays.push({
        date: new Date(nextMonthYear, nextMonthIdx, nextDay++),
        isCurrentMonth: false,
      });
    }

    const displayValue = committedValue ? formatDateForDisplay(committedValue) : '';

    return (
      <div ref={containerRef} className="relative w-full">
        {/* Hidden Input for Form Registers */}
        <input
          type="hidden"
          id={id}
          name={name}
          value={committedValue}
          ref={ref}
          onBlur={onBlur}
          {...props}
        />

        {/* Visible Display Input */}
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50 bg-slate-50',
            className
          )}
        >
          <span className={cn('text-sm', !displayValue ? 'text-muted-foreground' : 'text-foreground')}>
            {displayValue || placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-slate-400" />
        </div>

        {/* Calendar Picker Popover */}
        {isOpen && (
          <div className={cn(
            "absolute top-full mt-1.5 z-50 bg-white border border-slate-100 shadow-xl rounded-2xl p-4 w-[288px] select-none",
            align === 'right' ? 'right-0' : 'left-0'
          )}>
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={prevYear}
                  className="w-7 h-7 flex items-center justify-center border border-slate-100 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors text-xs font-bold font-mono"
                  title="Previous Year"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-7 h-7 flex items-center justify-center border border-slate-100 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors text-xs font-bold font-mono"
                  title="Previous Month"
                >
                  ‹
                </button>
              </div>

              <span className="text-xs font-semibold text-slate-800">
                {monthNames[month]} {year}
              </span>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-7 h-7 flex items-center justify-center border border-slate-100 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors text-xs font-bold font-mono"
                  title="Next Month"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={nextYear}
                  className="w-7 h-7 flex items-center justify-center border border-slate-100 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors text-xs font-bold font-mono"
                  title="Next Year"
                >
                  »
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </div>

            {/* Calendar Grid Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayObj, idx) => {
                const isSelected = selectedDate && formatDateForDB(dayObj.date) === formatDateForDB(selectedDate);
                const isToday = formatDateForDB(dayObj.date) === formatDateForDB(new Date());

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDate(dayObj.date)}
                    className={cn(
                      'h-8 w-8 flex items-center justify-center text-xs rounded-lg transition-colors font-medium',
                      dayObj.isCurrentMonth ? 'text-slate-800' : 'text-slate-300',
                      isSelected
                        ? 'bg-slate-900 text-white font-bold hover:bg-slate-900'
                        : isToday
                          ? 'border border-slate-300 text-slate-900 hover:bg-slate-50'
                          : 'hover:bg-slate-50'
                    )}
                  >
                    {dayObj.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
