import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import { useAuth } from '@/hooks/useAuth';

export function StudentNotificationBell() {
  const { isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsService.unreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  });

  const unreadCount = data?.count ?? 0;

  return (
    <Link
      to="/student/notifications"
      className="relative p-2.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-[#8b5cf6] hover:shadow transition-all flex items-center justify-center group"
      title={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
    >
      <Bell className="h-5 w-5 text-slate-600 group-hover:text-[#8b5cf6] transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-extrabold text-white ring-2 ring-white shadow-sm transition-all animate-in fade-in zoom-in duration-200">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
