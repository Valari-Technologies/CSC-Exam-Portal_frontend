import { User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  /** Absolute URL of the user's uploaded photo, or null/undefined for the default icon. */
  photoUrl?: string | null;
  name?: string | null;
  /** Sizing/positioning for the circular container (e.g. "h-8 w-8"). */
  className?: string;
  /** Sizing for the fallback icon (e.g. "h-5 w-5"). */
  iconClassName?: string;
}

/**
 * The user's profile photo shown as a circle, falling back to the default person icon when
 * no photo is set. Used wherever the signed-in user is represented (header icon + menu), so
 * an uploaded photo replaces the default avatar consistently across the app.
 */
export function UserAvatar({ photoUrl, name, className, iconClassName }: UserAvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
        className,
      )}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name ?? 'Profile'} className="h-full w-full object-cover" />
      ) : (
        <UserIcon className={cn('text-muted-foreground', iconClassName)} />
      )}
    </span>
  );
}
