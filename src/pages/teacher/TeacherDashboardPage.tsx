import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';
import { teachersService } from '@/services/teachers.service';
import { schoolsService } from '@/services/schools.service';
import { cn } from '@/lib/utils';
import teacherHeaderImg from '@/assets/dashboard_designs/Teacher/Teacher_dashboard_header.webp';
import card1Img from '@/assets/dashboard_designs/Teacher/teacher_card1.jpeg';
import card2Img from '@/assets/dashboard_designs/Teacher/teacher_card2.jpeg';
import card3Img from '@/assets/dashboard_designs/Teacher/teacher_card3.jpeg';

interface StatProps {
  label: string;
  value: number | string;
  subtext: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  bgImage?: string;
}

function Stat({ label, value, subtext, icon, iconBg, iconColor, bgImage }: StatProps) {
  return (
    <Card
      className={cn(
        "rounded-3xl border border-[#e2e8f0]/50 shadow-sm transition-all duration-300 hover:shadow-md relative overflow-hidden",
        bgImage ? "bg-transparent" : "bg-white/70"
      )}
      style={bgImage ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : undefined}
    >
      <CardContent className="p-6 flex items-center gap-5 relative z-10">
        <div className={cn("p-4 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border border-white/40", iconBg, iconColor)}>
          {icon}
        </div>
        <div>
          <p className={cn("text-[11px] font-black uppercase tracking-wider", bgImage ? "text-white/90" : "text-slate-500")}>{label}</p>
          <p className={cn("text-3xl font-extrabold mt-0.5 leading-tight", bgImage ? "text-white" : "text-slate-900")}>{value}</p>
          <p className={cn("text-xs font-bold mt-0.5", bgImage ? "text-white/80" : "text-slate-400")}>{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const schoolId = user?.school ?? null;

  const statsQuery = useQuery({
    queryKey: ['school', schoolId, 'stats'],
    queryFn: () => (schoolId ? schoolsService.stats(schoolId) : Promise.reject('no school')),
    enabled: schoolId !== null,
  });

  // Counted server-side from this teacher's own assignments.
  const myStatsQuery = useQuery({
    queryKey: ['my-teacher-stats'],
    queryFn: () => teachersService.myStats(),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () => teachersService.listAssignments(),
  });

  return (
    <div className="space-y-6">
      {/* Teacher Welcome Header Banner */}
      <div className="relative mb-6 group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/20 via-teal-500/15 to-blue-600/20 rounded-[28px] blur-xl opacity-75 group-hover:opacity-95 transition-opacity duration-500" />
        <div className="w-full rounded-[24px] border border-teal-200/60 relative overflow-hidden shadow-xl shadow-teal-950/5 h-[160px] sm:h-[200px] md:h-[230px] lg:h-[250px] flex items-center bg-[#eff4fe] transition-all duration-300">
          <img
            src={teacherHeaderImg}
            alt="Teacher Dashboard Header"
            className="absolute inset-0 w-full h-full object-cover object-right select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
          />
          <div className="relative z-10 w-full sm:w-[50%] md:w-[45%] lg:w-[40%] max-w-md pl-6 sm:pl-8 md:pl-10 lg:pl-12 py-4 flex flex-col justify-center min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-[#0f172a] tracking-tight leading-tight drop-shadow-sm flex items-center gap-2">
              Welcome, {user?.full_name ?? 'Teacher'}! 👋
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm md:text-base lg:text-lg mt-1.5 sm:mt-2 font-medium leading-relaxed">
              Here's your teaching overview.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Stats Grid */}
      {statsQuery.isLoading ? (
        <Spinner label="Loading stats…" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Stat
            label="MY CLASSES"
            value={myStatsQuery.data?.assigned_classes ?? '0'}
            subtext="Active Classes"
            icon={<Users className="h-5 w-5" />}
            iconBg="bg-[#eef2ff]"
            iconColor="text-indigo-600"
            bgImage={card1Img}
          />
          <Stat
            label="MY SUBJECTS"
            value={myStatsQuery.data?.assigned_subjects ?? '0'}
            subtext="Assigned Subjects"
            icon={<BookOpen className="h-5 w-5" />}
            iconBg="bg-[#ecfdf5]"
            iconColor="text-emerald-600"
            bgImage={card2Img}
          />
          <Stat
            label="TESTS"
            value={statsQuery.data?.tests ?? '0'}
            subtext="Tests Created"
            icon={<ClipboardList className="h-5 w-5" />}
            iconBg="bg-[#fffbeb]"
            iconColor="text-amber-600"
            bgImage={card3Img}
          />
        </div>
      )}

      {/* Assignments Card */}
      <Card className="rounded-[24px] border border-slate-100 shadow-sm p-6 bg-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shadow-2xs">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-extrabold text-[#1e1b4b]">My Assignments</h2>
        </div>

        <div>
          {assignmentsQuery.isLoading ? (
            <Spinner label="Loading assignments…" />
          ) : !assignmentsQuery.data || assignmentsQuery.data.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet. Contact your school admin.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-20">S NO</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">SUBJECT</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">CLASS</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">SECTION</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">ACADEMIC YEAR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentsQuery.data.results.map((a, index) => (
                    <TableRow key={a.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <TableCell className="text-sm font-semibold text-slate-600 text-center">{index + 1}</TableCell>
                      <TableCell className="text-sm font-bold text-indigo-600 text-center">{a.subject_name || '—'}</TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700 text-center">{a.class_name}</TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700 text-center">{a.section_name || 'All'}</TableCell>
                      <TableCell className="text-sm font-semibold text-slate-600 text-center">{a.academic_year || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Great Work Footer Illustration */}
        <div className="flex flex-col items-center justify-center py-6 mt-8 border-t border-slate-100">
          <div className="relative mb-3.5 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 shadow-sm">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white rounded-full p-1 border-2 border-white shadow-sm flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h3 className="text-base font-extrabold text-[#1e1b4b]">Keep up the great work!</h3>
          <p className="text-slate-400 text-xs font-bold mt-1">You're doing awesome.</p>
        </div>
      </Card>
    </div>
  );
}
