import { forwardRef, useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  id?: string;
  name?: string;
  value?: string | number | readonly string[];
  onChange?: (event: any) => void;
  onBlur?: (event: any) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
}

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const parseDateTime = (val: string) => {
  if (!val) return { date: null, hours: '12', minutes: '00', period: 'AM' };
  const parts = val.split('T');
  if (parts.length !== 2) return { date: null, hours: '12', minutes: '00', period: 'AM' };
  const dateParts = parts[0].split('-');
  const timeParts = parts[1].split(':');
  if (dateParts.length !== 3 || timeParts.length < 2) {
    return { date: null, hours: '12', minutes: '00', period: 'AM' };
  }
  const date = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
  const rawHours = Number(timeParts[0]);
  const minutes = timeParts[1].substring(0, 2);
  const period = rawHours >= 12 ? 'PM' : 'AM';
  let hoursVal = rawHours % 12;
  if (hoursVal === 0) hoursVal = 12;
  const hours = String(hoursVal).padStart(2, '0');
  return { date, hours, minutes, period };
};

const formatDateForDB = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateTimeForDB = (date: Date, hours: string, minutes: string, period: string): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  let h = Number(hours);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const hh = String(h).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${minutes}`;
};

const formatDateTimeForDisplay = (val: string): string => {
  if (!val) return '';
  const { date, hours, minutes, period } = parseDateTime(val);
  if (!date) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy} ${hours}:${minutes} ${period}`;
};

export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  ({ id, name, value = '', onChange, onBlur, className, placeholder = 'dd-mm-yyyy --:-- --', disabled, align = 'left', ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedHours, setSelectedHours] = useState('12');
    const [selectedMinutes, setSelectedMinutes] = useState('00');
    const [selectedPeriod, setSelectedPeriod] = useState('AM');
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
        const { date, hours, minutes, period } = parseDateTime(stringValue);
        if (date && !isNaN(date.getTime())) {
          setSelectedDate(date);
          setCurrentMonth(date);
          setSelectedHours(hours);
          setSelectedMinutes(minutes);
          setSelectedPeriod(period);
        }
      } else {
        setSelectedDate(null);
        setCurrentMonth(new Date());
        setSelectedHours('12');
        setSelectedMinutes('00');
        setSelectedPeriod('AM');
      }
    }, [stringValue]);

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          handleCancel();
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen, committedValue]);

    const handleApply = () => {
      const activeDate = selectedDate || new Date();
      const dbValue = formatDateTimeForDB(activeDate, selectedHours, selectedMinutes, selectedPeriod);
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

    const handleCancel = () => {
      // Revert states
      if (committedValue) {
        const { date, hours, minutes, period } = parseDateTime(committedValue);
        if (date) {
          setSelectedDate(date);
          setCurrentMonth(date);
          setSelectedHours(hours);
          setSelectedMinutes(minutes);
          setSelectedPeriod(period);
        }
      } else {
        setSelectedDate(null);
        setSelectedHours('12');
        setSelectedMinutes('00');
        setSelectedPeriod('AM');
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

    // Calendar generation
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay();
    const startOffset = (dayOfWeek + 6) % 7;

    const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevMonthDaysCount = getDaysInMonth(prevMonthYear, prevMonthIdx);
    for (let i = startOffset - 1; i >= 0; i--) {
      calendarDays.push({
        date: new Date(prevMonthYear, prevMonthIdx, prevMonthDaysCount - i),
        isCurrentMonth: false,
      });
    }

    const currentMonthDaysCount = getDaysInMonth(year, month);
    for (let i = 1; i <= currentMonthDaysCount; i++) {
      calendarDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    let nextDay = 1;
    while (calendarDays.length < 42) {
      calendarDays.push({
        date: new Date(nextMonthYear, nextMonthIdx, nextDay++),
        isCurrentMonth: false,
      });
    }

    const displayValue = committedValue ? formatDateTimeForDisplay(committedValue) : '';

    // List of hours (01-12)
    const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    // List of minutes (00-59)
    const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    return (
      <div ref={containerRef} className="relative w-full">
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
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

        {/* Calendar & Time Picker Popover */}
        {isOpen && (
          <div className={cn(
            "absolute top-full mt-1.5 z-50 bg-white border border-slate-100 shadow-xl rounded-2xl p-4 flex gap-4 w-[470px] select-none",
            align === 'right' ? 'right-0' : 'left-0'
          )}>
            
            {/* Left Pane: Calendar Picker */}
            <div className="w-[260px] shrink-0">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={prevYear}
                    className="w-7 h-7 flex items-center justify-center border border-slate-100 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors text-xs font-bold font-mono"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="w-7 h-7 flex items-center justify-center border border-slate-100 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors text-xs font-bold font-mono"
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
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={nextYear}
                    className="w-7 h-7 flex items-center justify-center border border-slate-100 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors text-xs font-bold font-mono"
                  >
                    »
                  </button>
                </div>
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
                <span>Su</span>
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
                      onClick={() => setSelectedDate(dayObj.date)}
                      className={cn(
                        'h-7 w-7 flex items-center justify-center text-xs rounded-lg transition-colors font-medium',
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

              {/* Footer Buttons inside Calendar wrapper */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Right Pane: Time Columns Picker (matching the 2nd screenshot styling details) */}
            <div className="flex border-l border-slate-100 pl-4 pr-1 gap-3.5 w-[150px] justify-between">
              
              {/* Hour Column */}
              <div className="flex flex-col items-center w-8 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">HH</span>
                <div className="flex-1 overflow-y-auto max-h-[190px] w-full flex flex-col gap-1 no-scrollbar text-center">
                  {hoursList.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSelectedHours(h)}
                      className={cn(
                        'h-7 w-7 shrink-0 text-xs font-medium rounded-lg transition-colors flex items-center justify-center',
                        selectedHours === h ? 'bg-slate-900 text-white font-bold' : 'text-slate-800 hover:bg-slate-50'
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minute Column */}
              <div className="flex flex-col items-center w-8 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">MM</span>
                <div className="flex-1 overflow-y-auto max-h-[190px] w-full flex flex-col gap-1 no-scrollbar text-center">
                  {minutesList.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMinutes(m)}
                      className={cn(
                        'h-7 w-7 shrink-0 text-xs font-medium rounded-lg transition-colors flex items-center justify-center',
                        selectedMinutes === m ? 'bg-slate-900 text-white font-bold' : 'text-slate-800 hover:bg-slate-50'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period Column */}
              <div className="flex flex-col items-center w-10 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">AM/PM</span>
                <div className="flex flex-col gap-1 w-full text-center">
                  {['AM', 'PM'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPeriod(p)}
                      className={cn(
                        'h-7 w-10 shrink-0 text-xs font-medium rounded-lg transition-colors flex items-center justify-center',
                        selectedPeriod === p ? 'bg-slate-900 text-white font-bold' : 'text-slate-800 hover:bg-slate-50'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    );
  }
);

DateTimePicker.displayName = 'DateTimePicker';
