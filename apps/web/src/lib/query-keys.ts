/**
 * Centralized TanStack Query key factory.
 * Import from here instead of writing inline string arrays in hooks.
 * All keys follow hierarchical nesting so invalidateQueries({ queryKey: QK.members.all })
 * will also match QK.members.search('x') and QK.members.detail('id').
 */

export const QK = {
  // ── Members ───────────────────────────────────────────────────────────────
  members: {
    all: ['members'] as const,
    search: (q: string) => ['members', 'search', q] as const,
    detail: (id: string) => ['members', 'detail', id] as const,
    summary: (id: string) => ['members', 'summary', id] as const,
    birthdays: ['members', 'birthdays'] as const,
  },

  // ── Products ──────────────────────────────────────────────────────────────
  products: {
    all: ['products'] as const,
    categories: ['products', 'categories'] as const,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  inventory: {
    all: ['inventory'] as const,
    movements: ['inventory', 'movements'] as const,
  },

  // ── POS ───────────────────────────────────────────────────────────────────
  pos: {
    currentSession: ['pos', 'current-session'] as const,
    sales: ['pos', 'sales'] as const,
    sale: (id: string) => ['pos', 'sales', id] as const,
  },

  // ── Cash ──────────────────────────────────────────────────────────────────
  cash: {
    all: ['cash'] as const,
    currentSummary: ['cash', 'current-summary'] as const,
    movements: (filters: object) => ['cash', 'movements', filters] as const,
    sessions: (filters: object) => ['cash', 'sessions', filters] as const,
    sessionDetail: (id: string | null | undefined) => ['cash', 'sessions', id] as const,
  },

  // ── Receivables ───────────────────────────────────────────────────────────
  receivables: {
    all: ['receivables'] as const,
    list: (filters: object) => ['receivables', filters] as const,
    summary: ['receivables-summary'] as const,
    member: (memberId: string | undefined) => ['receivables', 'member', memberId] as const,
  },

  // ── Third-party payments ──────────────────────────────────────────────────
  thirdPartyPayments: {
    all: ['third-party-payments'] as const,
    list: (filters: object) => ['third-party-payments', filters] as const,
  },

  // ── Third parties (vendors) ───────────────────────────────────────────────
  thirdParties: {
    all: ['third-parties'] as const,
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    all: ['settings'] as const,
  },

  // ── Security ──────────────────────────────────────────────────────────────
  security: {
    all: ['security'] as const,
    emergencyStatus: ['security', 'emergency-status'] as const,
    accessLink: ['security', 'access-link'] as const,
  },

  // ── Chat ──────────────────────────────────────────────────────────────────
  chat: {
    all: ['chat'] as const,
    conversations: ['chat', 'conversations'] as const,
    collaborators: ['chat', 'collaborators'] as const,
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
    deviceKeys: ['chat', 'device-keys'] as const,
    conversationDeviceKeys: (conversationId: string) =>
      ['chat', 'conversation-device-keys', conversationId] as const,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    all: ['notifications'] as const,
    list: (filters: object) => ['notifications', filters] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    all: ['dashboard'] as const,
    summary: ['dashboard', 'summary'] as const,
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: {
    all: ['analytics'] as const,
    summary: (filters: object) => ['analytics', 'summary', filters] as const,
    collaborators: (filters: object) => ['analytics', 'collaborators', filters] as const,
  },

  // ── Audit ─────────────────────────────────────────────────────────────────
  audit: {
    all: ['audit'] as const,
    securityLogs: (take: number) => ['audit', 'security-logs', take] as const,
  },

  // ── Profile (current user) ────────────────────────────────────────────────
  profile: {
    me: ['profile', 'me'] as const,
    notificationPreferences: ['profile', 'notification-preferences'] as const,
    sessions: ['profile', 'sessions'] as const,
  },

  // ── Member class configs ──────────────────────────────────────────────────
  memberClasses: {
    all: ['member-classes'] as const,
  },

  // ── Platform admin ────────────────────────────────────────────────────────
  platform: {
    all: ['platform'] as const,
    summary: ['platform', 'summary'] as const,
    tenants: (filters: object) => ['platform', 'tenants', filters] as const,
    tenant: (id: string | undefined) => ['platform', 'tenant', id] as const,
    audit: (filters: object) => ['platform', 'audit', filters] as const,
    emergencies: (filters: object) => ['platform', 'emergencies', filters] as const,
    plans: ['platform', 'plans'] as const,
    modules: ['platform', 'modules'] as const,
    support: (filters: object) => ['platform', 'support', filters] as const,
    billingInvoices: (filters: object) => ['platform', 'billing', 'invoices', filters] as const,
    billingPayments: (filters: object) => ['platform', 'billing', 'payments', filters] as const,
  },
} as const;
