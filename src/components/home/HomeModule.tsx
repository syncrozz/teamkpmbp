import React from 'react';
import { PortalData } from '../../types';
import { InlineEditTrigger } from '../common/InlineEditTrigger';
import {
  Calendar,
  FileText,
  MapPin,
  Bell,
  ArrowRight,
  Shield,
  Phone,
  AlertTriangle,
  ChevronRight,
  Clock,
} from 'lucide-react';

interface HomeModuleProps {
  data: PortalData;
  isAdmin: boolean;
  inlineEditMode: boolean;
  onNavigateTab: (tabId: string) => void;
  onEditSettings?: () => void;
}

export const HomeModule: React.FC<HomeModuleProps> = ({
  data,
  isAdmin,
  inlineEditMode,
  onNavigateTab,
  onEditSettings,
}) => {
  const { settings, announcements, schedules, documents, locations } = data;

  // Urgent announcement banner
  const urgentAnnouncements = announcements.filter((a) => a.priority === 'urgent');
  const latestUrgent = urgentAnnouncements[0];

  // Recent pinned docs
  const pinnedDocs = documents.filter((d) => d.isPinned).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Urgent Announcement Alert Strip (if any) */}
      {latestUrgent && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                  Urgent Notice
                </span>
                <span className="text-xs font-semibold text-slate-900">{latestUrgent.title}</span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{latestUrgent.content}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('announcements')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 self-end sm:self-auto cursor-pointer"
          >
            <span>Read Notice</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-md">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-2">
            <Shield className="w-4 h-4" />
            <span>{settings.contingentName}</span>
            {isAdmin && inlineEditMode && onEditSettings && (
              <InlineEditTrigger
                onClick={onEditSettings}
                label="Edit Portal Header"
                size="sm"
                className="ml-2 !bg-white/10 !text-white !border-white/20"
              />
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 leading-tight">
            {settings.eventTitle}
          </h1>

          <p className="text-sm text-slate-300 italic">
            &ldquo;{settings.motto}&rdquo;
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('schedule')}
          className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-indigo-300 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
            <span>Competition Schedules</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </h3>
          <p className="text-xs text-slate-500">
            High-res schedule charts, zoomable fixtures & Google Drive images.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('documents')}
          className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-indigo-300 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
            <span>Documents & Rules</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </h3>
          <p className="text-xs text-slate-500">
            Handbooks, scoresheets, official circulars & technical rules.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('locations')}
          className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-indigo-300 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
            <span>Venues & Movement</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </h3>
          <p className="text-xs text-slate-500">
            Competition halls, bus transport timings, and Google Maps.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('announcements')}
          className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-indigo-300 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
            <span>Official Notices</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </h3>
          <p className="text-xs text-slate-500">
            Secretariat announcements, call times, and urgent briefings.
          </p>
        </button>
      </div>

      {/* Two Column Section: Schedules Highlights & Pinned References */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedules Preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Competition Fixtures</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('schedule')}
              className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              View All Fixtures
            </button>
          </div>

          {schedules.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              No schedules posted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {schedules.slice(0, 3).map((sch) => (
                <div
                  key={sch.id}
                  onClick={() => onNavigateTab('schedule')}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-100 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{sch.categoryName}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      {sch.date && <span>{sch.date}</span>}
                      {sch.venue && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{sch.venue}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Essential References */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Essential Documents</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('documents')}
              className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              All Documents
            </button>
          </div>

          {documents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              No documents linked yet.
            </p>
          ) : (
            <div className="space-y-3">
              {(pinnedDocs.length > 0 ? pinnedDocs : documents.slice(0, 3)).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onNavigateTab('documents')}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-100 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{doc.title}</h4>
                    <span className="text-[11px] text-slate-500">{doc.category}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secretariat Contact & Support Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Contingent Secretariat Hotline: {settings.emergencyContactName}
            </h4>
            <p className="text-xs text-slate-500">
              Stationed at: {settings.secretariatLocation || 'Bilik Gerakan Kontinjen'}
            </p>
          </div>
        </div>

        {settings.emergencyContactPhone && (
          <a
            href={`tel:${settings.emergencyContactPhone.replace(/\s+/g, '')}`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Secretariat ({settings.emergencyContactPhone})</span>
          </a>
        )}
      </div>
    </div>
  );
};
