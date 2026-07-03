export type UserRole = "SUPERADMIN" | "OWNER" | "MANAGER" | "EMPLOYEE";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthTenant = {
  id: string;
  name: string;
  accessStatus: string;
  enabledModules?: string[];
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
  tenant: AuthTenant;
  permissions: string[];
  impersonation?: {
    supportSessionId: string;
    actorUserId: string;
    actorName: string;
    tenantName: string;
  };
};

export type StoredAuth = LoginResponse & {
  accessLinkToken?: string | null;
  originalAuth?: LoginResponse | null;
};

export type TenantSettings = {
  id?: string;
  displayName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  currency: string;
  locale: string;
  timezone: string;
  allowCreditSales: boolean;
  requireCreditReason: boolean;
  allowSpecialSales: boolean;
  requireCashCloseConfirmation: boolean;
  autoGenerateMemberNumber: boolean;
  memberNumberPrefix?: string | null;
  minimumMemberAge?: number | null;
  showSecurityBadges: boolean;
  requireAccessLink: boolean;
  allowCashDiscrepancyClose: boolean;
  requireCashDiscrepancyReason: boolean;
  scaleVerificationEnabled: boolean;
  requireScaleVerification: boolean;
  maxWastePerLineGrams: number;
  maxWastePercent: number;
  scaleToleranceAction:
    | "BLOCK"
    | "REQUIRE_MANAGER_CONFIRMATION"
    | "ALLOW_WITH_WARNING";
  allowUnderWeight: boolean;
  scalePrecisionGrams: number;
  autoRegisterScaleWaste: boolean;
  scaleWasteReason: string;
  showScaleStepOnMobile: boolean;
  requireMemberPhoto: boolean;

  // Inventario
  blockDispensationIfNoStock: boolean;
  lowStockAlertEnabled: boolean;
  lowStockThresholdGrams: number;
  requireAdjustmentReason: boolean;
  requireWasteReason: boolean;
  showNegativeScaleDiff: boolean;
  inventoryDisplayUnit: string;

  // Caja
  recommendedOpeningCash?: number | null;
  alertOpenCashSessionMinutes?: number | null;

  // Apariencia
  defaultDensity: string;

  // Punto de dispensación
  quickWeightValuesGrams: string;
  showReceiptAfterSale: boolean;

  // Notificaciones del club
  notifyLowStock: boolean;
  notifyCashDiscrepancy: boolean;
  notifyHighWaste: boolean;
  notifyMemberBirthday: boolean;
  notifyHighReceivables: boolean;
  notifyEmergency: boolean;
  notifySupportActivity: boolean;
};

export type NotificationPreference = {
  notificationType: NotificationType;
  enabled: boolean;
};

export type MemberClassConfig = {
  id: string;
  tenantId: string;
  memberClass: "STANDARD" | "PREFERRED" | "VIP";
  label: string;
  description?: string | null;
  suggestedBonification: number;
  birthdayBonification: number;
  requirePhoto: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SettingsResponse = {
  tenant: AuthTenant & {
    legalName?: string | null;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    country?: string | null;
  };
  settings: TenantSettings;
};

export type UpdateSettingsInput = Partial<
  SettingsResponse["tenant"] & TenantSettings
>;

export type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export type DashboardSummary = {
  totalMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  bannedMembers: number;
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  todaySalesTotal: number;
  todaySalesCount: number;
  monthSalesTotal: number;
  monthSalesCount: number;
  openCashSessions: number;
  lastSales: Array<Record<string, unknown>>;
  lastInventoryMovements: Array<Record<string, unknown>>;
};

export type AnalyticsTopProduct = {
  productId: string;
  name: string;
  unitType?: string | null;
  quantity: number;
  totalCredits: number;
};

export type AnalyticsActivityPoint = {
  date: string;
  label: string;
  dispensations: number;
  credits: number;
};

export type AnalyticsMembersByClass = {
  memberClass: "STANDARD" | "PREFERRED" | "VIP";
  label: string;
  count: number;
};

export type AnalyticsBirthdayMember = {
  id: string;
  memberNumber: string;
  name: string;
  birthDate: string;
  memberClass: "STANDARD" | "PREFERRED" | "VIP";
};

export type AnalyticsSummary = {
  range: {
    dateFrom: string;
    dateTo: string;
  };
  totalDispensations: number;
  totalCredits: number;
  averageDispensation: number;
  activeMembers: number;
  newMembers: number;
  pendingContributions: number;
  lowInventoryCount: number;
  outOfAvailabilityCount: number;
  scaleWastePositive: number;
  scaleWasteNegative: number;
  cashExpected: number;
  cashDifference: number;
  thirdPartyContributions: number;
  topProducts: AnalyticsTopProduct[];
  activityByDay: AnalyticsActivityPoint[];
  membersByClass: AnalyticsMembersByClass[];
  birthdayMembersThisMonth: AnalyticsBirthdayMember[];
};

export type AnalyticsCollaboratorRole =
  | "OWNER"
  | "MANAGER"
  | "EMPLOYEE"
  | "SUPERADMIN";

export type AnalyticsCollaborator = {
  userId: string;
  name: string;
  role: AnalyticsCollaboratorRole;
  totalDispensations: number;
  creditsRegistered: number;
  averageDispensation: number;
  requestedGrams: number;
  actualDispensedGrams: number;
  positiveDifferenceGrams: number;
  negativeDifferenceGrams: number;
  toleranceExceededCount: number;
  bonusesApplied: number;
  pendingContributionsGenerated: number;
  cancellations: number;
  cashDifference: number;
  lastActivity: string | null;
};

export type AnalyticsCollaboratorsResponse = {
  range: {
    dateFrom: string;
    dateTo: string;
  };
  collaborators: AnalyticsCollaborator[];
};

export type NotificationType =
  | "INVENTORY_LOW"
  | "INVENTORY_OUT"
  | "SCALE_TOLERANCE_EXCEEDED"
  | "POSITIVE_WASTE_HIGH"
  | "NEGATIVE_DIFFERENCE"
  | "CASH_DIFFERENCE"
  | "CASH_OPEN_TOO_LONG"
  | "MEMBER_BIRTHDAY"
  | "MEMBER_PENDING_CONTRIBUTION"
  | "SECURITY_ALERT"
  | "EMERGENCY_ACTIVE"
  | "SYSTEM"
  | "TRIAL_EXPIRING"
  | "INVOICE_OVERDUE"
  | "SUSPENSION_WARNING"
  | "PLAN_LIMIT_WARNING";

export type NotificationPriority =
  | "INFO"
  | "WARNING"
  | "IMPORTANT"
  | "CRITICAL";

export type NotificationStatus =
  | "UNREAD"
  | "READ"
  | "IN_REVIEW"
  | "RESOLVED"
  | "ARCHIVED";

export type InternalNotification = {
  id: string;
  tenantId: string;
  userId?: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  resolvedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationsUnreadCount = {
  count: number;
};

export type Product = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unitType?: string;
  description?: string | null;
  price?: number | string;
  cost?: number | string | null;
  status?: string;
  imageUrl?: string | null;
  categoryId?: string | null;
  minimumStock?: number | string | null;
  idealStock?: number | string | null;
  allowDecimalQuantity?: boolean;
  trackStock?: boolean;
  createdAt?: string;
  updatedAt?: string;
  inventory?: {
    currentQuantity?: number | string;
    minimumQuantity?: number | string;
    maximumQuantity?: number | string | null;
    reservedQuantity?: number | string;
    lostQuantity?: number | string;
    totalStockIn?: number | string;
    totalStockOut?: number | string;
    lastMovementAt?: string | null;
  } | null;
};

export type CartPricingMode = "BY_UNIT" | "BY_WEIGHT" | "BY_AMOUNT";

export type CartItem = {
  product: Product;
  quantity: number;
  pricingMode?: CartPricingMode;
  requestedAmount?: number;
  total?: number;
  actualWeightGrams?: number;
  scaleVerified?: boolean;
  scaleToleranceExceeded?: boolean;
  scaleOverrideReason?: string;
};

export type ChatConversationType = "DIRECT" | "GROUP";
export type ChatMessageType = "TEXT" | "SYSTEM";
export type ChatParticipantRole = "OWNER" | "MEMBER";

export type ChatUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type ChatParticipant = {
  id: string;
  userId: string;
  role: ChatParticipantRole;
  muted: boolean;
  archived: boolean;
  lastReadAt?: string | null;
  user: ChatUser;
};

export type ChatMessageReaction = {
  emoji: string;
  count: number;
  userIds: string[];
  names: string[];
};

export type ChatMessageReplyPreview = {
  id: string;
  body: string;
  deleted: boolean;
  senderId?: string | null;
  senderName?: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId?: string | null;
  type: ChatMessageType;
  body: string;
  clientEncryptedPayload?: unknown;
  deleted: boolean;
  deletedAt?: string | null;
  editedAt?: string | null;
  pinnedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: ChatUser | null;
  reactions?: ChatMessageReaction[];
  mentions?: Array<{ userId: string; name: string }>;
  replyTo?: ChatMessageReplyPreview | null;
};

export type ChatConversation = {
  id: string;
  type: ChatConversationType;
  title?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage | null;
  unreadCount: number;
};

export type Member = {
  id: string;
  memberNumber?: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  profileNotes?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  photoUrl?: string | null;
  photoStorageKey?: string | null;
  status?: string;
  memberClass?: "STANDARD" | "PREFERRED" | "VIP";
  preferredContactMethod?: string | null;
  marketingConsent?: boolean;
  joinedAt?: string | null;
  lastVisitAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sales?: Array<{
    id: string;
    total: number | string;
    status: string;
    createdAt: string;
  }>;
};

export type MemberNote = {
  id: string;
  tenantId: string;
  memberId: string;
  note: string;
  visibility: "OWNER_ONLY" | "MANAGER_AND_OWNER" | "ALL_STAFF";
  createdBy?: string | null;
  createdAt: string;
};

export type IncidentType = "WARNING" | "PAYMENT_ISSUE" | "BEHAVIOR" | "DOCUMENT_ISSUE" | "BAN" | "OTHER";
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";

export type MemberIncident = {
  id: string;
  tenantId: string;
  memberId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  status: IncidentStatus;
  createdBy?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
};

export type ProductCategory = {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  _count?: { products: number };
};

export type ProductPerformance = {
  id: string;
  name: string;
  categoryId?: string | null;
  quantity: number;
  revenue: number;
  count: number;
};

export type MemberSpending = {
  id: string;
  name: string;
  memberNumber?: string | null;
  totalSpent: number;
  salesCount: number;
};

export type InventoryTrends = {
  products: Array<{
    id: string;
    name: string;
    currentStock: number;
    minimumStock: number;
    categoryId?: string | null;
    category?: { name: string } | null;
    waste30d: number;
    stockStatus: "OK" | "LOW" | "OUT_OF_STOCK";
  }>;
  summary: {
    totalProducts: number;
    outOfStock: number;
    lowStock: number;
    totalWaste30d: number;
  };
};

export type MemberClassBenefit = {
  id?: string;
  tenantId?: string;
  memberClass: "STANDARD" | "PREFERRED" | "VIP";
  discountPercent: number | string;
  birthdayBenefitEnabled: boolean;
  birthdayDiscountPercent: number | string;
  birthdayGiftNote?: string | null;
  allowSpecialCreditLimit: boolean;
  creditLimitAmount: number | string;
  notes?: string | null;
};

export type MemberSummary = {
  totalSpent: number | string;
  salesCount: number;
  averageTicket: number | string;
  lastSaleAt?: string | null;
  pendingAmount: number | string;
  recentSales: Array<{
    id: string;
    total: number | string;
    amountPaid?: number | string;
    amountPending?: number | string;
    settlementStatus?: string;
    saleType?: string;
    createdAt: string;
    items?: Array<{
      productNameSnapshot: string;
      quantity: number | string;
      total: number | string;
    }>;
  }>;
  receivables: Array<{
    id: string;
    originalAmount: number | string;
    paidAmount: number | string;
    outstandingAmount: number | string;
    status: string;
    dueDate?: string | null;
    reason?: string | null;
    createdAt: string;
    saleId?: string | null;
  }>;
};

export type InventoryItem = {
  id: string;
  productId: string;
  currentQuantity: number | string;
  minimumQuantity: number | string;
  maximumQuantity?: number | string | null;
  reservedQuantity?: number | string;
  lostQuantity?: number | string;
  totalStockIn?: number | string;
  totalStockOut?: number | string;
  lastMovementAt?: string | null;
  stockStatus?: string;
  product?: Product;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  type: string;
  quantity: number | string;
  previousQuantity?: number | string;
  newQuantity?: number | string;
  unitCost?: number | string | null;
  totalCost?: number | string | null;
  reason?: string | null;
  notes?: string | null;
  source?: string | null;
  batchCode?: string | null;
  createdAt: string;
  product?: Pick<Product, "id" | "name" | "sku" | "unitType">;
  createdBy?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
};

export type Employee = {
  tenantUserId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: "MANAGER" | "EMPLOYEE" | "OWNER" | "SUPERADMIN";
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  createdAt: string;
  lastLoginAt?: string | null;
};

export type UserPermission = {
  id: string;
  key: string;
  description?: string | null;
  module: string;
  roleDefault: boolean;
  override: boolean | null;
  effective: boolean;
};

export type AuditLog = {
  id: string;
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
};

export type ReceivableStatus =
  | "OPEN"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type ReceivablePayment = {
  id: string;
  tenantId?: string;
  receivableId: string;
  memberId: string;
  posSessionId?: string | null;
  amount: number | string;
  notes?: string | null;
  receivedById?: string;
  createdAt: string;
  receivedBy?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
};

export type Receivable = {
  id: string;
  tenantId?: string;
  memberId: string;
  saleId?: string | null;
  originalAmount: number | string;
  paidAmount: number | string;
  outstandingAmount: number | string;
  status: ReceivableStatus;
  dueDate?: string | null;
  reason?: string | null;
  createdById?: string;
  approvedById?: string | null;
  createdAt: string;
  updatedAt?: string;
  member?: Pick<
    Member,
    | "id"
    | "memberNumber"
    | "firstName"
    | "lastName"
    | "phone"
    | "email"
    | "status"
  >;
  sale?: {
    id: string;
    total: number | string;
    createdAt: string;
    settlementStatus?: string;
  } | null;
  payments?: ReceivablePayment[];
  createdBy?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
};

export type ReceivablesSummary = {
  totalOutstanding: number | string;
  openCount: number;
  partiallyPaidCount: number;
  overdueCount: number;
  collectedToday: number | string;
  createdToday: number | string;
};

export type MemberReceivablesResponse = {
  member: Pick<
    Member,
    | "id"
    | "memberNumber"
    | "firstName"
    | "lastName"
    | "phone"
    | "email"
    | "status"
  >;
  summary: {
    totalOriginalAmount: number | string;
    totalPaidAmount: number | string;
    totalOutstandingAmount: number | string;
    openCount: number;
    overdueCount: number;
  };
  receivables: Receivable[];
};

export type PayReceivableInput = {
  amount: number;
  notes?: string;
};

export type CancelReceivableInput = {
  reason: string;
};

export type ThirdPartyType =
  | "SUPPLIER"
  | "SERVICE_PROVIDER"
  | "COLLABORATOR"
  | "OTHER";

export type ThirdPartyStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type ThirdPartyPaymentCategory =
  | "SUPPLIER_PAYMENT"
  | "SERVICE_PAYMENT"
  | "COLLABORATOR_PAYMENT"
  | "CASH_WITHDRAWAL"
  | "EXPENSE"
  | "OTHER";

export type ThirdPartyPaymentStatus = "PAID" | "CANCELLED";

export type ThirdParty = {
  id: string;
  tenantId?: string;
  name: string;
  type: ThirdPartyType;
  documentNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  status: ThirdPartyStatus;
  createdById?: string | null;
  createdAt: string;
  updatedAt?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count?: {
    payments: number;
  };
};

export type ThirdPartyPayment = {
  id: string;
  tenantId?: string;
  thirdPartyId?: string | null;
  posSessionId: string;
  amount: number | string;
  category: ThirdPartyPaymentCategory;
  status: ThirdPartyPaymentStatus;
  reason: string;
  notes?: string | null;
  paidById: string;
  cancelledById?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cashMovementId?: string | null;
  createdAt: string;
  updatedAt?: string;
  thirdParty?: ThirdParty | null;
  posSession?: {
    id: string;
    openedAt?: string;
    status?: string;
  };
  paidBy?: {
    id: string;
    name: string;
    email: string;
  };
  cancelledBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type CreateThirdPartyInput = {
  name: string;
  type?: ThirdPartyType;
  documentNumber?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type UpdateThirdPartyInput = Partial<CreateThirdPartyInput> & {
  status?: ThirdPartyStatus;
};

export type CreateThirdPartyPaymentInput = {
  thirdPartyId?: string;
  amount: number;
  category?: ThirdPartyPaymentCategory;
  reason: string;
  notes?: string;
};

export type CancelThirdPartyPaymentInput = {
  reason: string;
};

export type CashMovementType =
  | "CASH_IN"
  | "CASH_OUT"
  | "CORRECTION"
  | "EXPENSE"
  | "SALE_CASH_IN"
  | "RECEIVABLE_CASH_IN"
  | "THIRD_PARTY_CASH_OUT"
  | "WITHDRAWAL"
  | "CORRECTION_IN"
  | "CORRECTION_OUT";

export type CashMovement = {
  id: string;
  tenantId?: string;
  posSessionId?: string;
  saleId?: string | null;
  type: CashMovementType;
  amount: number | string;
  reason?: string | null;
  createdById?: string;
  createdAt: string;
  posSession?: {
    id: string;
    openedAt?: string;
    status?: string;
  };
  createdBy?: {
    id?: string;
    name?: string;
    email?: string;
  };
  sale?: {
    id: string;
    total: number | string;
    createdAt: string;
  } | null;
  thirdPartyPayment?: {
    id: string;
    amount: number | string;
    category: ThirdPartyPaymentCategory;
    reason: string;
    status: ThirdPartyPaymentStatus;
    thirdParty?: Pick<ThirdParty, "id" | "name" | "type"> | null;
  } | null;
};

export type CashSummary = {
  openingCash: number | string;
  saleCashIn: number | string;
  receivableCashIn: number | string;
  manualCashIn: number | string;
  correctionsIn: number | string;
  cashOut: number | string;
  thirdPartyCashOut?: number | string;
  expenses: number | string;
  withdrawals: number | string;
  correctionsOut: number | string;
  expectedCash: number | string;
  salesTotal: number | string;
  operationsCount: number;
  receivablesCollected: number | string;
  movementsCount: number;
};

export type CashCurrentSummary = {
  session: null | {
    id: string;
    openedAt: string;
    openingCash: number | string;
    status: string;
    openedBy?: {
      id: string;
      name: string;
      email: string;
    };
  };
  summary: CashSummary;
  recentMovements: CashMovement[];
};

export type CashSessionSummary = {
  id: string;
  status: string;
  openedAt: string;
  closedAt?: string | null;
  openingCash: number | string;
  closingCash?: number | string | null;
  expectedCash?: number | string | null;
  difference?: number | string | null;
  openedBy?: {
    id: string;
    name: string;
    email: string;
  };
  closedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  summary: CashSummary;
};

export type CashSessionDetail = {
  session: PosSession & {
    openedBy?: {
      id: string;
      name: string;
      email: string;
    };
    closedBy?: {
      id: string;
      name: string;
      email: string;
    } | null;
    cashMovements?: CashMovement[];
    receivablePayments?: ReceivablePayment[];
  };
  summary: CashSummary;
};

export type CreateCashMovementInput = {
  type: CashMovementType;
  amount: number;
  reason: string;
  notes?: string;
};

export type PosSession = {
  id: string;
  openingCash: number | string;
  closingCash?: number | string | null;
  expectedCash?: number | string | null;
  difference?: number | string | null;
  closingSignature?: string | null;
  discrepancyReason?: string | null;
  status: string;
  openedAt?: string;
  closedAt?: string | null;
  sales?: Array<{
    id: string;
    memberId?: string | null;
    total: number | string;
    amountPaid?: number | string;
    amountPending?: number | string;
    settlementStatus?: string;
    saleType?: string;
    status: string;
    createdAt: string;
    member?: Pick<
      Member,
      "id" | "memberNumber" | "firstName" | "lastName"
    > | null;
    payments?: Array<{
      method: string;
      amount: number | string;
    }>;
  }>;
  cashMovements?: CashMovement[];
  cashSummary?: {
    openingCash: number | string;
    salesCashIn: number | string;
    receivableCashIn: number | string;
    cashOut: number | string;
    expectedCash: number | string;
    salesTotal: number | string;
    amountPendingTotal: number | string;
    operationsCount: number;
  };
};

export type SaleResponse = {
  id: string;
  createdAt?: string;
  member?: Pick<Member, "id" | "memberNumber" | "firstName" | "lastName">;
  items?: Array<{
    id: string;
    productId: string;
    productNameSnapshot: string;
    quantity: number | string;
    unitPrice: number | string;
    total: number | string;
    pricingMode?: CartPricingMode;
    requestedAmount?: number | string | null;
    actualWeight?: number | string | null;
    weightDifference?: number | string | null;
    wasteQuantity?: number | string | null;
    scaleVerified?: boolean;
    scaleToleranceExceeded?: boolean;
  }>;
  payments?: Array<{
    id: string;
    method: string;
    amount: number | string;
    status: string;
  }>;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  amountPaid?: number | string;
  amountPending?: number | string;
  changeDue?: number | string;
  settlementStatus?: string;
  saleType?: string;
  creditReason?: string | null;
  status: string;
  receivable?: {
    id: string;
    originalAmount?: number | string;
    outstandingAmount?: number | string;
    amountPending?: number | string;
    status: string;
    reason?: string | null;
  } | null;
};

export type SaleListItem = {
  id: string;
  tenantId: string;
  memberId: string;
  posSessionId: string;
  soldById: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  amountPaid: number | string;
  amountPending: number | string;
  settlementStatus: string;
  saleType: string;
  creditReason?: string | null;
  specialReason?: string | null;
  status: string;
  createdAt: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  member: {
    id: string;
    memberNumber: string;
    firstName?: string | null;
    lastName?: string | null;
    status: string;
  };
  soldBy: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    productNameSnapshot: string;
    quantity: number | string;
    unitPrice: number | string;
    total: number | string;
    pricingMode?: string;
    actualWeight?: number | string | null;
    wasteQuantity?: number | string | null;
    scaleVerified?: boolean;
    scaleToleranceExceeded?: boolean;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: number | string;
    status: string;
  }>;
  receivable?: {
    id: string;
    originalAmount?: number | string;
    outstandingAmount?: number | string;
    status: string;
  } | null;
};

export type TenantStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "DISABLED"
  | "ARCHIVED";
export type TenantAccessStatus = "ENABLED" | "DISABLED" | "EMERGENCY_LOCKED";
export type PlatformPlanStatus = "ACTIVE" | "ARCHIVED";
export type TenantLifecycleStage =
  | "LEAD"
  | "NEW_SIGNUP"
  | "ONBOARDING"
  | "ACTIVE_STABLE"
  | "ACTIVE_AT_RISK"
  | "SUSPENDED"
  | "CHURNED";
export type TenantRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type PlatformAccountHealth = "STABLE" | "FOLLOW_UP" | "AT_RISK" | "BLOCKED";
export type PlatformCollectionStatus = "OPEN" | "CONTACTED" | "PROMISE" | "DISPUTED" | "CLOSED";
export type PlatformAccountActivityType =
  | "NOTE"
  | "CONTACT"
  | "COLLECTION"
  | "PAYMENT"
  | "PROMISE"
  | "STATUS_CHANGE"
  | "RENEWAL";
export type OnboardingTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED";
export type TenantSubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "CANCELLED";
export type PlatformModuleStatus = "ACTIVE" | "ARCHIVED";
export type TenantModuleStatus = "ENABLED" | "DISABLED";

export type PlatformPlan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  priceMonthly: number | string;
  currency: string;
  maxUsers?: number | null;
  maxProducts?: number | null;
  features?: string[] | unknown;
  status: PlatformPlanStatus;
  createdAt: string;
  updatedAt?: string;
  modules?: Array<{
    id: string;
    planId: string;
    moduleId: string;
    module: PlatformModuleDefinition;
  }>;
  metrics?: {
    subscriptionsCount: number;
    activeSubscriptionsCount: number;
    activeTenantsCount: number;
    estimatedMonthlyRevenue: number | string;
  };
};

export type TenantSubscription = {
  id: string;
  tenantId: string;
  planId?: string | null;
  status: TenantSubscriptionStatus;
  startsAt: string;
  nextRenewalAt?: string | null;
  endsAt?: string | null;
  trialEndsAt?: string | null;
  suspendedAt?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
  plan?: PlatformPlan | null;
};

export type UpdateTenantSubscriptionInput = {
  status?: TenantSubscriptionStatus;
  startsAt?: string | null;
  nextRenewalAt?: string | null;
  trialEndsAt?: string | null;
  endsAt?: string | null;
  suspendedAt?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
};

export type PlatformSubscriptionSummary = TenantSubscription & {
  tenant: {
    id: string;
    name: string;
    legalName?: string | null;
    email?: string | null;
    city?: string | null;
    country?: string | null;
    status: TenantStatus;
    accessStatus: string;
  };
  billing: {
    openInvoicesCount: number;
    overdueInvoicesCount: number;
    overdueAmount: number;
    lastInvoiceDueAt?: string | null;
    lastPaymentAt?: string | null;
    totalPaid: number;
  };
};

export type PlatformModuleDefinition = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  category: string;
  sortOrder: number;
  status: PlatformModuleStatus;
  createdAt: string;
  updatedAt?: string;
};

export type TenantModule = {
  id: string;
  tenantId: string;
  moduleId: string;
  status: TenantModuleStatus;
  enabledAt?: string | null;
  disabledAt?: string | null;
  module: PlatformModuleDefinition;
};

export type PlatformBillingSnapshot = {
  openInvoicesCount: number;
  overdueInvoicesCount: number;
  overdueAmount: number;
  lastInvoiceDueAt?: string | null;
  lastPaymentAt?: string | null;
  totalPaid: number;
};

export type PlatformTenantSummary = {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  status: TenantStatus;
  accessStatus: string;
  lifecycleStage: TenantLifecycleStage;
  riskLevel: TenantRiskLevel;
  accountHealth: PlatformAccountHealth;
  platformNotes?: string | null;
  lastContactAt?: string | null;
  nextReviewAt?: string | null;
  onboardingStartedAt?: string | null;
  onboardingCompletedAt?: string | null;
  activatedAt?: string | null;
  accountOwnerId?: string | null;
  accountOwner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  collectionCase?: {
    id: string;
    assignedToId?: string | null;
    status: PlatformCollectionStatus;
    notes?: string | null;
    openedAt: string;
    lastContactAt?: string | null;
    nextActionAt?: string | null;
    promiseDate?: string | null;
    closedAt?: string | null;
    assignedTo?: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  createdAt: string;
  updatedAt?: string;
  usersCount: number;
  membersCount: number;
  salesCount: number;
  openCashSessions: number;
  lastActivityAt?: string | null;
  subscription?: TenantSubscription | null;
  modules?: TenantModule[];
};

export type PlatformEmergencyLock = {
  id: string;
  tenantId: string;
  status: "ACTIVE" | "RESOLVED" | string;
  reason?: string | null;
  resolutionReason?: string | null;
  activatedAt: string;
  deactivatedAt?: string | null;
  activatedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  deactivatedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  tenant: {
    id: string;
    name: string;
    legalName?: string | null;
    email?: string | null;
    city?: string | null;
    country?: string | null;
    status: TenantStatus;
    accessStatus: string;
  };
};

export type PlatformOnboardingQueueItem = {
  id: string;
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  status: TenantStatus;
  accessStatus: string;
  lifecycleStage: TenantLifecycleStage;
  riskLevel: TenantRiskLevel;
  onboardingStartedAt?: string | null;
  onboardingCompletedAt?: string | null;
  lastContactAt?: string | null;
  activatedAt?: string | null;
  accountOwnerId?: string | null;
  accountOwner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  collectionCase?: {
    id: string;
    assignedToId?: string | null;
    status: PlatformCollectionStatus;
    notes?: string | null;
    openedAt: string;
    lastContactAt?: string | null;
    nextActionAt?: string | null;
    promiseDate?: string | null;
    closedAt?: string | null;
    assignedTo?: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  createdAt: string;
  subscription?: TenantSubscription | null;
  onboardingTasks: TenantOnboardingTask[];
  primaryContact?: TenantContact | null;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    blockedTasks: number;
    inProgressTasks: number;
    completionRate: number;
  };
};

export type PlatformSummary = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  archivedTenants: number;
  totalUsers: number;
  tenantsCreatedThisMonth: number;
  openCashSessions: number;
  emergencyTenants?: number;
  tenantsWithoutOwner?: number;
  tenantsWithoutSettings?: number;
  recentTenants: PlatformTenantSummary[];
};

export type PlatformAccountActivity = {
  id: string;
  tenantId: string;
  actorUserId?: string | null;
  type: PlatformAccountActivityType;
  title: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type PlatformAccountSummary = PlatformTenantSummary & {
  billing: PlatformBillingSnapshot;
  renewalAt?: string | null;
  daysToRenewal?: number | null;
};

export type PlatformStaffOption = {
  id: string;
  name: string;
  email: string;
};

export type PlatformCollectionSummary = {
  id: string;
  tenantId: string;
  assignedToId?: string | null;
  status: PlatformCollectionStatus;
  notes?: string | null;
  openedAt: string;
  lastContactAt?: string | null;
  nextActionAt?: string | null;
  promiseDate?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  tenant: PlatformTenantSummary;
  billing: PlatformBillingSnapshot;
};

export type PlatformTenantDetail = PlatformTenantSummary & {
  settings?: TenantSettings | null;
  emergencyLocks?: PlatformEmergencyLock[];
  contacts: TenantContact[];
  onboardingTasks: TenantOnboardingTask[];
  accountActivities: PlatformAccountActivity[];
  users: Array<{
    id: string;
    role: UserRole;
    status: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      lastLoginAt?: string | null;
    };
  }>;
  metrics: {
    usersCount: number;
    membersCount: number;
    productsCount: number;
    salesCount: number;
    salesThisMonth: number | string;
    openCashSessions: number;
    receivablesOutstanding: number | string;
    status: TenantStatus;
    accessStatus: string;
    lastActivityAt?: string | null;
  };
};

export type TenantContact = {
  id: string;
  tenantId: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantOnboardingTask = {
  id: string;
  tenantId: string;
  title: string;
  description?: string | null;
  status: OnboardingTaskStatus;
  owner?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlatformTenantInput = {
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
};

export type UpdateTenantAccountInput = {
  accountOwnerId?: string | null;
  accountHealth?: PlatformAccountHealth;
  nextReviewAt?: string | null;
  platformNotes?: string | null;
  lastContactAt?: string | null;
};

export type UpdateTenantCollectionInput = {
  assignedToId?: string | null;
  status?: PlatformCollectionStatus;
  notes?: string | null;
  lastContactAt?: string | null;
  nextActionAt?: string | null;
  promiseDate?: string | null;
  closedAt?: string | null;
};

export type CreateTenantAccountActivityInput = {
  type: PlatformAccountActivityType;
  title: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateTenantWorkspaceInput = {
  lifecycleStage?: TenantLifecycleStage;
  riskLevel?: TenantRiskLevel;
  platformNotes?: string;
  lastContactAt?: string | null;
  onboardingStartedAt?: string | null;
  onboardingCompletedAt?: string | null;
  activatedAt?: string | null;
};

export type CreateTenantContactInput = {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  notes?: string;
};

export type UpdateTenantContactInput = Partial<CreateTenantContactInput>;

export type CreateTenantOnboardingTaskInput = {
  title: string;
  description?: string;
  status?: OnboardingTaskStatus;
  owner?: string;
  dueAt?: string | null;
  sortOrder?: number;
};

export type UpdateTenantOnboardingTaskInput = {
  title?: string;
  description?: string;
  status?: OnboardingTaskStatus;
  owner?: string;
  dueAt?: string | null;
  completedAt?: string | null;
  sortOrder?: number;
};

export type ConvertLeadToTenantInput = {
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  planId?: string | null;
};

export type CreatePlatformPlanInput = {
  code: string;
  name: string;
  description?: string;
  priceMonthly: number;
  currency?: string;
  maxUsers?: number;
  maxProducts?: number;
  features?: string[];
};

export type UpdatePlatformPlanInput = Partial<CreatePlatformPlanInput> & {
  status?: PlatformPlanStatus;
};

export type CreatePlatformModuleInput = {
  key: string;
  name: string;
  description?: string;
  category?: string;
  sortOrder?: number;
};

export type UpdatePlatformModuleInput = Partial<CreatePlatformModuleInput>;

export type UpdatePlatformTenantInput = Partial<
  Pick<
    CreatePlatformTenantInput,
    "name" | "legalName" | "taxId" | "email" | "phone" | "city" | "country"
  >
>;

export type PlatformAuditLog = {
  id: string;
  actorUserId?: string | null;
  tenantId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actorUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  tenant?: {
    id: string;
    name: string;
    status: TenantStatus;
  } | null;
};

export type PlatformSupportSession = {
  id: string;
  tenantId: string;
  openedById: string;
  closedById?: string | null;
  reason: string;
  status: "OPEN" | "CLOSED";
  notes?: string | null;
  openedAt: string;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  tenant?: {
    id: string;
    name: string;
    status: TenantStatus;
  } | null;
  openedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  closedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type PlatformInvoice = {
  id: string;
  tenantId: string;
  number: string;
  description?: string | null;
  amount: number | string;
  currency: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID";
  issuedAt: string;
  dueAt?: string | null;
  paidAt?: string | null;
  voidedAt?: string | null;
  tenant?: { id: string; name: string; status: TenantStatus } | null;
  payments?: Array<{
    id: string;
    amount: number | string;
    currency: string;
    method?: string | null;
    reference?: string | null;
    status: "PAID" | "REFUNDED";
    paidAt: string;
  }>;
};

export type PlatformPayment = {
  id: string;
  tenantId: string;
  invoiceId?: string | null;
  amount: number | string;
  currency: string;
  method?: string | null;
  reference?: string | null;
  status: "PAID" | "REFUNDED";
  paidAt: string;
  tenant?: { id: string; name: string; status: TenantStatus } | null;
  invoice?: {
    id: string;
    number: string;
    status: PlatformInvoice["status"];
  } | null;
};

export type OpenSupportSessionInput = {
  reason: string;
  notes?: string;
};

export type CreatePlatformInvoiceInput = {
  amount: number;
  description?: string;
  currency?: string;
  dueAt?: string | null;
};

export type UpdatePlatformInvoiceInput = {
  status?: PlatformInvoice["status"];
  description?: string;
  dueAt?: string | null;
};

export type CreatePlatformPaymentInput = {
  amount: number;
  currency?: string;
  invoiceId?: string;
  method?: string;
  reference?: string;
  paidAt?: string;
  reactivateSubscription?: boolean;
  nextRenewalAt?: string | null;
};

export type RenewTenantSubscriptionInput = {
  amount: number;
  currency?: string;
  description?: string;
  months?: number;
  dueAt?: string | null;
  markAsPaid?: boolean;
  paidAt?: string;
  method?: string;
  reference?: string;
  notes?: string;
};

export type RenewTenantSubscriptionResult = {
  invoice: PlatformInvoice;
  payment?: PlatformPayment | null;
  subscription?: TenantSubscription | null;
  nextRenewalAt: string;
};

export type CloseSupportSessionInput = {
  notes?: string;
};


