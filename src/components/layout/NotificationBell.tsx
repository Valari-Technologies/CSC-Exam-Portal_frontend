import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { notificationsService } from '@/services/notifications.service';
import { useAuth } from '@/hooks/useAuth';

export function NotificationBell() {
  const { user, isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsService.unreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  const unreadCount = data?.count ?? 0;
  const notificationsPath = user?.role === 'student' ? '/student/notifications' : '/notifications';

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to={notificationsPath} aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
