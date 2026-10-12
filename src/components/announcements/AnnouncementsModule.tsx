import React, { useState } from 'react';
import { Announcement } from '../../types';
import { InlineEditTrigger } from '../common/InlineEditTrigger';
import { AnnouncementEditModal } from './AnnouncementEditModal';
import {
  Bell,
  Search,
  Pin,
  ExternalLink,
  Plus,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';

interface AnnouncementsModuleProps {
  announcements: Announcement[];
  isAdmin: boolean;
  inlineEditMode: boolean;
  onSaveAnnouncement: (ann: Partial<Announcement>) => Promise<void>;
  onDeleteAnnouncement?: (id: string) => Promise<void>;
}

export const AnnouncementsModule: React.FC<AnnouncementsModuleProps> = ({
  announcements,
  isAdmin,
  inlineEditMode,
  onSaveAnnouncement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);

  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || ann.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Sort pinned first, then by date
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const handleOpenAdd = () => {
    setAnnouncementToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (ann: Announcement) => {
    setAnnouncementToEdit(ann);
    setIsEditModalOpen(true);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Official Announcements</h2>
          <p className="text-xs text-slate-500 mt-1">
            Urgent updates, scheduling circulars, and contingent notices.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search notices and circulars..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'all', label: 'All Notices' },
            { id: 'urgent', label: 'Urgent' },
            { id: 'important', label: 'Important' },
            { id: 'general', label: 'General' },
          ].map((item) => {
            const isActive = priorityFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPriorityFilter(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {sortedAnnouncements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No Announcements Posted</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {searchQuery || priorityFilter !== 'all'
              ? 'No announcements match your search criteria.'
              : 'Official contingent updates, broadcast notices, and event alerts will appear here.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post First Announcement</span>
            </button>
          )}
        </div>
      ) : (
        /* Announcements list */
        <div className="space-y-4">
          {sortedAnnouncements.map((ann) => {
            const isUrgent = ann.priority === 'urgent';
            const isImportant = ann.priority === 'important';

            return (
              <article
                key={ann.id}
                className={`bg-white border rounded-xl p-5 shadow-xs transition-all ${
                  isUrgent
                    ? 'border-rose-200 bg-rose-50/20'
                    : isImportant
                    ? 'border-amber-200 bg-amber-50/15'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {ann.isPinned && (
                        <span title="Pinned announcement" className="text-amber-600">
                          <Pin className="w-4 h-4 fill-amber-500" />
                        </span>
                      )}
                      {isUrgent && (
                        <span title="Urgent notice" className="text-rose-600">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      )}
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {ann.title}
                      </h3>
                    </div>

                    {/* Clean unboxed metadata discipline */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className={`font-semibold uppercase tracking-wider ${
                        isUrgent ? 'text-rose-600' : isImportant ? 'text-amber-600' : 'text-slate-600'
                      }`}>
                        {ann.priority}
                      </span>
                      <span aria-hidden="true">·</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatTimestamp(ann.timestamp)}</span>
                      </div>
                      <span aria-hidden="true">·</span>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{ann.author}</span>
                      </div>
                      {ann.category && ann.category !== 'All' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>For: {ann.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {isAdmin && inlineEditMode && (
                    <InlineEditTrigger
                      onClick={() => handleOpenEdit(ann)}
                      size="sm"
                    />
                  )}
                </div>

                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line mt-3">
                  {ann.content}
                </div>

                {ann.externalUrl && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center">
                    <a
                      href={ann.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>{ann.externalUrlLabel || 'Open Linked Document'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <AnnouncementEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={onSaveAnnouncement}
        announcementToEdit={announcementToEdit}
      />
    </div>
  );
};
