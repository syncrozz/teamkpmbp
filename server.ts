import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth_data.json');
const PORTAL_FILE = path.join(DATA_DIR, 'portal_data.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Safe server-side Gemini AI client initialization
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Ensure data and uploads directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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

export interface EventCategory {
  id: string;
  name: string;
  shortCode?: string;
  description?: string;
  managerName?: string;
  managerPhone?: string;
  order: number;
  visible: boolean;
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
    activePhase: 'pre-final' | 'during-final';
    phaseAName?: string;
    phaseADescription?: string;
    phaseBName?: string;
    phaseBDescription?: string;
    phaseDates?: string;
  };
  categories: EventCategory[];
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    priority: 'urgent' | 'important' | 'general';
    isPinned: boolean;
    category: string;
    phase: 'all' | 'pre-final' | 'during-final';
    status: 'published' | 'draft';
    author: string;
    timestamp: string;
    imageUrl?: string;
    imageCaption?: string;
    externalUrl?: string;
    externalUrlLabel?: string;
    telegramRawText?: string;
    tags?: string[];
    isSuperseded?: boolean;
    supersededReason?: string;
    collectionId?: string;
    collectionName?: string;
    collectionIndex?: number;
    importantDates?: string;
    verificationRequired?: boolean;
    lastUpdated?: string;
  }>;
  schedules: Array<{
    id: string;
    categoryName: string;
    subcategory?: string;
    date: string;
    time?: string;
    venue: string;
    imageUrl?: string;
    sourceDocUrl?: string;
    notes?: string;
    phase?: 'all' | 'pre-final' | 'during-final';
    status?: 'published' | 'draft';
    performanceOrder?: string;
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
    phase?: 'all' | 'pre-final' | 'during-final';
    status?: 'published' | 'draft';
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
    phase?: 'all' | 'pre-final' | 'during-final';
    status?: 'published' | 'draft';
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
    phase?: 'all' | 'pre-final' | 'during-final';
    status?: 'published' | 'draft';
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

// Default Event Categories for SOAR 2026
const DEFAULT_SOAR_CATEGORIES: EventCategory[] = [
  { id: 'symphonic-duo', name: 'Symphonic Duo', shortCode: 'SD', description: 'Kategori Muzik & Vokal Dua Alat', order: 1, visible: true },
  { id: 'islamic-theatre', name: 'Islamic Theatre', shortCode: 'IT', description: 'Teater & Lakonan Islamik Tematik', order: 2, visible: true },
  { id: 'battle-of-the-bands', name: 'Battle of the Bands', shortCode: 'BOB', description: 'Pertandingan Kugiran & Muzik Kombo', order: 3, visible: true },
  { id: 'tarian-zapin', name: 'Tarian Zapin', shortCode: 'TZ', description: 'Tarian Tradisional Melayu Zapin', order: 4, visible: true },
  { id: 'street-dakwah', name: 'Street Dakwah', shortCode: 'SDW', description: 'Pidato & Pengucapan Awam Dakwah Terbuka', order: 5, visible: true },
  { id: 'majlis-penutupan', name: 'Majlis Penutupan SOAR', shortCode: 'MPS', description: 'Raptai, Perarakan & Majlis Penutup Rasmi', order: 6, visible: true },
  { id: 'penginapan', name: 'Penginapan Kontinjen', shortCode: 'LOG', description: 'Kolej Kediaman, Bilik & Kebajikan Kontinjen', order: 7, visible: true },
  { id: 'pengangkutan', name: 'Pengangkutan & Bas', shortCode: 'TRN', description: 'Jadual Pergerakan Bas & Perjalanan', order: 8, visible: true },
  { id: 'general', name: 'Urus Setia / Hebahan Am', shortCode: 'GEN', description: 'Makluman Rasmi Urus Setia Kontinjen KPMBP', order: 9, visible: true },
];

// Load or initialize Portal Store
function getPortalStore(): PortalStore {
  if (fs.existsSync(PORTAL_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(PORTAL_FILE, 'utf-8'));
      // Ensure SOAR 2026 upgrades
      if (!parsed.categories || parsed.categories.length === 0) {
        parsed.categories = DEFAULT_SOAR_CATEGORIES;
      }
      if (!parsed.settings.activePhase) {
        parsed.settings.activePhase = 'pre-final';
      }
      if (!parsed.settings.phaseAName) {
        parsed.settings.phaseAName = 'Fasa A: Persediaan Pra-Final';
        parsed.settings.phaseADescription = 'Checklist, taklimat, jadual ketibaan & persediaan sebelum pertandingan.';
      }
      if (!parsed.settings.phaseBName) {
        parsed.settings.phaseBName = 'Fasa B: Hari Pertandingan & Final';
        parsed.settings.phaseBDescription = 'Jadual bertanding, giliran persembahan, venue, dan keputusan rasmi.';
      }
      if (!parsed.settings.eventTitle || parsed.settings.eventTitle === 'react-example') {
        parsed.settings.eventTitle = 'KPMBP SOAR 2026 Contingent Hub';
      }
      return parsed;
    } catch {
      // Corrupt file fallback
    }
  }

  const defaultStore: PortalStore = {
    tabs: [
      { id: 'home', label: 'Home', order: 1, visible: true, isSystem: true, description: 'Contingent Portal Overview' },
      { id: 'schedule', label: 'Jadual Pertandingan', order: 2, visible: true, isSystem: false, description: 'Jadual carta dan waktu giliran' },
      { id: 'documents', label: 'Dokumen & Rujukan', order: 3, visible: true, isSystem: false, description: 'Syarat, buku panduan & borang rasmi' },
      { id: 'events', label: 'Maklumat Acara', order: 4, visible: true, isSystem: false, description: 'Kategori acara, giliran & pegawai' },
      { id: 'locations', label: 'Lokasi & Pergerakan', order: 5, visible: true, isSystem: false, description: 'Venue, bas dan penginapan' },
      { id: 'announcements', label: 'Hebahan Telegram', order: 6, visible: true, isSystem: false, description: 'Mesej, hebahan segera & poster' },
    ],
    settings: {
      eventTitle: 'KPMBP SOAR 2026 Contingent Hub',
      eventSubtitle: 'Pusat Rujukan & Operasi Kontinjen KPM Bandar Penawar',
      contingentName: 'KPM Bandar Penawar (KPMBP)',
      motto: 'Kecemerlangan Terbukti, Semangat Menjulang',
      secretariatLocation: 'Bilik Gerakan Kontinjen KPMBP',
      emergencyContactName: 'Urus Setia Kontinjen',
      emergencyContactPhone: '+60 19-700 8921',
      allowPublicGuestView: true,
      activePhase: 'pre-final',
      phaseAName: 'Fasa A: Persediaan Pra-Final',
      phaseADescription: 'Checklist, taklimat, jadual ketibaan & persediaan sebelum pertandingan.',
      phaseBName: 'Fasa B: Hari Pertandingan & Final',
      phaseBDescription: 'Jadual bertanding, giliran persembahan, venue, dan keputusan rasmi.',
      phaseDates: 'SOAR 2026',
    },
    categories: DEFAULT_SOAR_CATEGORIES,
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
app.use(express.json({ limit: '25mb' }));

// Serve uploaded posters & media statically with cache
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1d' }));

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
    res.status(400).json({ error: 'System is already initialized.' });
    return;
  }

  const { adminPassword, teamPasscode } = req.body;
  if (!adminPassword || adminPassword.length < 6) {
    res.status(400).json({ error: 'Administrator password must be at least 6 characters.' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  authStore.adminPasswordSalt = salt;
  authStore.adminPasswordHash = hashPassword(adminPassword, salt);
  authStore.teamPasscode = teamPasscode ? teamPasscode.trim() : 'KPMBP2026';
  authStore.isSetup = true;

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

app.post('/api/auth/firebase-login', (req: Request, res: Response) => {
  const { email } = req.body;
  const authStore = getAuthStore();

  const normalizedEmail = (email || '').toLowerCase().trim();
  const allowedAdminEmails = [
    authStore.adminEmail.toLowerCase().trim(),
    'khaikerr@gmail.com',
    'kpmbppsn@gmail.com',
  ];

  if (!normalizedEmail || !allowedAdminEmails.includes(normalizedEmail)) {
    res.status(401).json({ error: 'This account is not authorized as an administrator for Competition Hub KPMBP.' });
    return;
  }

  if (!authStore.isSetup) {
    authStore.isSetup = true;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  authStore.sessions[token] = {
    role: 'admin',
    email: normalizedEmail,
    expiresAt,
  };
  saveAuthStore(authStore);

  res.json({
    token,
    role: 'admin',
    email: normalizedEmail,
  });
});

app.post('/api/auth/team-login', (req: Request, res: Response) => {
  const { passcode } = req.body;
  const authStore = getAuthStore();

  if (!authStore.isSetup) {
    res.status(400).json({ error: 'Portal is not configured yet.' });
    return;
  }

  if (!passcode || passcode.trim().toUpperCase() !== authStore.teamPasscode.toUpperCase()) {
    res.status(401).json({ error: 'Invalid team passcode. Please check with your team coordinator.' });
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

// ======================== DIRECT FILE UPLOAD ========================

// Upload Poster / Image / Document endpoint (Admin only)
app.post('/api/upload', requireAdmin, (req: Request, res: Response) => {
  try {
    const { fileName, fileData, contentType } = req.body;
    if (!fileData || !fileName) {
      res.status(400).json({ error: 'File data and file name are required.' });
      return;
    }

    // Supported formats: JPG, PNG, WebP, GIF, PDF
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];
    const originalExt = path.extname(fileName).toLowerCase();
    const targetExt = allowedExts.includes(originalExt) ? originalExt : '.png';

    // Strip base64 header if present
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Limit check: 15MB max
    if (buffer.length > 15 * 1024 * 1024) {
      res.status(400).json({ error: 'File exceeds maximum limit of 15MB.' });
      return;
    }

    const uniqueId = `soar_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanFileName = `${uniqueId}${targetExt}`;
    const targetPath = path.join(UPLOADS_DIR, cleanFileName);

    fs.writeFileSync(targetPath, buffer);

    res.json({
      url: `/uploads/${cleanFileName}`,
      fileName: cleanFileName,
      size: buffer.length,
      contentType: contentType || 'image/png',
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload image.' });
  }
});

// ======================== AI IMAGE CLASSIFICATION & ANALYSIS ========================

// AI-assisted image analysis for smart category, title, description, and tags suggestions
app.post('/api/ai/analyse-image', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { fileData, imageUrl, fileName, mimeType } = req.body;

    let base64Data = '';
    let resolvedMimeType = mimeType || 'image/png';

    if (fileData) {
      if (fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          resolvedMimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
        }
      } else {
        base64Data = fileData;
      }
    } else if (imageUrl && imageUrl.startsWith('/uploads/')) {
      const localFileName = path.basename(imageUrl);
      const localFilePath = path.join(UPLOADS_DIR, localFileName);
      if (fs.existsSync(localFilePath)) {
        const fileBuf = fs.readFileSync(localFilePath);
        base64Data = fileBuf.toString('base64');
        const ext = path.extname(localFileName).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') resolvedMimeType = 'image/jpeg';
        else if (ext === '.webp') resolvedMimeType = 'image/webp';
        else if (ext === '.gif') resolvedMimeType = 'image/gif';
        else if (ext === '.pdf') resolvedMimeType = 'application/pdf';
        else resolvedMimeType = 'image/png';
      }
    }

    if (!base64Data) {
      res.status(400).json({ error: 'No image data or valid image URL provided for AI analysis.' });
      return;
    }

    // Build context categories list from portal store
    const portalStore = getPortalStore();
    const categories = portalStore.categories || [];
    const categoriesContext = categories
      .map((c) => `- ID: "${c.id}", Nama: "${c.name}" (${c.description || ''})`)
      .join('\n');

    // Safe fallback if AI client is not available or key is absent
    if (!ai) {
      const derivedTitle = fileName
        ? path.parse(fileName).name.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Poster Hebahan Rasmi';
      res.json({
        suggestedCategory: 'general',
        suggestedTitle: derivedTitle,
        suggestedDescription: 'Poster grafik hebahan rasmi Kontinjen KPMBP SOAR 2026.',
        relevantEvent: null,
        suggestedTags: ['Poster', 'Hebahan', 'SOAR2026'],
        extractedDatesAndInstructions: '',
        verificationRequired: true,
        serviceUnavailable: true,
        message: 'Perkhidmatan AI tidak disambungkan. Sila semak atau lengkapkan butiran secara manual.',
      });
      return;
    }

    const promptText = `Anda ialah pembantu AI pintar untuk Kontinjen KPM Bandar Penawar (KPMBP) dalam festival SOAR 2026.
Tugas anda: Analisis gambar poster rasmi, jadual infografik, notis penginapan/pengangkutan, atau hebahan Telegram yang disertakan.

Kategori Acara / Saluran yang tersedia di portal:
${categoriesContext}
- ID: "general", Nama: "Pengumuman Umum / Urus Setia"
- ID: "pendaftaran", Nama: "Pendaftaran Peserta"
- ID: "jadual", Nama: "Jadual Pertandingan"
- ID: "peraturan", Nama: "Peraturan & Syarat"
- ID: "penginapan", Nama: "Penginapan & Pengangkutan"
- ID: "persediaan", Nama: "Persediaan Acara"
- ID: "lokasi", Nama: "Lokasi & Venue"
- ID: "keputusan", Nama: "Keputusan Pertandingan"
- ID: "majlis-penutupan", Nama: "Majlis Penutup"

PERATURAN PENTING (DISIPLIN INTEGRITI DATA):
1. "suggestedCategory": Pilih ID kategori paling sepadan daripada senarai di atas (cth: 'symphonic-duo', 'tarian-zapin', 'battle-of-the-bands', 'islamic-theatre', 'street-dakwah', 'penginapan', 'pengangkutan', 'jadual', atau 'general').
2. "suggestedTitle": Tajuk poster ringkas, padat & bermakna dalam Bahasa Melayu (maksimum 10 perkataan).
3. "suggestedDescription": Huraian ringkas kandungan poster dalam 1 hingga 3 ayat Bahasa Melayu.
4. "relevantEvent": Nama acara khusus jika poster berkaitan acara tertentu (cth: 'Symphonic Duo', 'Tarian Zapin'), atau null jika makluman am.
5. "suggestedTags": 2 hingga 5 tag relevan (cth: ["Jadual", "Rehearsal", "Auditorium", "Seni"]).
6. "extractedDatesAndInstructions": Sebarang tarikh, masa, lokasi atau arahan penting yang JELAS TERBACA pada poster. JANGAN sesekali mereka-reka tarikh atau maklumat yang tidak wujud dalam gambar.
7. "verificationRequired": Tetapkan true JIKA teks kabur, sebahagian terpotong, atau resolusi tidak mencukupi untuk kepastian penuh.

Berikan output dalam format JSON SAHAJA:
{
  "suggestedCategory": "string",
  "suggestedTitle": "string",
  "suggestedDescription": "string",
  "relevantEvent": "string atau null",
  "suggestedTags": ["string"],
  "extractedDatesAndInstructions": "string",
  "verificationRequired": false
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: resolvedMimeType,
              data: base64Data,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      // JSON parse fallback
      parsedResult = {};
    }

    // Sanitize and ensure safe defaults
    const result = {
      suggestedCategory: parsedResult.suggestedCategory || 'general',
      suggestedTitle: parsedResult.suggestedTitle || (fileName ? path.parse(fileName).name : 'Poster Hebahan Rasmi'),
      suggestedDescription: parsedResult.suggestedDescription || 'Hebahan visual rasmi Kontinjen KPMBP.',
      relevantEvent: parsedResult.relevantEvent || null,
      suggestedTags: Array.isArray(parsedResult.suggestedTags) ? parsedResult.suggestedTags : ['Poster', 'SOAR2026'],
      extractedDatesAndInstructions: parsedResult.extractedDatesAndInstructions || '',
      verificationRequired: Boolean(parsedResult.verificationRequired),
      serviceUnavailable: false,
    };

    res.json(result);
  } catch (err: any) {
    console.error('AI Image Analysis error:', err);
    // Graceful error fallback - NEVER crash, allow manual flow to proceed
    const fallbackTitle = req.body.fileName
      ? path.parse(req.body.fileName).name.replace(/[_-]+/g, ' ')
      : 'Poster Hebahan Rasmi';

    res.json({
      suggestedCategory: 'general',
      suggestedTitle: fallbackTitle,
      suggestedDescription: 'Poster rasmi kontinjen KPMBP SOAR 2026.',
      relevantEvent: null,
      suggestedTags: ['Poster', 'SOAR2026'],
      extractedDatesAndInstructions: '',
      verificationRequired: true,
      serviceUnavailable: true,
      message: 'Perkhidmatan AI menghadapi ralat sementara. Anda boleh melengkapkan butiran secara manual.',
    });
  }
});


// ======================== PORTAL DATA ROUTES ========================

// Read portal data (Public Read-Only, but drafts strictly hidden from non-admin)
app.get('/api/portal/data', (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const session = getSessionFromReq(req);
  const isAdmin = session?.role === 'admin';

  if (isAdmin) {
    // Admin sees all items, including drafts
    res.json(portalStore);
    return;
  }

  // Non-admins (participants/public): filter out drafts!
  const sanitizedStore: PortalStore = {
    ...portalStore,
    announcements: portalStore.announcements.filter((a) => a.status !== 'draft'),
    schedules: portalStore.schedules.filter((s) => s.status !== 'draft'),
    documents: portalStore.documents.filter((d) => d.status !== 'draft'),
    eventSections: portalStore.eventSections.filter((e) => e.status !== 'draft'),
    locations: portalStore.locations.filter((l) => l.status !== 'draft'),
  };

  res.json(sanitizedStore);
});

// Update portal settings (Admin only)
app.put('/api/portal/settings', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  portalStore.settings = { ...portalStore.settings, ...req.body };
  savePortalStore(portalStore);
  res.json(portalStore.settings);
});

// Update active operational phase (Admin only)
app.put('/api/portal/phase', requireAdmin, (req: Request, res: Response) => {
  const { activePhase } = req.body;
  if (activePhase !== 'pre-final' && activePhase !== 'during-final') {
    res.status(400).json({ error: 'Invalid phase. Must be pre-final or during-final.' });
    return;
  }
  const portalStore = getPortalStore();
  portalStore.settings.activePhase = activePhase;
  savePortalStore(portalStore);
  res.json({ activePhase: portalStore.settings.activePhase });
});

// Update SOAR Event Categories (Admin only)
app.put('/api/portal/categories', requireAdmin, (req: Request, res: Response) => {
  const { categories } = req.body;
  if (!Array.isArray(categories)) {
    res.status(400).json({ error: 'Categories must be an array.' });
    return;
  }
  const portalStore = getPortalStore();
  portalStore.categories = categories;
  savePortalStore(portalStore);
  res.json(portalStore.categories);
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

// Announcements / Telegram Messages CRUD (Admin only for mutations)
app.post('/api/portal/announcements', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const newItem = {
    id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: req.body.title || 'Hebahan SOAR 2026',
    content: req.body.content || '',
    priority: req.body.priority || 'general',
    isPinned: Boolean(req.body.isPinned),
    category: req.body.category || 'general',
    phase: req.body.phase || 'all',
    status: req.body.status || 'published',
    author: req.body.author || 'Urus Setia KPMBP',
    timestamp: new Date().toISOString(),
    imageUrl: req.body.imageUrl || '',
    imageCaption: req.body.imageCaption || '',
    externalUrl: req.body.externalUrl || '',
    externalUrlLabel: req.body.externalUrlLabel || '',
    telegramRawText: req.body.telegramRawText || '',
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    isSuperseded: Boolean(req.body.isSuperseded),
    supersededReason: req.body.supersededReason || '',
    collectionId: req.body.collectionId || '',
    collectionName: req.body.collectionName || '',
    collectionIndex: typeof req.body.collectionIndex === 'number' ? req.body.collectionIndex : undefined,
    importantDates: req.body.importantDates || '',
    verificationRequired: Boolean(req.body.verificationRequired),
    lastUpdated: new Date().toISOString(),
  };
  portalStore.announcements.unshift(newItem);
  savePortalStore(portalStore);
  res.json(newItem);
});

// Batch create announcements / posters
app.post('/api/portal/announcements/batch', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const createdItems = [];

  for (const item of items) {
    const newItem = {
      id: item.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: item.title || 'Hebahan Rasmi',
      content: item.content || item.description || '',
      priority: item.priority || 'general',
      isPinned: Boolean(item.isPinned),
      category: item.category || 'general',
      phase: item.phase || 'all',
      status: item.status || 'published',
      author: item.author || 'Urus Setia KPMBP',
      timestamp: new Date().toISOString(),
      imageUrl: item.imageUrl || '',
      imageCaption: item.imageCaption || '',
      externalUrl: item.externalUrl || '',
      externalUrlLabel: item.externalUrlLabel || '',
      telegramRawText: item.telegramRawText || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      isSuperseded: Boolean(item.isSuperseded),
      supersededReason: item.supersededReason || '',
      collectionId: item.collectionId || '',
      collectionName: item.collectionName || '',
      collectionIndex: typeof item.collectionIndex === 'number' ? item.collectionIndex : undefined,
      importantDates: item.importantDates || '',
      verificationRequired: Boolean(item.verificationRequired),
      lastUpdated: new Date().toISOString(),
    };
    portalStore.announcements.unshift(newItem);
    createdItems.push(newItem);
  }

  savePortalStore(portalStore);
  res.json({ success: true, count: createdItems.length, items: createdItems });
});

// Supersede or un-supersede an announcement/poster
app.put('/api/portal/announcements/:id/supersede', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const index = portalStore.announcements.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Announcement not found.' });
    return;
  }
  const { isSuperseded, supersededReason } = req.body;
  portalStore.announcements[index].isSuperseded = Boolean(isSuperseded);
  if (supersededReason !== undefined) {
    portalStore.announcements[index].supersededReason = supersededReason;
  }
  portalStore.announcements[index].lastUpdated = new Date().toISOString();
  savePortalStore(portalStore);
  res.json(portalStore.announcements[index]);
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
    lastUpdated: new Date().toISOString(),
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
    categoryName: req.body.categoryName || 'Kategori Acara',
    subcategory: req.body.subcategory || '',
    date: req.body.date || '',
    time: req.body.time || '',
    venue: req.body.venue || '',
    imageUrl: req.body.imageUrl || '',
    sourceDocUrl: req.body.sourceDocUrl || '',
    notes: req.body.notes || '',
    phase: req.body.phase || 'all',
    status: req.body.status || 'published',
    performanceOrder: req.body.performanceOrder || '',
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
    title: req.body.title || 'Dokumen Rujukan',
    category: req.body.category || 'general',
    description: req.body.description || '',
    fileUrl: req.body.fileUrl || '',
    fileType: req.body.fileType || 'drive',
    phase: req.body.phase || 'all',
    status: req.body.status || 'published',
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

// Event Sections CRUD (Admin only for mutations)
app.post('/api/portal/event-info', requireAdmin, (req: Request, res: Response) => {
  const portalStore = getPortalStore();
  const newItem = {
    id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: req.body.title || 'Maklumat Acara',
    category: req.body.category || 'general',
    type: req.body.type || 'rundown',
    description: req.body.description || '',
    phase: req.body.phase || 'all',
    status: req.body.status || 'published',
    items: req.body.items || [],
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
    name: req.body.name || 'Lokasi / Pergerakan',
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
    phase: req.body.phase || 'all',
    status: req.body.status || 'published',
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
    res.status(404).json({ error: 'Location not found.' });
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
    console.log(`KPMBP SOAR 2026 Contingent Hub running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
