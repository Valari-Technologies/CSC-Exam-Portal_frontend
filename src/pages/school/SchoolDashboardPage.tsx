import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, GraduationCap, ListChecks, Users } from 'lucide-react';
import headerImg from '@/assets/dashboard_designs/School/School_dashboard_header.webp';
import card2Img from '@/assets/dashboard_designs/School/school-card2.webp';
import card3Img from '@/assets/dashboard_designs/School/school-card3.webp';
import card4Img from '@/assets/dashboard_designs/School/school-card4.webp';
import card5Img from '@/assets/dashboard_designs/School/school-card5.webp';
import card6Img from '@/assets/dashboard_designs/School/school-card6.webp';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { schoolsService } from '@/services/schools.service';
import { studentsService } from '@/services/students.service';
import { teachersService } from '@/services/teachers.service';

/** How many rows each overview panel shows before deferring to the full list page. */
const PANEL_ROWS = 6;

interface StatProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  bgImage: string;
}

function Stat({ label, value, icon, bgImage }: StatProps) {
  return (
    <Card className="relative overflow-hidden border-none shadow-sm h-full min-h-[100px] flex items-center group">
      <img
        src={bgImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
      {/* Light glassmorphism overlay to ensure high readability of text */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[0.5px]"></div>
      
      <CardContent className="relative z-10 p-5 flex items-center gap-4 w-full">
        <div className="rounded-xl bg-white/35 text-slate-800 p-3 shadow-2xs backdrop-blur-[2px] border border-white/20 shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700/90 truncate">{label}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchoolDashboardPage() {
  const { user } = useAuth();
  const isCscAdmin = user?.role === 'csc_admin';
  const userSchoolId = user?.school ?? null;

  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);

  const schoolsListQuery = useQuery({
    queryKey: ['schools-dropdown'],
    queryFn: () => schoolsService.list({ page: 1 }),
    enabled: isCscAdmin,
  });

  const schoolId = isCscAdmin ? selectedSchoolId : userSchoolId;

  const schoolQuery = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => (schoolId ? schoolsService.get(schoolId) : Promise.reject('no school')),
    enabled: schoolId !== null,
  });

  const statsQuery = useQuery({
    queryKey: ['school', schoolId, 'stats'],
    queryFn: () => (schoolId ? schoolsService.stats(schoolId) : Promise.reject('no school')),
    enabled: schoolId !== null,
  });

  // The two overview panels. Both are school-scoped server-side, but a CSC Admin's
  // requests are unscoped by default, so pass the selected school explicitly.
  const teachersQuery = useQuery({
    queryKey: ['dashboard-teachers', schoolId],
    queryFn: () =>
      teachersService.list({
        school: schoolId ?? undefined,
        is_active: true,
        ordering: 'user__full_name',
      }),
    enabled: schoolId !== null,
  });

  const studentsQuery = useQuery({
    queryKey: ['dashboard-students', schoolId],
    queryFn: () =>
      studentsService.list({
        school: schoolId ?? undefined,
        is_active: true,
      }),
    enabled: schoolId !== null,
  });

  if (!isCscAdmin && !userSchoolId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Your account is not associated with a school. Contact CSC support.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* School Welcome Header Banner */}
      <div className="relative mb-6 group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-indigo-500/15 to-purple-600/20 rounded-[28px] blur-xl opacity-75 group-hover:opacity-95 transition-opacity duration-500" />
        <div className="w-full rounded-[24px] border border-blue-200/60 relative overflow-hidden shadow-xl shadow-blue-955/5 h-[160px] sm:h-[200px] md:h-[230px] lg:h-[250px] flex items-center bg-[#eff4fe] transition-all duration-300">
          <img
            src={headerImg}
            alt="School Dashboard Header"
            className="absolute inset-0 w-full h-full object-cover object-right select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
          />
          <div className="relative z-10 w-full sm:w-[60%] md:w-[55%] lg:w-[50%] max-w-xl pl-6 sm:pl-8 md:pl-10 lg:pl-12 py-4 flex flex-col justify-center min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-[#0f172a] tracking-tight leading-tight drop-shadow-sm flex items-center gap-2">
              {schoolQuery.data ? schoolQuery.data.name : 'School Dashboard'}
            </h1>
            {isCscAdmin ? (
              <div className="flex items-center gap-3 mt-2.5 select-none">
                <label className="text-xs sm:text-sm text-slate-700 font-bold shrink-0">Viewing school:</label>
                <select
                  value={selectedSchoolId ?? ''}
                  onChange={(e) => setSelectedSchoolId(e.target.value ? Number(e.target.value) : null)}
                  className="py-1 px-2.5 rounded-xl border border-slate-200 bg-white/90 text-slate-800 text-xs sm:text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 cursor-pointer shadow-xs transition-all duration-150 hover:bg-slate-50/50"
                >
                  <option value="">Select a school…</option>
                  {schoolsListQuery.data?.results.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-slate-600 text-xs sm:text-sm md:text-base lg:text-lg mt-1.5 sm:mt-2 font-medium leading-relaxed">
                Welcome back, <span className="text-blue-600 font-extrabold">{user?.full_name}</span>. Here's where your school stands.
              </p>
            )}
            
            {schoolQuery.data?.code && (
              <div className="mt-2 sm:mt-3 self-start px-3 py-1 rounded-xl bg-blue-600/10 border border-blue-200 text-[10px] sm:text-xs font-bold text-blue-700 tracking-wider uppercase select-none">
                School Code: {schoolQuery.data.code}
              </div>
            )}
          </div>
        </div>
      </div>

      {!schoolId ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Select a school above to view its dashboard.
          </CardContent>
        </Card>
      ) : statsQuery.isLoading ? (
        <Spinner label="Loading stats…" />
      ) : statsQuery.isError || !statsQuery.data ? (
        <p className="text-sm text-destructive">Failed to load stats.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* <Stat label="School admins" value={statsQuery.data.school_admins} icon={<UserCog className="h-5 w-5" />} bgImage={card1Img} /> */}
          <Stat label="Teachers" value={statsQuery.data.teachers} icon={<Users className="h-5 w-5" />} bgImage={card2Img} />
          <Stat label="Students" value={statsQuery.data.students} icon={<GraduationCap className="h-5 w-5" />} bgImage={card3Img} />
          <Stat label="Classes" value={statsQuery.data.classes} icon={<GraduationCap className="h-5 w-5" />} bgImage={card4Img} />
          <Stat label="Subjects" value={statsQuery.data.subjects} icon={<BookOpen className="h-5 w-5" />} bgImage={card5Img} />
          <Stat label="Tests" value={statsQuery.data.tests} icon={<ListChecks className="h-5 w-5" />} bgImage={card6Img} />
        </div>
      )}

      {schoolId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <Panel
            title="Teachers"
            description="Active teachers in this school."
            icon={<Users className="h-5 w-5" />}
            viewAllTo="/school/teachers"
            isLoading={teachersQuery.isLoading}
            isError={teachersQuery.isError}
            total={teachersQuery.data?.count ?? 0}
            emptyText="No teachers yet."
            rows={(teachersQuery.data?.results ?? []).slice(0, PANEL_ROWS).map((teacher) => ({
              id: teacher.id,
              to: `/school/teachers/${teacher.id}`,
              primary: teacher.user_name,
              secondary: teacher.teacher_id || teacher.user_email,
              badge:
                teacher.assignments_count === 1
                  ? '1 class'
                  : `${teacher.assignments_count} classes`,
            }))}
          />

          <Panel
            title="Students"
            description="Active students in this school."
            icon={<GraduationCap className="h-5 w-5" />}
            viewAllTo="/school/students"
            isLoading={studentsQuery.isLoading}
            isError={studentsQuery.isError}
            total={studentsQuery.data?.count ?? 0}
            emptyText="No students yet."
            rows={(studentsQuery.data?.results ?? []).slice(0, PANEL_ROWS).map((student) => ({
              id: student.id,
              to: `/school/students/${student.id}`,
              primary: student.user_name,
              // Students sign in with their ID, and may have no email at all.
              secondary: student.student_id || student.user_email || '—',
              badge: student.display_class_section,
            }))}
          />
        </div>
      )}
    </div>
  );
}

interface PanelRow {
  id: number;
  to: string;
  primary: string;
  secondary: string;
  badge: string;
}

interface PanelProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  viewAllTo: string;
  isLoading: boolean;
  isError: boolean;
  total: number;
  emptyText: string;
  rows: PanelRow[];
}

/**
 * One side of the Teachers | Students overview.
 *
 * Deliberately three fields per row — who they are, how to identify them, and where they
 * sit. Anything more belongs on the full list page, which the footer links to.
 */
function Panel({
  title,
  description,
  icon,
  viewAllTo,
  isLoading,
  isError,
  total,
  emptyText,
  rows,
}: PanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {icon}
              {title}
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={viewAllTo}>View all</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Spinner label={`Loading ${title.toLowerCase()}…`} />
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load {title.toLowerCase()}.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="py-2.5 first:pt-0 last:pb-0">
                <Link
                  to={row.to}
                  className="flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:underline">
                      {row.primary}
                    </p>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                      {row.secondary}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{row.badge}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {total > rows.length && (
          <p className="text-xs text-muted-foreground mt-3">
            Showing {rows.length} of {total}.{' '}
            <Link to={viewAllTo} className="text-primary hover:underline">
              See all {total}
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
