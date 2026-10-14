import React, { useState, useEffect, useCallback } from 'react';
import {
  AuthStatus,
  PortalData,
  NavigationTab,
  PortalSettings,
  ScheduleItem,
  DocumentItem,
  EventSection,
  LocationItem,
  Announcement,
  EventCategory,
} from './types';
import { api } from './services/api';
import { AuthGate } from './components/auth/AuthGate';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { HomeModule } from './components/home/HomeModule';
import { ScheduleModule } from './components/schedule/ScheduleModule';
import { DocumentsModule } from './components/documents/DocumentsModule';
import { EventInfoModule } from './components/events/EventInfoModule';
import { LocationsModule } from './components/locations/LocationsModule';
import { AnnouncementsModule } from './components/announcements/AnnouncementsModule';
import { CustomTabModule } from './components/custom/CustomTabModule';
import { GalleryModule } from './components/gallery/GalleryModule';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PortalSettingsModal } from './components/common/PortalSettingsModal';
import { TelegramPublishModal } from './components/announcements/TelegramPublishModal';
import { BatchImageUploadModal } from './components/admin/BatchImageUploadModal';
import { testFirestoreConnection } from './lib/firebase';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [inlineEditMode, setInlineEditMode] = useState<boolean>(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  // Inline Settings Modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Telegram Direct Publish Modal State
  const [isTelegramPublishOpen, setIsTelegramPublishOpen] = useState<boolean>(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [publishCategory, setPublishCategory] = useState<string>('general');

  // Batch AI Upload Modal State
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState<boolean>(false);

  // Initialize and load portal data for public view
  const checkAuthAndLoadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const status = await api.getAuthStatus();
        setAuthStatus(status);
      } catch (authErr: any) {
        console.warn('Could not verify auth status, continuing as public viewer:', authErr);
        setAuthStatus({ isSetup: true, isAuthenticated: false, role: null, adminEmail: 'khaikerr@gmail.com' });
      }

      // Public Default View: Portal data is always loaded
      const data = await api.getPortalData();

      // Ensure 'gallery' tab exists in navigation
      if (data && data.tabs && !data.tabs.some((t) => t.id === 'gallery')) {
        const homeTab = data.tabs.find((t) => t.id === 'home');
        const otherTabs = data.tabs.filter((t) => t.id !== 'home');
        data.tabs = [
          homeTab || { id: 'home', label: 'Utama', order: 1, visible: true, isSystem: true },
          {
            id: 'gallery',
            label: 'Galeri Poster',
            order: 2,
            visible: true,
            isSystem: false,
            description: 'Infografik & poster rasmi mengikut kategori',
          },
          ...otherTabs,
        ];
      }

      setPortalData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize portal connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthAndLoadData();
    testFirestoreConnection();
  }, [checkAuthAndLoadData]);

  const handleAuthSuccess = async (status: AuthStatus) => {
    setAuthStatus(status);
    setIsAdminLoginOpen(false);
    try {
      const data = await api.getPortalData();
      setPortalData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load portal records.');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setAuthStatus((prev) => (prev ? { ...prev, isAuthenticated: false, role: null } : null));
    setIsAdminView(false);
    setInlineEditMode(false);
  };

  // ================= DATA MUTATION HANDLERS =================

  const handleUpdateTabs = async (tabs: NavigationTab[]) => {
    const updated = await api.updateTabs(tabs);
    setPortalData((prev) => (prev ? { ...prev, tabs: updated } : null));
  };

  const handleUpdateSettings = async (settings: PortalSettings) => {
    const updated = await api.updateSettings(settings);
    setPortalData((prev) => (prev ? { ...prev, settings: updated } : null));
  };

  const handleSaveSchedule = async (schedule: Partial<ScheduleItem>) => {
    const saved = await api.saveSchedule(schedule);
    setPortalData((prev) => {
      if (!prev) return null;
      const index = prev.schedules.findIndex((s) => s.id === saved.id);
      const updatedSchedules =
        index >= 0
          ? prev.schedules.map((s) => (s.id === saved.id ? saved : s))
          : [...prev.schedules, saved];
      return { ...prev, schedules: updatedSchedules };
    });
  };

  const handleDeleteSchedule = async (id: string) => {
    await api.deleteSchedule(id);
    setPortalData((prev) =>
      prev ? { ...prev, schedules: prev.schedules.filter((s) => s.id !== id) } : null
    );
  };

  const handleSaveDocument = async (doc: Partial<DocumentItem>) => {
    const saved = await api.saveDocument(doc);
    setPortalData((prev) => {
      if (!prev) return null;
      const index = prev.documents.findIndex((d) => d.id === saved.id);
      const updatedDocuments =
        index >= 0
          ? prev.documents.map((d) => (d.id === saved.id ? saved : d))
          : [...prev.documents, saved];
      return { ...prev, documents: updatedDocuments };
    });
  };

  const handleDeleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    setPortalData((prev) =>
      prev ? { ...prev, documents: prev.documents.filter((d) => d.id !== id) } : null
    );
  };

  const handleSaveEventSection = async (section: Partial<EventSection>) => {
    const saved = await api.saveEventSection(section);
    setPortalData((prev) => {
      if (!prev) return null;
      const index = prev.eventSections.findIndex((e) => e.id === saved.id);
      const updatedSections =
        index >= 0
          ? prev.eventSections.map((e) => (e.id === saved.id ? saved : e))
          : [...prev.eventSections, saved];
      return { ...prev, eventSections: updatedSections };
    });
  };

  const handleDeleteEventSection = async (id: string) => {
    await api.deleteEventSection(id);
    setPortalData((prev) =>
      prev ? { ...prev, eventSections: prev.eventSections.filter((e) => e.id !== id) } : null
    );
  };

  const handleSaveLocation = async (loc: Partial<LocationItem>) => {
    const saved = await api.saveLocation(loc);
    setPortalData((prev) => {
      if (!prev) return null;
      const index = prev.locations.findIndex((l) => l.id === saved.id);
      const updatedLocations =
        index >= 0
          ? prev.locations.map((l) => (l.id === saved.id ? saved : l))
          : [...prev.locations, saved];
      return { ...prev, locations: updatedLocations };
    });
  };

  const handleDeleteLocation = async (id: string) => {
    await api.deleteLocation(id);
    setPortalData((prev) =>
      prev ? { ...prev, locations: prev.locations.filter((l) => l.id !== id) } : null
    );
  };

  const handleSaveAnnouncement = async (ann: Partial<Announcement>) => {
    const saved = await api.saveAnnouncement(ann);
    setPortalData((prev) => {
      if (!prev) return null;
      const index = prev.announcements.findIndex((a) => a.id === saved.id);
      const updatedAnnouncements =
        index >= 0
          ? prev.announcements.map((a) => (a.id === saved.id ? saved : a))
          : [saved, ...prev.announcements];
      return { ...prev, announcements: updatedAnnouncements };
    });
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await api.deleteAnnouncement(id);
    setPortalData((prev) =>
      prev ? { ...prev, announcements: prev.announcements.filter((a) => a.id !== id) } : null
    );
  };

  const handleSaveBatchAnnouncements = async (batchItems: Partial<Announcement>[]) => {
    const res = await api.saveBatchAnnouncements(batchItems);
    if (res.items && res.items.length > 0) {
      setPortalData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          announcements: [...res.items, ...prev.announcements],
        };
      });
    }
  };

  const handleSupersedeAnnouncement = async (id: string, isSuperseded: boolean, reason?: string) => {
    const updated = await api.supersedeAnnouncement(id, isSuperseded, reason);
    setPortalData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        announcements: prev.announcements.map((a) => (a.id === updated.id ? updated : a)),
      };
    });
  };

  const handleSaveCustomTabContent = async (tabId: string, content: string) => {
    await api.saveCustomTabContent(tabId, content);
    setPortalData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        customTabsContent: {
          ...prev.customTabsContent,
          [tabId]: content,
        },
      };
    });
  };

  const handleSaveSubheader = async (sectionKey: string, newTitle: string) => {
    if (!portalData) return;
    const currentSubheaders = portalData.settings.customSubheaders || {};
    const updatedSettings: PortalSettings = {
      ...portalData.settings,
      customSubheaders: {
        ...currentSubheaders,
        [sectionKey]: newTitle,
      },
    };
    await handleUpdateSettings(updatedSettings);
  };

  const handleSaveCategory = async (cat: Partial<EventCategory>) => {
    if (!portalData) return;
    const currentCats = portalData.categories || [];
    const index = currentCats.findIndex((c) => c.id === cat.id);
    const updated =
      index >= 0
        ? currentCats.map((c) => (c.id === cat.id ? { ...c, ...cat } : c))
        : [...currentCats, cat as EventCategory];
    await api.updateCategories(updated);
    setPortalData((prev) => (prev ? { ...prev, categories: updated } : null));
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Connecting to Competition Hub KPMBP...
        </p>
      </div>
    );
  }

  // If waiting for portal data
  if (!portalData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="max-w-md p-6 bg-white border border-rose-200 rounded-xl shadow-xs text-center">
            <p className="text-sm text-rose-600 font-semibold mb-3">{error}</p>
            <button
              type="button"
              onClick={checkAuthAndLoadData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cuba Semula
            </button>
          </div>
        ) : (
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        )}
      </div>
    );
  }

  const isAdmin = authStatus?.role === 'admin';
  const currentTab = portalData.tabs.find((t) => t.id === activeTab) || portalData.tabs[0];

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col antialiased">
      {/* Top Header */}
      <Header
        tabs={portalData.tabs}
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          setIsAdminView(false);
        }}
        userRole={authStatus?.role || null}
        userEmail={authStatus?.adminEmail}
        inlineEditMode={inlineEditMode}
        onToggleInlineEdit={() => setInlineEditMode(!inlineEditMode)}
        isAdminView={isAdminView}
        onToggleAdminView={() => setIsAdminView(!isAdminView)}
        onLogout={handleLogout}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isAdminView && isAdmin ? (
          /* Central Admin Dashboard */
          <AdminDashboard
            data={portalData}
            onUpdateTabs={handleUpdateTabs}
            onUpdateSettings={handleUpdateSettings}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onSaveDocument={handleSaveDocument}
            onDeleteDocument={handleDeleteDocument}
            onSaveEventSection={handleSaveEventSection}
            onDeleteEventSection={handleDeleteEventSection}
            onSaveLocation={handleSaveLocation}
            onDeleteLocation={handleDeleteLocation}
            onSaveAnnouncement={handleSaveAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onCloseAdminView={() => setIsAdminView(false)}
          />
        ) : (
          /* Regular / Inline-Editable Portal Views */
          <>
            {activeTab === 'home' && (
              <HomeModule
                data={portalData}
                isAdmin={isAdmin}
                inlineEditMode={inlineEditMode}
                onNavigateTab={(tabId) => setActiveTab(tabId)}
                onEditSettings={() => setIsSettingsModalOpen(true)}
                onOpenPublishModal={() => {
                  setEditingAnnouncement(null);
                  setPublishCategory('general');
                  setIsTelegramPublishOpen(true);
                }}
                onOpenBatchUploadModal={() => setIsBatchUploadOpen(true)}
                onUpdatePhase={async (phase) => {
                  await handleUpdateSettings({
                    ...portalData.settings,
                    activePhase: phase,
                  });
                }}
                onSaveSubheader={handleSaveSubheader}
                onSaveSchedule={handleSaveSchedule}
                onSaveCategory={handleSaveCategory}
                onSaveAnnouncement={handleSaveAnnouncement}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {activeTab === 'gallery' && (
              <GalleryModule
                announcements={portalData.announcements}
                categories={portalData.categories || []}
                isAdmin={isAdmin}
                inlineEditMode={inlineEditMode}
                activePhase={portalData.settings.activePhase}
                onOpenBatchUploadModal={() => setIsBatchUploadOpen(true)}
                onOpenTelegramPublishModal={() => {
                  setPublishCategory('general');
                  setEditingAnnouncement(null);
                  setIsTelegramPublishOpen(true);
                }}
                onUpdateAnnouncement={handleSaveAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
                onSupersedeAnnouncement={handleSupersedeAnnouncement}
              />
            )}

            {activeTab === 'schedule' && (
              <ScheduleModule
                schedules={portalData.schedules}
                isAdmin={isAdmin}
                inlineEditMode={inlineEditMode}
                onSaveSchedule={handleSaveSchedule}
                onDeleteSchedule={handleDeleteSchedule}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentsModule
                documents={portalData.documents}
                isAdmin={isAdmin}
                inlineEditMode={inlineEditMode}
                onSaveDocument={handleSaveDocument}
                onDeleteDocument={handleDeleteDocument}
              />
            )}

            {activeTab === 'events' && (
              <EventInfoModule
                sections={portalData.eventSections}
                isAdmin={isAdmin}
                inlineEditMode={inlineEditMode}
                onSaveSection={handleSaveEventSection}
                onDeleteSection={handleDeleteEventSection}
              />
            )}

            {activeTab === 'locations' && (
              <LocationsModule
                locations={portalData.locations}
                isAdmin={isAdmin}
                inlineEditMode={inlineEditMode}
                onSaveLocation={handleSaveLocation}
                onDeleteLocation={handleDeleteLocation}
              />
            )}

            {activeTab === 'announcements' && (
              <AnnouncementsModule
                announcements={portalData.announcements}
                categories={portalData.categories || []}
                isAdmin={isAdmin}
                inlineEditMode={inlineEditMode}
                activePhase={portalData.settings.activePhase}
                onOpenTelegramPublish={(defaultCat, editItem) => {
                  setPublishCategory(defaultCat || 'general');
                  setEditingAnnouncement(editItem || null);
                  setIsTelegramPublishOpen(true);
                }}
                onOpenBatchUploadModal={() => setIsBatchUploadOpen(true)}
                onDeleteAnnouncement={handleDeleteAnnouncement}
              />
            )}

            {/* Custom Tab View */}
            {activeTab !== 'home' &&
              activeTab !== 'gallery' &&
              activeTab !== 'schedule' &&
              activeTab !== 'documents' &&
              activeTab !== 'events' &&
              activeTab !== 'locations' &&
              activeTab !== 'announcements' && (
                <CustomTabModule
                  tabId={activeTab}
                  tabLabel={currentTab?.label || 'Custom Page'}
                  content={portalData.customTabsContent[activeTab] || ''}
                  isAdmin={isAdmin}
                  inlineEditMode={inlineEditMode}
                  onSaveContent={handleSaveCustomTabContent}
                />
              )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer settings={portalData.settings} />

      {/* Inline Settings Modal */}
      {isSettingsModalOpen && (
        <PortalSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={portalData.settings}
          onSave={handleUpdateSettings}
        />
      )}

      {/* Batch AI Image Upload & Review Modal */}
      {isBatchUploadOpen && (
        <BatchImageUploadModal
          isOpen={isBatchUploadOpen}
          onClose={() => setIsBatchUploadOpen(false)}
          categories={portalData.categories || []}
          activePhase={portalData.settings.activePhase}
          onSaveBatch={handleSaveBatchAnnouncements}
        />
      )}

      {/* Telegram Direct Publish / Edit Modal */}
      {isTelegramPublishOpen && (
        <TelegramPublishModal
          isOpen={isTelegramPublishOpen}
          onClose={() => {
            setIsTelegramPublishOpen(false);
            setEditingAnnouncement(null);
          }}
          onSave={handleSaveAnnouncement}
          categories={portalData.categories || []}
          announcementToEdit={editingAnnouncement}
          activePhase={portalData.settings.activePhase}
        />
      )}

      {/* Admin Login Modal */}
      {isAdminLoginOpen && (
        <AuthGate
          authStatus={authStatus || { isSetup: false, adminEmail: 'khaikerr@gmail.com', isAuthenticated: false, role: null }}
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setIsAdminLoginOpen(false)}
        />
      )}
    </div>
  );
}
