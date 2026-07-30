import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, GraduationCap, Layers, ListOrdered } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { schoolsService } from '@/services/schools.service';
import academicsCardImg from '@/assets/dashboard_designs/Academics/Academics_card.png';
import academicsCard1 from '@/assets/dashboard_designs/Academics/academic-card1.jpeg';
import academicsCard2 from '@/assets/dashboard_designs/Academics/academic-card2.jpeg';
import academicsCard3 from '@/assets/dashboard_designs/Academics/academic-card3.jpeg';
import academicsCard4 from '@/assets/dashboard_designs/Academics/academic-card4.jpeg';

interface TileProps {
  to: string;
  title: string;
  description: string;
  count?: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  bgImage?: string;
}

function Tile({ to, title, description, count, icon, iconBg, iconColor, bgImage }: TileProps) {
  return (
    <Link to={to} className="block group">
      <div
        className="relative rounded-2xl border border-slate-200/60 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[120px]"
        style={bgImage ? {
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : { backgroundColor: 'white' }}
      >
        <div className="relative z-10 flex items-start gap-4">
          <div className={`rounded-xl p-3 shrink-0 ${iconBg} ${iconColor} group-hover:scale-105 transition-transform duration-300`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-extrabold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">{title}</h3>
              {typeof count === 'number' && (
                <span className="text-2xl font-black text-indigo-700 tabular-nums">{count}</span>
              )}
            </div>
            <p className="text-xs font-semibold mt-1.5 leading-relaxed text-slate-600">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function AcademicsOverviewPage() {
  const { user } = useAuth();
  const schoolId = user?.school ?? null;
  // Teachers have read-only access to academics (and no access to the
  // school stats endpoint — skip that call for them).
  const canManage = user?.role === 'csc_admin' || user?.role === 'school_admin';
  const { data, isLoading } = useQuery({
    queryKey: ['school', schoolId, 'stats'],
    queryFn: () => (schoolId ? schoolsService.stats(schoolId) : Promise.reject('no school')),
    enabled: schoolId !== null && canManage,
  });

  return (
    <div className="space-y-6">
      {/* Top Header Banner with Academics Card Image */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] sm:min-h-[180px] md:min-h-[200px] flex items-center bg-[#f0f4ff]">
        <img
          src={academicsCardImg}
          alt="Academics Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        <div className="relative z-10 w-full sm:w-[55%] md:w-[50%] lg:w-[45%] max-w-lg pl-6 sm:pl-8 md:pl-10 pr-2 py-6 flex flex-col justify-center min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
            <BookOpen className="h-7 w-7 text-indigo-600" />
            Academic Setup
            {!canManage && (
              <Badge variant="secondary" className="bg-white/80 text-slate-600 font-semibold border-slate-200/40 text-[11px] px-2 py-0.5 backdrop-blur-sm">
                Read Only Access
              </Badge>
            )}
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm md:text-base mt-1.5 sm:mt-2 font-medium leading-relaxed">
            {canManage
              ? 'Manage classes, sections, subjects, and chapters for your school.'
              : 'Browse the classes, sections, subjects, and chapters of your school.'}
          </p>
        </div>
      </div>

      {isLoading && canManage ? (
        <Spinner label="Loading stats…" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Tile
            to="/school/academics/classes"
            title="Classes"
            description="Grades / levels offered."
            count={data?.classes}
            icon={<GraduationCap className="h-6 w-6" />}
            iconBg="bg-[#eef2ff]"
            iconColor="text-indigo-600"
            bgImage={academicsCard1}
          />
          <Tile
            to="/school/academics/sections"
            title="Sections"
            description="Sub-divisions within each class."
            icon={<Layers className="h-6 w-6" />}
            iconBg="bg-[#ecfdf5]"
            iconColor="text-emerald-600"
            bgImage={academicsCard2}
          />
          <Tile
            to="/school/academics/subjects"
            title="Subjects"
            description="Subjects taught per class."
            count={data?.subjects}
            icon={<BookOpen className="h-6 w-6" />}
            iconBg="bg-[#fffbeb]"
            iconColor="text-amber-600"
            bgImage={academicsCard3}
          />
          <Tile
            to="/school/academics/chapters"
            title="Chapters"
            description="Topics within each subject."
            icon={<ListOrdered className="h-6 w-6" />}
            iconBg="bg-[#f0f9ff]"
            iconColor="text-sky-600"
            bgImage={academicsCard4}
          />
        </div>
      )}
    </div>
  );
}
