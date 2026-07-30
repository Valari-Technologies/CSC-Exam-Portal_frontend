import { useState, useEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, Shield, ChevronDown } from 'lucide-react';
import auditLogHeaderImg from '@/assets/dashboard_designs/Audit logs/audit log.png';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { auditService } from '@/services/audit.service';
import type { AuditAction } from '@/types';
import { cn } from '@/lib/utils';

const ACTION_LABELS: Record<AuditAction, string> = {
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Login Failed',
  exam_start: 'Exam Start',
  exam_submit: 'Exam Submit',
  password_change: 'Password Change',
  password_reset: 'Password Reset',
  data_export: 'Data Export',
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_deactivated: 'User Deactivated',
  school_created: 'School Created',
  school_updated: 'School Updated',
  result_published: 'Result Published',
  bulk_import: 'Bulk Import',
  bulk_import_deleted: 'Import Record Deleted',
  test_published: 'Test Published',
  test_assigned: 'Test Assigned',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', { page, action: actionFilter, search }],
    queryFn: () =>
      auditService.list({
        page,
        action: actionFilter || undefined,
        search: search || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6 relative">
      {/* Premium Header Banner with audit log.png background */}
      <div className="relative group rounded-[24px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f0f4ff]">
        <img
          src={auditLogHeaderImg}
          alt="Audit Logs Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 z-10 shrink-0">
              <Shield className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2 drop-shadow-sm leading-tight">
                Audit Logs
              </h1>
              <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
                Login events, exam activity, and platform actions monitor
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Container */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs flex flex-wrap items-center gap-4 relative z-10">
        {/* Search Field */}
        <form onSubmit={onSearchSubmit} className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search logs by email address..."
            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-semibold"
          />
        </form>

        {/* Custom Dropdown Selector */}
        <div ref={dropdownRef} className="relative min-w-[240px] w-full sm:w-auto z-50">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 text-sm font-semibold w-full hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer text-left"
          >
            <span>{actionFilter ? ACTION_LABELS[actionFilter as AuditAction] : 'Filter by Action (All)'}</span>
            <ChevronDown className={cn("h-4 w-4 text-indigo-500 transition-transform duration-200 shrink-0", dropdownOpen && "rotate-180")} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-full min-w-[240px] max-h-60 overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-xl py-1.5 z-50 custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                type="button"
                onClick={() => {
                  setActionFilter('');
                  setPage(1);
                  setDropdownOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors",
                  actionFilter === ''
                    ? "text-indigo-600 bg-indigo-50/50"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                Filter by Action (All)
              </button>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActionFilter(key);
                    setPage(1);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors",
                    actionFilter === key
                      ? "text-indigo-600 bg-indigo-50/50"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table Card Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-12"><Spinner label="Loading logs…" /></div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive font-bold">Failed to load audit logs.</div>
        ) : data && data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400 font-bold">No logs found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-b border-slate-100">
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-20">S.No</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date / Time</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">User</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Action</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((log, index) => (
                <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                  <TableCell className="text-center font-semibold text-slate-500 tabular-nums">
                    {(page - 1) * 20 + index + 1}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm font-bold text-indigo-600">
                    {log.user_email || '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200/40 text-[11px] font-bold px-2 py-0.5">
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={log.status === 'success' ? 'success' : 'destructive'}
                      className={log.status === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/40 text-[11px] font-bold px-2 py-0.5'
                        : 'bg-rose-50 text-rose-700 border-rose-200/40 text-[11px] font-bold px-2 py-0.5'
                      }
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.count > 20 && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mt-4 px-1">
          <span>Page {page} of {totalPages} — {data.count} total logs</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-bold px-4 h-9 cursor-pointer"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-bold px-4 h-9 cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
