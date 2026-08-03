import { useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, GraduationCap, Users, BarChart3 } from 'lucide-react';
import reportsHeaderImg from '@/assets/dashboard_designs/Reports/reports.webp';

const reportCards = [
  {
    title: 'Class Report',
    description: 'View performance aggregated by class -- pass/fail counts, average percentages.',
    path: '/reports/class',
    icon: GraduationCap,
    iconBg: 'bg-[#eef2ff]',
    iconColor: 'text-indigo-600',
  },
  {
    title: 'Subject Report',
    description: 'Analyze performance by subject -- averages, question counts, test counts.',
    path: '/reports/subject',
    icon: BookOpen,
    iconBg: 'bg-[#ecfdf5]',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Test Reports',
    description: 'Select a test to view detailed analysis -- marks distribution, pass rates.',
    path: '/tests',
    icon: ClipboardList,
    iconBg: 'bg-[#fffbeb]',
    iconColor: 'text-amber-600',
  },
  {
    title: 'Student Reports',
    description: 'Select a student to view their performance history and results.',
    path: '/school/students',
    icon: Users,
    iconBg: 'bg-[#f0f9ff]',
    iconColor: 'text-sky-600',
  },
] as const;

export default function ReportsDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Top Header Card with reports.webp background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f0fdf4]">
        <img
          src={reportsHeaderImg}
          alt="Reports Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <BarChart3 className="h-7 w-7 text-emerald-600 animate-pulse" />
              Reports
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              Select a report type to view performance breakdowns.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {reportCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.path}
              className="cursor-pointer bg-white rounded-2xl border border-slate-200/60 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 group"
              onClick={() => navigate(card.path)}
            >
              <div className="flex items-center gap-3.5 mb-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor} group-hover:scale-105 transition-transform duration-300`}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{card.title}</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{card.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
