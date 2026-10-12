import React, { useState } from 'react';
import {
  PortalData,
  NavigationTab,
  PortalSettings,
  ScheduleItem,
  DocumentItem,
  EventSection,
  LocationItem,
  Announcement,
} from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ScheduleEditModal } from '../schedule/ScheduleEditModal';
import { DocumentEditModal } from '../documents/DocumentEditModal';
import { EventSectionEditModal } from '../events/EventSectionEditModal';
import { LocationEditModal } from '../locations/LocationEditModal';
import { AnnouncementEditModal } from '../announcements/AnnouncementEditModal';
import { api } from '../../services/api';
import {
  ArrowLeft,
  Settings,
  Layers,
  Calendar,
  FileText,
  BookOpen,
  MapPin,
  Bell,
  KeyRound,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface AdminDashboardProps {
  data: PortalData;
  onUpdateTabs: (tabs: NavigationTab[]) => Promise<void>;
  onUpdateSettings: (settings: PortalSettings) => Promise<void>;
  onSaveSchedule: (schedule: Partial<ScheduleItem>) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onSaveDocument: (doc: Partial<DocumentItem>) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onSaveEventSection: (sec: Partial<EventSection>) => Promise<void>;
  onDeleteEventSection: (id: string) => Promise<void>;
  onSaveLocation: (loc: Partial<LocationItem>) => Promise<void>;
  onDeleteLocation: (id: string) => Promise<void>;
  onSaveAnnouncement: (ann: Partial<Announcement>) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onCloseAdminView: () => void;
}

type AdminSection =
  | 'tabs'
  | 'settings'
  | 'schedules'
  | 'documents'
  | 'events'
  | 'locations'
  | 'announcements'
  | 'security';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  data,
  onUpdateTabs,
  onUpdateSettings,
  onSaveSchedule,
  onDeleteSchedule,
  onSaveDocument,
  onDeleteDocument,
  onSaveEventSection,
  onDeleteEventSection,
  onSaveLocation,
  onDeleteLocation,
  onSaveAnnouncement,
  onDeleteAnnouncement,
  onCloseAdminView,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('tabs');

  // Tabs management state
  const [tabsList, setTabsList] = useState<NavigationTab[]>(data.tabs);
  const [newTabLabel, setNewTabLabel] = useState('');
  const [isSavingTabs, setIsSavingTabs] = useState(false);
  const [tabsSuccess, setTabsSuccess] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<PortalSettings>(data.settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Security credentials state
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newTeamPasscode, setNewTeamPasscode] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // Sub-modal edit states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(null);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventSection, setEditingEventSection] = useState<EventSection | null>(null);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);

  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  // Reorder tabs
  const handleMoveTab = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tabsList.length) return;

    const updated = [...tabsList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Reassign order
    const ordered = updated.map((tab, idx) => ({ ...tab, order: idx + 1 }));
    setTabsList(ordered);
  };

  const handleToggleTabVisibility = (tabId: string) => {
    setTabsList(
      tabsList.map((t) => (t.id === tabId ? { ...t, visible: !t.visible } : t))
    );
  };

  const handleAddCustomTab = () => {
    if (!newTabLabel.trim()) return;
    const newId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTab: NavigationTab = {
      id: newId,
      label: newTabLabel.trim(),
      order: tabsList.length + 1,
      visible: true,
      isSystem: false,
    };
    setTabsList([...tabsList, newTab]);
    setNewTabLabel('');
  };

  const handleDeleteTab = (tabId: string, label: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: `Delete Tab: ${label}?`,
      message:
        'This will permanently remove this navigation tab from the portal. This action cannot be undone.',
      action: async () => {
        const updated = tabsList.filter((t) => t.id !== tabId);
        setTabsList(updated);
        await onUpdateTabs(updated);
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleSaveTabs = async () => {
    setIsSavingTabs(true);
    setTabsSuccess(false);
    try {
      await onUpdateTabs(tabsList);
      setTabsSuccess(true);
      setTimeout(() => setTabsSuccess(false), 3000);
    } finally {
      setIsSavingTabs(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await onUpdateSettings(settingsForm);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSecurity(true);
    setSecuritySuccess(null);
    setSecurityError(null);
    try {
      await api.updateCredentials({
        currentPassword: currentAdminPassword || undefined,
        newPassword: newAdminPassword || undefined,
        teamPasscode: newTeamPasscode || undefined,
      });
      setSecuritySuccess('Security credentials updated successfully.');
      setCurrentAdminPassword('');
      setNewAdminPassword('');
      setNewTeamPasscode('');
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to update credentials.');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation Back to Portal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            type="button"
            onClick={onCloseAdminView}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Competition Portal View</span>
          </button>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Central Admin Hub</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage navigation tabs, schedules, documents, event information, and portal access.
          </p>
        </div>
      </div>

      {/* Main Admin Navigation Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {[
          { id: 'tabs', label: 'Navigation Tabs', icon: Layers },
          { id: 'settings', label: 'Portal Details', icon: Settings },
          { id: 'schedules', label: 'Schedules', icon: Calendar },
          { id: 'documents', label: 'Documents & Files', icon: FileText },
          { id: 'events', label: 'Event Info & Rundown', icon: BookOpen },
          { id: 'locations', label: 'Locations & Movement', icon: MapPin },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'security', label: 'Security & Access', icon: KeyRound },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id as AdminSection)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= SECTION: TABS ================= */}
      {activeSection === 'tabs' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manage Portal Navigation Tabs</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Reorder, hide, show, or add custom pages to the portal navigation bar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveTabs}
              disabled={isSavingTabs}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingTabs ? 'Saving Changes...' : 'Save Tabs Order'}</span>
            </button>
          </div>

          {tabsSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Navigation tab configuration saved successfully!</span>
            </div>
          )}

          {/* Tabs list */}
          <div className="space-y-2">
            {tabsList.map((tab, idx) => (
              <div
                key={tab.id}
                className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 font-bold w-4">#{idx + 1}</span>
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{tab.label}</span>
                    {tab.isSystem && (
                      <span className="ml-2 text-[10px] text-indigo-600 font-semibold uppercase">
                        (Core Module)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Reorder Buttons */}
                  <button
                    type="button"
                    onClick={() => handleMoveTab(idx, 'up')}
                    disabled={idx === 0}
                    title="Move Up"
                    className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveTab(idx, 'down')}
                    disabled={idx === tabsList.length - 1}
                    title="Move Down"
                    className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Visibility Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleTabVisibility(tab.id)}
                    title={tab.visible ? 'Hide from regular team members' : 'Publish and show'}
                    className={`p-1.5 rounded-md border text-xs flex items-center gap-1 cursor-pointer ${
                      tab.visible
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {tab.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{tab.visible ? 'Visible' : 'Hidden'}</span>
                  </button>

                  {/* Delete Button (Only allowed for custom tabs) */}
                  {!tab.isSystem && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTab(tab.id, tab.label)}
                      title="Delete Tab"
                      className="p-1.5 bg-white border border-rose-200 rounded-md text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Tab Form */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 mb-2">Create Custom Navigation Tab</h4>
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                placeholder="e.g. Media & Galeri, SOP Keselamatan"
                value={newTabLabel}
                onChange={(e) => setNewTabLabel(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddCustomTab}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tab</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION: SETTINGS ================= */}
      {activeSection === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Portal Branding & Organization Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure event titles, motto, and emergency secretariat contacts.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Portal settings updated successfully!</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event / Portal Title
              </label>
              <input
                type="text"
                required
                value={settingsForm.eventTitle}
                onChange={(e) => setSettingsForm({ ...settingsForm, eventTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contingent Name
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.contingentName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, contingentName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Subtitle
                </label>
                <input
                  type="text"
                  value={settingsForm.eventSubtitle}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, eventSubtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contingent Motto / Slogan
              </label>
              <input
                type="text"
                value={settingsForm.motto}
                onChange={(e) => setSettingsForm({ ...settingsForm, motto: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secretariat Operations Base / Room
                </label>
                <input
                  type="text"
                  value={settingsForm.secretariatLocation}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, secretariatLocation: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Secretariat Phone
                </label>
                <input
                  type="text"
                  value={settingsForm.emergencyContactPhone}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, emergencyContactPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= SECTION: SCHEDULES ================= */}
      {activeSection === 'schedules' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Competition Schedules ({data.schedules.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage category fixtures, timetable images, and Google Drive links.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSchedule(null);
                setScheduleModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Schedule Category</span>
            </button>
          </div>

          {data.schedules.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              No schedules created. Add your first category schedule above.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.schedules.map((sch) => (
                <div key={sch.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {sch.categoryName} {sch.subcategory && `(${sch.subcategory})`}
                    </h4>
                    <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                      <span>{sch.date || 'No date set'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{sch.venue || 'No venue set'}</span>
                      {sch.imageUrl && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-indigo-600 font-medium">Image Linked</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSchedule(sch);
                        setScheduleModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm({
                          isOpen: true,
                          title: `Delete Schedule: ${sch.categoryName}?`,
                          message:
                            'This schedule category and its associated image link will be permanently removed.',
                          action: async () => {
                            await onDeleteSchedule(sch.id);
                            setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
                          },
                        })
                      }
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-md text-rose-600 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= SECTION: DOCUMENTS ================= */}
      {activeSection === 'documents' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Documents & References ({data.documents.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage handbook files, circulars, rules, and Google Drive links.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingDocument(null);
                setDocumentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>
          </div>

          {data.documents.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              No documents created yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.documents.map((doc) => (
                <div key={doc.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                    <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                      <span>{doc.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase">{doc.fileType}</span>
                      {doc.isPinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-600 font-semibold">Pinned</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDocument(doc);
                        setDocumentModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm({
                          isOpen: true,
                          title: `Delete Document: ${doc.title}?`,
                          message: 'This document entry and link will be permanently removed.',
                          action: async () => {
                            await onDeleteDocument(doc.id);
                            setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
                          },
                        })
                      }
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-md text-rose-600 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= SECTION: EVENTS ================= */}
      {activeSection === 'events' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Event Info Sections ({data.eventSections.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage program rundowns, operational guidelines, and secretariat directory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingEventSection(null);
                setEventModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event Section</span>
            </button>
          </div>

          {data.eventSections.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              No event information sections created yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.eventSections.map((sec) => (
                <div key={sec.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{sec.title}</h4>
                    <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                      <span>Type: {sec.type}</span>
                      <span aria-hidden="true">·</span>
                      <span>{sec.items.length} Entries</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventSection(sec);
                        setEventModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm({
                          isOpen: true,
                          title: `Delete Section: ${sec.title}?`,
                          message: 'This event information section will be permanently deleted.',
                          action: async () => {
                            await onDeleteEventSection(sec.id);
                            setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
                          },
                        })
                      }
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-md text-rose-600 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= SECTION: LOCATIONS ================= */}
      {activeSection === 'locations' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Locations & Movement ({data.locations.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage arenas, transport routes, and assembly points.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingLocation(null);
                setLocationModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Location / Route</span>
            </button>
          </div>

          {data.locations.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              No locations added yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.locations.map((loc) => (
                <div key={loc.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{loc.name}</h4>
                    <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                      <span>Category: {loc.category}</span>
                      {loc.address && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{loc.address}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLocation(loc);
                        setLocationModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm({
                          isOpen: true,
                          title: `Delete Location: ${loc.name}?`,
                          message: 'This location entry will be permanently removed.',
                          action: async () => {
                            await onDeleteLocation(loc.id);
                            setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
                          },
                        })
                      }
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-md text-rose-600 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= SECTION: ANNOUNCEMENTS ================= */}
      {activeSection === 'announcements' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Announcements ({data.announcements.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage urgent notices, bulletins, and circular updates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingAnnouncement(null);
                setAnnouncementModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Announcement</span>
            </button>
          </div>

          {data.announcements.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              No announcements posted yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.announcements.map((ann) => (
                <div key={ann.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{ann.title}</h4>
                    <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                      <span className="font-semibold uppercase">{ann.priority}</span>
                      <span aria-hidden="true">·</span>
                      <span>By: {ann.author}</span>
                      {ann.isPinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-600 font-semibold">Pinned</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAnnouncement(ann);
                        setAnnouncementModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm({
                          isOpen: true,
                          title: `Delete Announcement: ${ann.title}?`,
                          message: 'This announcement will be removed immediately.',
                          action: async () => {
                            await onDeleteAnnouncement(ann.id);
                            setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
                          },
                        })
                      }
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-md text-rose-600 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= SECTION: SECURITY ================= */}
      {activeSection === 'security' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <form onSubmit={handleSaveSecurity} className="space-y-4 max-w-lg">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Security & Access Passcodes</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Change the contingent team access passcode or your administrator password.
              </p>
            </div>

            {securitySuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{securitySuccess}</span>
              </div>
            )}

            {securityError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{securityError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Update Contingent Team Access Passcode
              </label>
              <input
                type="text"
                placeholder="Enter new team passcode (e.g. KPMBP2026)"
                value={newTeamPasscode}
                onChange={(e) => setNewTeamPasscode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 uppercase tracking-wider font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Leave blank if you do not wish to change the team access passcode.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Change Administrator Password</h4>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Current Administrator Password
                </label>
                <input
                  type="password"
                  placeholder="Required only if changing admin password"
                  value={currentAdminPassword}
                  onChange={(e) => setCurrentAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Administrator Password
                </label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSecurity}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingSecurity ? 'Updating...' : 'Update Security Credentials'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-modals for editing individual records */}
      <ScheduleEditModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSave={onSaveSchedule}
        scheduleToEdit={editingSchedule}
      />

      <DocumentEditModal
        isOpen={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        onSave={onSaveDocument}
        documentToEdit={editingDocument}
      />

      <EventSectionEditModal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        onSave={onSaveEventSection}
        sectionToEdit={editingEventSection}
      />

      <LocationEditModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSave={onSaveLocation}
        locationToEdit={editingLocation}
      />

      <AnnouncementEditModal
        isOpen={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        onSave={onSaveAnnouncement}
        announcementToEdit={editingAnnouncement}
      />

      {/* Confirmation Dialog for Destructive Operations */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.action}
        onCancel={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
