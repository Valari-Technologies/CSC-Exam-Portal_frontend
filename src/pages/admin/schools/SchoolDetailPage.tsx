import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Building2,
  Edit,
  GraduationCap,
  Hash,
  Mail,
  MapPin,
  Phone,
  Trash2,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { schoolsService } from '@/services/schools.service';
import type { SchoolStatus } from '@/types';
import SchoolAdminSection from './SchoolAdminSection';
import card1Img from '@/assets/dashboard_designs/Super admin/school-card1.webp';
import card2Img from '@/assets/dashboard_designs/Super admin/school-card2.webp';
import card3Img from '@/assets/dashboard_designs/Super admin/school-card3.webp';
import card4Img from '@/assets/dashboard_designs/Super admin/school-card4.webp';
import card5Img from '@/assets/dashboard_designs/Super admin/school-card5.webp';
import card6Img from '@/assets/dashboard_designs/Super admin/school-card6.webp';

const STATUS_VARIANT: Record<SchoolStatus, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  inactive: 'warning',
  suspended: 'destructive',
};

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  bgImage: string;
}

function StatCard({ label, value, icon, bgImage }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-none shadow-sm h-full min-h-[90px] flex items-center group">
      <img
        src={bgImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
      {/* Light glassmorphism overlay to ensure high readability of text */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[0.5px]"></div>
      
      <CardContent className="relative z-10 p-4 flex items-center gap-3 w-full">
        <div className="rounded-xl bg-white/35 text-slate-800 p-2.5 shadow-2xs backdrop-blur-[2px] border border-white/20 shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700/90 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const schoolId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const schoolQuery = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => schoolsService.get(schoolId),
    enabled: Number.isFinite(schoolId),
  });

  const statsQuery = useQuery({
    queryKey: ['school', schoolId, 'stats'],
    queryFn: () => schoolsService.stats(schoolId),
    enabled: Number.isFinite(schoolId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => schoolsService.remove(schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      navigate('/admin/schools');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: SchoolStatus) => schoolsService.patch(schoolId, { status }),
    onSuccess: () => {
      // Refresh this school and every cached list/dashboard that shows its status badge.
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
  });

  if (schoolQuery.isLoading) return <Spinner label="Loading school…" />;
  if (schoolQuery.isError || !schoolQuery.data) {
    return <p className="text-sm text-destructive">Failed to load school.</p>;
  }

  const school = schoolQuery.data;
  const stats = statsQuery.data;

  const getLogoUrl = (url: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    return `${base}${url}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {school.logo_url ? (
            <img
              src={getLogoUrl(school.logo_url)}
              alt={`${school.name} logo`}
              className="h-16 w-16 flex-shrink-0 rounded-xl object-contain border bg-background"
            />
          ) : (
            <div className="h-16 w-16 flex-shrink-0 rounded-xl border bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="h-7 w-7" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              {school.name}
              <Badge variant={STATUS_VARIANT[school.status]}>{school.status}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              School ID <span className="font-mono">{school.code}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <select
              aria-label="School status"
              value={school.status}
              disabled={statusMutation.isPending}
              onChange={(e) => statusMutation.mutate(e.target.value as SchoolStatus)}
              className="py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            {statusMutation.isError && (
              <p className="text-xs text-destructive">Could not update status.</p>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate(`/admin/schools/${school.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="School admins"
          value={stats?.school_admins ?? 0}
          icon={<Building2 className="h-5 w-5" />}
          bgImage={card1Img}
        />
        <StatCard
          label="Teachers"
          value={stats?.teachers ?? 0}
          icon={<Users className="h-5 w-5" />}
          bgImage={card2Img}
        />
        <StatCard
          label="Students"
          value={stats?.students ?? 0}
          icon={<GraduationCap className="h-5 w-5" />}
          bgImage={card3Img}
        />
        <StatCard label="Classes" value={stats?.classes ?? 0} icon={<Building2 className="h-5 w-5" />} bgImage={card4Img} />
        <StatCard label="Subjects" value={stats?.subjects ?? 0} icon={<Building2 className="h-5 w-5" />} bgImage={card5Img} />
        <StatCard label="Tests" value={stats?.tests ?? 0} icon={<Building2 className="h-5 w-5" />} bgImage={card6Img} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Address</p>
              <p>
                {school.address}, {school.city}, {school.state} {school.pincode}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Principal</p>
              <p>{school.principal_name || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Official school email</p>
              <p>{school.official_email}</p>
              <p className="text-muted-foreground text-xs">Used only for communication.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Contact phone</p>
              <p>{school.contact_phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">School Board</p>
              <p>
                {school.school_board === 'state_board' ? 'State Board'
                  : school.school_board === 'cbse' ? 'CBSE Board'
                  : school.school_board === 'matriculation' ? 'Matriculation'
                  : school.school_board || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">School Code</p>
              <p className="font-mono">{school.school_code || '—'}</p>
            </div>
          </div>
          <div className="md:col-span-2 text-xs text-muted-foreground border-t pt-3">
            {school.status === 'active' ? (
              <>This school is <strong>Active</strong> — its admins, teachers, and students can sign in.</>
            ) : (
              <>
                This school is <strong>{school.status === 'suspended' ? 'Suspended' : 'Inactive'}</strong>{' '}
                — its admins, teachers, and students are blocked from signing in until it is
                set back to Active.
              </>
            )}
          </div>
          <div className="md:col-span-2 text-xs text-muted-foreground border-t pt-3">
            Created {new Date(school.created_at).toLocaleString()}
            {' · '}Last updated {new Date(school.updated_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <SchoolAdminSection schoolId={school.id} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {school.name}?</DialogTitle>
            <DialogDescription>
              This will permanently delete the school and cascade-delete all its users, classes,
              students, and tests. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">
              Could not delete this school. Please try again or contact support.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
