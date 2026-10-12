export type UserRole = 'admin' | 'team';

export interface UserSession {
  role: UserRole;
  email?: string;
  token: string;
  expiresAt: number;
}

export interface AuthStatus {
  isSetup: boolean;
  adminEmail: string;
  isAuthenticated: boolean;
  role: UserRole | null;
  email?: string;
}

export interface NavigationTab {
  id: string;
  label: string;
  order: number;
  visible: boolean;
  isSystem?: boolean;
  description?: string;
}

export type AnnouncementPriority = 'urgent' | 'important' | 'general';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  isPinned: boolean;
  category: string;
  author: string;
  timestamp: string;
  externalUrl?: string;
  externalUrlLabel?: string;
}

export interface ScheduleItem {
  id: string;
  categoryName: string;
  subcategory?: string;
  date: string;
  time?: string;
  venue: string;
  imageUrl: string;
  sourceDocUrl?: string;
  notes?: string;
  order: number;
  lastUpdated: string;
}

export type DocumentType = 'drive' | 'pdf' | 'sheet' | 'doc' | 'link';

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  fileUrl: string;
  fileType: DocumentType;
  order: number;
  isPinned?: boolean;
  lastUpdated: string;
}

export type EventSectionType = 'rundown' | 'rules' | 'criteria' | 'contacts' | 'text';

export interface EventSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  detail?: string;
  date?: string;
  time?: string;
  badge?: string;
  contactNumber?: string;
}

export interface EventSection {
  id: string;
  title: string;
  category: string;
  type: EventSectionType;
  description?: string;
  items: EventSectionItem[];
  rawContent?: string;
  order: number;
}

export type LocationCategory = 'venue' | 'transport' | 'accommodation' | 'assembly';

export interface LocationItem {
  id: string;
  name: string;
  category: LocationCategory;
  address?: string;
  mapUrl?: string;
  coordinates?: string;
  scheduleTimes?: string;
  routeDetails?: string;
  notes?: string;
  floorplanUrl?: string;
  contactPerson?: string;
  contactPhone?: string;
  order: number;
}

export interface PortalSettings {
  eventTitle: string;
  eventSubtitle: string;
  contingentName: string;
  motto: string;
  secretariatLocation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allowPublicGuestView?: boolean;
}

export interface PortalData {
  tabs: NavigationTab[];
  settings: PortalSettings;
  announcements: Announcement[];
  schedules: ScheduleItem[];
  documents: DocumentItem[];
  eventSections: EventSection[];
  locations: LocationItem[];
  customTabsContent: Record<string, string>;
}
