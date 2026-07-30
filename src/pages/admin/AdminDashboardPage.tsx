import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  UserCog,
  Users,
  Plus,
  School as SchoolIcon,
  ChevronRight,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { schoolsService } from '@/services/schools.service';
import { useAuth } from '@/hooks/useAuth';
import type { SchoolListItem } from '@/types';
import cscAdminHeaderImg from '@/assets/dashboard_designs/Super admin/HEADER ADMIN.jpg.jpeg';
import card1Img from '@/assets/dashboard_designs/Super admin/card1.jpeg';
import card2Img from '@/assets/dashboard_designs/Super admin/card 2.jpeg';
import card3Img from '@/assets/dashboard_designs/Super admin/card3.jpeg';
import defaultSchoolLogo from '@/assets/csc_school_logo.png';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => schoolsService.platformStats(),
  });

  const schoolsQuery = useQuery({
    queryKey: ['schools-overview', { page_size: 100 }],
    queryFn: () => schoolsService.list({ page_size: 100 }),
  });

  return (
    <div className="space-y-8">
      {/* Super Admin Welcome Header Banner */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-blue-500/15 to-purple-600/20 rounded-[28px] blur-xl opacity-75 group-hover:opacity-95 transition-opacity duration-500" />
        <div className="w-full h-[250px] rounded-[24px] border border-amber-200/60 relative overflow-hidden shadow-xl shadow-amber-950/5 flex items-center bg-[#fffcf7] transition-all duration-300">
          <img
            src={cscAdminHeaderImg}
            alt="CSC Super Admin Header"
            className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
          />
          <div className="relative z-10 w-full sm:w-[48%] md:w-[42%] lg:w-[38%] max-w-md pl-6 sm:pl-8 md:pl-10 lg:pl-12 pr-2 py-6 flex flex-col justify-center min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-[#0f172a] tracking-tight leading-tight drop-shadow-sm">
              Welcome, {user?.full_name ?? 'Super Admin'}! 👋
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm md:text-base lg:text-lg mt-1.5 sm:mt-2 font-medium leading-relaxed">
              Platform-wide overview of CSC Exam Portal.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Stats Grid */}
      {statsLoading ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex items-center justify-center">
          <Spinner label="Loading platform statistics..." />
        </div>
      ) : statsError || !stats ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
          <p className="text-sm font-semibold text-red-500">Failed to load platform statistics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Stat 1: Registered Schools Card with card1.png background */}
          <div className="relative rounded-2xl p-6 border border-blue-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group min-h-[145px] bg-[#f0f7ff]">
            <img
              src={card1Img}
              alt="Registered Schools Card Background"
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
            />
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider drop-shadow-xs">Registered Schools</span>
              <div className="p-3 rounded-2xl bg-white/90 backdrop-blur-md text-blue-600 border border-blue-100 shadow-xs">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div className="relative z-10 mt-4">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight drop-shadow-xs">{stats.total_schools}</h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
                <p className="text-xs font-bold text-slate-700">{stats.active_schools} Active Institutions</p>
              </div>
            </div>
          </div>

          {/* Stat 2: Total Users Card with card 2.png background */}
          <div className="relative rounded-2xl p-6 border border-purple-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group min-h-[145px] bg-[#f8f5ff]">
            <img
              src={card2Img}
              alt="Total Users Card Background"
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
            />
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider drop-shadow-xs">Total System Users</span>
              <div className="p-3 rounded-2xl bg-white/90 backdrop-blur-md text-purple-600 border border-purple-100 shadow-xs">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="relative z-10 mt-4">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight drop-shadow-xs">{stats.total_users}</h2>
              <p className="text-xs font-bold text-slate-700 mt-1.5">Admins, Teachers & Staff</p>
            </div>
          </div>

          {/* Stat 3: School Managers Card with card3.png background */}
          <div className="relative rounded-2xl p-6 border border-emerald-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group min-h-[145px] bg-[#f0fdf4]">
            <img
              src={card3Img}
              alt="School Managers Card Background"
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
            />
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider drop-shadow-xs">School Managers</span>
              <div className="p-3 rounded-2xl bg-white/90 backdrop-blur-md text-emerald-600 border border-emerald-100 shadow-xs">
                <UserCog className="h-5 w-5" />
              </div>
            </div>
            <div className="relative z-10 mt-4">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight drop-shadow-xs">{stats.total_school_admins}</h2>
              <p className="text-xs font-bold text-slate-700 mt-1.5">Assigned School Admins</p>
            </div>
          </div>
        </div>
      )}

      {/* Registered Schools Overview Table Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <SchoolIcon className="h-5 w-5 text-blue-600" />
              Registered Schools Overview
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Active institutions and member metrics across the portal.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/admin/schools/new')}
              className="bg-[#1d4ed8] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add New School
            </button>
            <Link
              to="/admin/schools"
              className="text-xs font-bold text-slate-600 hover:text-blue-600 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center gap-1"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {schoolsQuery.isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Spinner label="Loading registered schools..." />
          </div>
        ) : schoolsQuery.isError || !schoolsQuery.data ? (
          <div className="py-8 text-center text-red-500 text-xs font-semibold">
            Failed to load schools data.
          </div>
        ) : schoolsQuery.data.results.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No registered schools found yet.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">School Name</th>
                  <th className="pb-3 px-3">School Code</th>
                  <th className="pb-3 px-3 text-center">Teachers</th>
                  <th className="pb-3 px-3 text-center">Students</th>
                  <th className="pb-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {schoolsQuery.data.results.map((school: SchoolListItem) => (
                  <tr key={school.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={school.logo_url || defaultSchoolLogo}
                          alt={school.name}
                          className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-slate-200 shadow-xs"
                        />
                        <Link
                          to={`/admin/schools/${school.id}`}
                          className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors"
                        >
                          {school.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-500">{school.code}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-800">{school.teachers_count}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-800">{school.students_count}</td>
                    <td className="py-3.5 px-3 text-right">
                      <Badge
                        variant={
                          school.status === 'active'
                            ? 'success'
                            : school.status === 'suspended'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="capitalize font-semibold text-[11px]"
                      >
                        {school.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
