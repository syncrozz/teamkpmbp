import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth_data.json');
const PORTAL_FILE = path.join(DATA_DIR, 'portal_data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Interfaces
interface AuthStore {
  isSetup: boolean;
  adminEmail: string;
  adminPasswordHash: string;
  adminPasswordSalt: string;
  teamPasscode: string;
  sessions: Record<string, { role: 'admin' | 'team'; email?: string; expiresAt: number }>;
}

interface PortalStore {
  tabs: Array<{ id: string; label: string; order: number; visible: boolean; isSystem?: boolean; description?: string }>;
  settings: {
    eventTitle: string;
    eventSubtitle: string;
    contingentName: string;
    motto: string;
    secretariatLocation: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    allowPublicGuestView?: boolean;
  };
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    priority: 'urgent' | 'important' | 'general';
    isPinned: boolean;
    category: string;
    author: string;
    timestamp: string;
    externalUrl?: string;
    externalUrlLabel?: string;
  }>;
  schedules: Array<{
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
  }>;
  documents: Array<{
    id: string;
    title: string;
    category: string;
    description?: string;
    fileUrl: string;
    fileType: 'drive' | 'pdf' | 'sheet' | 'doc' | 'link';
    order: number;
    isPinned?: boolean;
    lastUpdated: string;
  }>;
  eventSections: Array<{
    id: string;
    title: string;
    category: string;
    type: 'rundown' | 'rules' | 'criteria' | 'contacts' | 'text';
    description?: string;
    items: Array<{
      id: string;
      title: string;
      subtitle?: string;
      detail?: string;
      date?: string;
      time?: string;
      badge?: string;
      contactNumber?: string;
    }>;
    rawContent?: string;
    order: number;
  }>;
  locations: Array<{
    id: string;
    name: string;
    category: 'venue' | 'transport' | 'accommodation' | 'assembly';
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
  }>;
  customTabsContent: Record<string, string>;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// Load or initialize Auth Store
function getAuthStore(): AuthStore {
  if (fs.existsSync(AUTH_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    } catch {
      // corrupt file fallback
    }
  }

  const defaultStore: AuthStore = {
    isSetup: false,
    adminEmail: 'khaikerr@gmail.com',
    adminPasswordHash: '',
    adminPasswordSalt: '',
    teamPasscode: '',
    sessions: {},
  };
  saveAuthStore(defaultStore);
  return defaultStore;
}

function saveAuthStore(store: AuthStore): void {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

// Load or initialize Portal Store
function getPortalStore(): PortalStore {
  if (fs.existsSync(PORTAL_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PORTAL_FILE, 'utf-8'));
    } catch {
      // Corrupt file fallback
    }
  }

  const defaultStore: PortalStore = {
    tabs: [
      { id: 'home', label: 'Home', order: 1, visible: true, isSystem: true, description: 'Contingent Portal Overview' },
      { id: 'schedule', label: 'Competition Schedule', order: 2, visible: true, isSystem: false, description: 'Schedule charts and event timetables' },
      { id: 'documents', label: 'Documents & References', order: 3, visible: true, isSystem: false, description: 'Rules, handbook, score sheets & guidelines' },
      { id: 'events', label: 'Event Information', order: 4, visible: true, isSystem: false, description: 'Rundown, competition categories & contacts' },
      { id: 'locations', label: 'Locations & Movement', order: 5, visible: true, isSystem: false, description: 'Venues, transportation & accommodation' },
      { id: 'announcements', label: 'Announcements', order: 6, visible: true, isSystem: false, description: 'Official updates and alerts' },
    ],
    settings: {
      eventTitle: 'KPM Bandar Penawar Contingent Hub',
      eventSubtitle: 'Central Reference & Operational Portal',
      contingentName: 'KPM Bandar Penawar (KPMBP)',
      motto: 'Kecemerlangan Terbukti, Semangat Menjulang',
      secretariatLocation: 'Bilik Gerakan Kontinjen KPMBP',
      emergencyContactName: 'Urus Setia Kontinjen',
      emergencyContactPhone: '+60 19-700 8921',
      allowPublicGuestView: false,
    },
    announcements: [],
    schedules: [],
    documents: [],
    eventSections: [],
    locations: [],
    customTabsContent: {},
  };
  savePortalStore(defaultStore);
  return defaultStore;
}

function savePortalStore(store: PortalStore): void {
  fs.writeFileSync(PORTAL_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

// Express App Initialization
const app = express();
app.use(express.json({ limit: '10mb' }));

// Helper to extract session
function getSessionFromReq(req: Request): { role: 'admin' | 'team'; email?: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);

  const authStore = getAuthStore();
  const session = authStore.sessions[token];
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    delete authStore.sessions[token];
    saveAuthStore(authStore);
    return null;
  }

  return session;
}

// Authentication Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'Access restricted. Please authenticate to view this portal.' });
    return;
  }
  (req as any).user = session;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getSessionFromReq(req);
  if (!session || session.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized. Administrator privileges required.' });
    return;
  }
  (req as any).user = session;
  next();
}

// ======================== AUTH ROUTES ========================

app.get('/api/auth/status', (req: Request, res: Response) => {
  const authStore = getAuthStore();
  const session = getSessionFromReq(req);

  res.json({
    isSetup: authStore.isSetup,
    adminEmail: authStore.adminEmail,
    isAuthenticated: !!session,
    role: session ? session.role : null,
    email: session ? session.email : undefined,
  });
});

app.post('/api/auth/setup', (req: Request, res: Response) => {
  const authStore = getAuthStore();
  if (authStore.isSetup) {
    res.status(400).json({ error: 'Admin has already been initialized.' });
    return;
  }

  const { adminPassword, teamPasscode } = req.body;
  if (!adminPassword || typeof adminPassword !== 'string' || adminPassword.length < 6) {
    res.status(400).json({ error: 'Admin password must be at least 6 characters long.' });
    return;
  }

  if (!teamPasscode || typeof teamPasscode !== 'string' || teamPasscode.trim().length < 3) {
    res.status(400).json({ error: 'Team access passcode must be at least 3 characters long.' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(adminPassword, salt);

  authStore.isSetup = true;
  authStore.adminPasswordSalt = salt;
  authStore.adminPasswordHash = hash;
  authStore.teamPasscode = teamPasscode.trim();

  // Create immediate admin session
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  authStore.sessions[token] = {
    role: 'admin',
    email: authStore.adminEmail,
    expiresAt,
  };

  saveAuthStore(authStore);

  res.json({
    success: true,
    token,
    role: 'admin',
    email: authStore.adminEmail,
  });
});

app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const { password, email } = req.body;
  const authStore = getAuthStore();

  if (!authStore.isSetup) {
    res.status(400).json({ error: 'System is not initialized. Please complete initial setup.' });
    return;
  }

  if (email && email.toLowerCase().trim() !== authStore.adminEmail.toLowerCase().trim()) {
    res.status(401).json({ error: 'Invalid administrator email address.' });
    return;
  }

  const incomingHash = hashPassword(password || '', authStore.adminPasswordSalt);
  if (incomingHash !== authStore.adminPasswordHash) {
    res.status(401).json({ error: 'Incorrect administrator password.' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  authStore.sessions[token] = {
    role: 'admin',
    email: authStore.adminEmail,
    expiresAt,
  };
  saveAuthStore(authStore);

  res.json({
    token,
    role: 'admin',
    email: authStore.adminEmail,
  });
});

app.post('/api/auth/team-login', (req: Request, res: Response) => {
  const { passcode } = req.body;
  const authStore = getAuthStore();

  if (!authStore.isSetup) {
    res.status(400).json({ error: 'System is not initialized. Please ask the administrator to initialize the portal.' });
    return;
  }

  if (!passcode || passcode.trim().toUpperCase() !== authStore.teamPasscode.toUpperCase()) {
    res.status(401).json({ error: 'Invalid Team Access Passcode. Please check with your contingent manager.' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  authStore.sessions[token] = {
    role: 'team',
    expiresAt,
  };
  saveAuthStore(authStore);

  res.json({
    token,
    role: 'team',
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const authStore = getAuthStore();
    if (authStore.sessions[token]) {
      delete authStore.sessions[token];
      saveAuthStore(authStore);
    }
  }
  res.json({ success: true });
});

app.post('/api/auth/update-credentials', requireAdmin, (req: Request, res: Response) => {
  const { currentPassword, newPassword, teamPasscode } = req.body;
  const authStore = getAuthStore();

  if (newPassword) {
    if (!currentPassword) {
      res.status(400).json({ error: 'Current password is required to change administrator password.' });
      return;
    }
    const currentHash = hashPassword(currentPassword, authStore.adminPasswordSalt);
    if (currentHash !== authStore.adminPasswordHash) {
      res.status(401).json({ error: 'Current administrator password is incorrect.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    authStore.adminPasswordSalt = salt;
    authStore.adminPasswordHash = hashPassword(newPassword, salt);
  }

  if (teamPasscode && typeof teamPasscode === 'string') {
    if (teamPasscode.trim().length < 3) {
      res.status(400).json({ error: 'Team access passcode must be at least 3 characters long.' });
      return;
    }
    authStore.teamPasscode = teamPasscode.trim();
  }

  saveAuthStore(authStore);
  res.json({ success: true, message: 'Security credentials updated successfully.' });
});

// ======================== PORTAL DATA ROUTES ========================

// Read full portal data (Requires Authentication)
app.get('/api/portal/data', requireAuth, (_req: Request, res: Response) => {
  const portalStore = getPortalStore();
  res.json(portalStore);
});

// Update portal settings (Admin only)
app.put('/api/portal/settings', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  portalStore.settings = { ...portalStore.settings, ...req.body };
  savePortalStore(portalStore);
  res.json(portalStore.settings);
});

// Update tabs configuration (Admin only)
app.put('/api/portal/tabs', requireAdmin, (req: Request, res: Response) => {
  const { tabs } = req.body;
  if (!Array.isArray(tabs)) {
    res.status(400).json({ error: 'Tabs must be an array.' });
    return;
  }
  const portalStore = getPortalStore();
  portalStore.tabs = tabs;
  savePortalStore(portalStore);
  res.json(portalStore.tabs);
});

// Announcements CRUD (Admin only for mutations)
app.post('/api/portal/announcements', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const newItem = {
    id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: req.body.title || 'Untitled Notice',
    content: req.body.content || '',
    priority: req.body.priority || 'general',
    isPinned: Boolean(req.body.isPinned),
    category: req.body.category || 'General',
    author: req.body.author || 'Secretariat KPMBP',
    timestamp: new Date().toISOString(),
    externalUrl: req.body.externalUrl || '',
    externalUrlLabel: req.body.externalUrlLabel || '',
  };
  portalStore.announcements.unshift(newItem);
  savePortalStore(portalStore);
  res.json(newItem);
});

app.put('/api/portal/announcements/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const index = portalStore.announcements.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Announcement not found.' });
    return;
  }
  portalStore.announcements[index] = {
    ...portalStore.announcements[index],
    ...req.body,
    id: req.params.id,
  };
  savePortalStore(portalStore);
  res.json(portalStore.announcements[index]);
});

app.delete('/api/portal/announcements/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  portalStore.announcements = portalStore.announcements.filter((a) => a.id !== req.params.id);
  savePortalStore(portalStore);
  res.json({ success: true });
});

// Schedules CRUD (Admin only for mutations)
app.post('/api/portal/schedules', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const newItem = {
    id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    categoryName: req.body.categoryName || 'Competition Category',
    subcategory: req.body.subcategory || '',
    date: req.body.date || '',
    time: req.body.time || '',
    venue: req.body.venue || '',
    imageUrl: req.body.imageUrl || '',
    sourceDocUrl: req.body.sourceDocUrl || '',
    notes: req.body.notes || '',
    order: portalStore.schedules.length + 1,
    lastUpdated: new Date().toISOString(),
  };
  portalStore.schedules.push(newItem);
  savePortalStore(portalStore);
  res.json(newItem);
});

app.put('/api/portal/schedules/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const index = portalStore.schedules.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Schedule item not found.' });
    return;
  }
  portalStore.schedules[index] = {
    ...portalStore.schedules[index],
    ...req.body,
    id: req.params.id,
    lastUpdated: new Date().toISOString(),
  };
  savePortalStore(portalStore);
  res.json(portalStore.schedules[index]);
});

app.delete('/api/portal/schedules/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  portalStore.schedules = portalStore.schedules.filter((s) => s.id !== req.params.id);
  savePortalStore(portalStore);
  res.json({ success: true });
});

// Documents CRUD (Admin only for mutations)
app.post('/api/portal/documents', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const newItem = {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: req.body.title || 'Untitled Document',
    category: req.body.category || 'General Reference',
    description: req.body.description || '',
    fileUrl: req.body.fileUrl || '',
    fileType: req.body.fileType || 'drive',
    order: portalStore.documents.length + 1,
    isPinned: Boolean(req.body.isPinned),
    lastUpdated: new Date().toISOString(),
  };
  portalStore.documents.push(newItem);
  savePortalStore(portalStore);
  res.json(newItem);
});

app.put('/api/portal/documents/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const index = portalStore.documents.findIndex((d) => d.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  portalStore.documents[index] = {
    ...portalStore.documents[index],
    ...req.body,
    id: req.params.id,
    lastUpdated: new Date().toISOString(),
  };
  savePortalStore(portalStore);
  res.json(portalStore.documents[index]);
});

app.delete('/api/portal/documents/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  portalStore.documents = portalStore.documents.filter((d) => d.id !== req.params.id);
  savePortalStore(portalStore);
  res.json({ success: true });
});

// Event Info Sections CRUD (Admin only for mutations)
app.post('/api/portal/event-info', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const newItem = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: req.body.title || 'Event Section',
    category: req.body.category || 'General',
    type: req.body.type || 'rundown',
    description: req.body.description || '',
    items: Array.isArray(req.body.items) ? req.body.items : [],
    rawContent: req.body.rawContent || '',
    order: portalStore.eventSections.length + 1,
  };
  portalStore.eventSections.push(newItem);
  savePortalStore(portalStore);
  res.json(newItem);
});

app.put('/api/portal/event-info/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const index = portalStore.eventSections.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Event section not found.' });
    return;
  }
  portalStore.eventSections[index] = {
    ...portalStore.eventSections[index],
    ...req.body,
    id: req.params.id,
  };
  savePortalStore(portalStore);
  res.json(portalStore.eventSections[index]);
});

app.delete('/api/portal/event-info/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  portalStore.eventSections = portalStore.eventSections.filter((e) => e.id !== req.params.id);
  savePortalStore(portalStore);
  res.json({ success: true });
});

// Locations CRUD (Admin only for mutations)
app.post('/api/portal/locations', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const newItem = {
    id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: req.body.name || 'Location / Movement Entry',
    category: req.body.category || 'venue',
    address: req.body.address || '',
    mapUrl: req.body.mapUrl || '',
    coordinates: req.body.coordinates || '',
    scheduleTimes: req.body.scheduleTimes || '',
    routeDetails: req.body.routeDetails || '',
    notes: req.body.notes || '',
    floorplanUrl: req.body.floorplanUrl || '',
    contactPerson: req.body.contactPerson || '',
    contactPhone: req.body.contactPhone || '',
    order: portalStore.locations.length + 1,
  };
  portalStore.locations.push(newItem);
  savePortalStore(portalStore);
  res.json(newItem);
});

app.put('/api/portal/locations/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const index = portalStore.locations.findIndex((l) => l.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Location entry not found.' });
    return;
  }
  portalStore.locations[index] = {
    ...portalStore.locations[index],
    ...req.body,
    id: req.params.id,
  };
  savePortalStore(portalStore);
  res.json(portalStore.locations[index]);
});

app.delete('/api/portal/locations/:id', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  portalStore.locations = portalStore.locations.filter((l) => l.id !== req.params.id);
  savePortalStore(portalStore);
  res.json({ success: true });
});

// Custom Tab Content (Admin only for mutations)
app.put('/api/portal/custom-tab/:tabId', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const { tabId } = req.params;
  const { content } = req.body;
  portalStore.customTabsContent[tabId] = content || '';
  savePortalStore(portalStore);
  res.json({ success: true });
});

// Vite or Static setup
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Competition Hub KPMBP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
