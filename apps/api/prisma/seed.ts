import {
  CashMovementType,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  InventoryMovementType,
  MemberClass,
  MemberNoteVisibility,
  MemberStatus,
  PrismaClient,
  OnboardingTaskStatus,
  PaymentMethod,
  PaymentStatus,
  PlatformAccountActivityType,
  PlatformAccountHealth,
  PlatformCollectionStatus,
  PlatformInvoiceStatus,
  PlatformPaymentStatus,
  PosSessionStatus,
  ProductStatus,
  ReceivableStatus,
  SaleStatus,
  SaleType,
  SettlementStatus,
  ThirdPartyPaymentCategory,
  ThirdPartyPaymentStatus,
  ThirdPartyType,
  UserRole,
  TenantStatus,
  TenantAccessStatus,
  TenantLifecycleStage,
  TenantRiskLevel,
  TenantSubscriptionStatus,
  UnitType,
  UserStatus,
  TenantUserStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const permissions = [
  // Plataforma / Superadmin
  { key: "tenants.create", module: "tenants", description: "Crear clubes" },
  { key: "tenants.read", module: "tenants", description: "Ver clubes" },
  { key: "tenants.update", module: "tenants", description: "Editar clubes" },
  { key: "tenants.disable", module: "tenants", description: "Desactivar clubes" },
  { key: "platform.dashboard.view", module: "platform", description: "Ver panel SaaS" },
  { key: "platform.tenants.view", module: "platform", description: "Ver empresas SaaS" },
  { key: "platform.tenants.create", module: "platform", description: "Crear empresas SaaS" },
  { key: "platform.tenants.update", module: "platform", description: "Editar empresas SaaS" },
  { key: "platform.tenants.suspend", module: "platform", description: "Suspender/reactivar empresas SaaS" },
  { key: "platform.tenants.archive", module: "platform", description: "Archivar empresas SaaS" },
  { key: "platform.plans.view", module: "platform", description: "Ver planes SaaS" },
  { key: "platform.plans.create", module: "platform", description: "Crear planes SaaS" },
  { key: "platform.plans.update", module: "platform", description: "Editar planes SaaS" },
  { key: "platform.plans.archive", module: "platform", description: "Archivar planes SaaS" },
  { key: "platform.modules.view", module: "platform", description: "Ver módulos SaaS" },
  { key: "platform.modules.update", module: "platform", description: "Gestionar módulos por empresa" },
  { key: "platform.support.view", module: "platform", description: "Ver sesiones de soporte SaaS" },
  { key: "platform.support.manage", module: "platform", description: "Abrir y cerrar sesiones de soporte SaaS" },
  { key: "platform.support.impersonate", module: "platform", description: "Iniciar impersonation auditada de soporte" },
  { key: "platform.billing.view", module: "platform", description: "Ver facturación de plataforma" },
  { key: "platform.billing.manage", module: "platform", description: "Gestionar facturas y pagos de plataforma" },
  { key: "platform.collections.view", module: "platform", description: "Ver recobro SaaS" },
  { key: "platform.collections.manage", module: "platform", description: "Gestionar recobro SaaS" },
  { key: "platform.accounts.view", module: "platform", description: "Ver cartera SaaS" },
  { key: "platform.accounts.manage", module: "platform", description: "Gestionar cartera SaaS" },
  { key: "platform.emergency.view", module: "platform", description: "Ver emergencias de empresas" },
  { key: "platform.emergency.manage", module: "platform", description: "Resolver emergencias de empresas" },
  { key: "platform.audit.view", module: "platform", description: "Ver auditoría de plataforma" },

  // Dashboard
  { key: "dashboard.view", module: "dashboard", description: "Ver dashboard completo" },
  { key: "dashboard.view_limited", module: "dashboard", description: "Ver dashboard limitado" },

  // Socios
  { key: "members.create", module: "members", description: "Crear socios" },
  { key: "members.read", module: "members", description: "Ver socios" },
  { key: "members.read_basic", module: "members", description: "Ver datos básicos de socios" },
  { key: "members.update", module: "members", description: "Editar socios" },
  { key: "members.block", module: "members", description: "Bloquear o suspender socios" },
  { key: "members.class.update", module: "members", description: "Cambiar clase de socio" },
  { key: "members.photo.view", module: "members", description: "Ver foto de socio" },
  { key: "members.photo.upload", module: "members", description: "Subir foto de socio" },
  { key: "members.photo.remove", module: "members", description: "Quitar foto de socio" },
  { key: "members.benefits.view", module: "members", description: "Ver beneficios de socios" },
  { key: "members.benefits.manage", module: "members", description: "Gestionar beneficios de socios" },

  // Notas e incidencias de socios
  { key: "member_notes.create", module: "members", description: "Crear notas internas de socios" },
  { key: "member_notes.read", module: "members", description: "Ver notas internas de socios" },
  { key: "member_incidents.create", module: "members", description: "Crear incidencias de socios" },
  { key: "member_incidents.read", module: "members", description: "Ver incidencias de socios" },
  { key: "member_incidents.resolve", module: "members", description: "Resolver incidencias de socios" },

  // Productos
  { key: "products.create", module: "products", description: "Crear productos" },
  { key: "products.read", module: "products", description: "Ver productos" },
  { key: "products.read_basic", module: "products", description: "Ver productos básicos" },
  { key: "products.update", module: "products", description: "Editar productos" },
  { key: "products.archive", module: "products", description: "Archivar productos" },
  { key: "products.view_cost", module: "products", description: "Ver coste de productos" },

  // Categorías
  { key: "product_categories.create", module: "products", description: "Crear categorías" },
  { key: "product_categories.read", module: "products", description: "Ver categorías" },
  { key: "product_categories.update", module: "products", description: "Editar categorías" },

  // Stock
  { key: "stock.read", module: "stock", description: "Ver stock completo" },
  { key: "stock.read_basic", module: "stock", description: "Ver stock básico" },
  { key: "stock.add", module: "stock", description: "Añadir stock" },
  { key: "stock.adjust", module: "stock", description: "Ajustar stock" },
  { key: "stock.movements.read", module: "stock", description: "Ver movimientos de stock" },

  // TPV
  { key: "pos.sell", module: "pos", description: "Realizar ventas/aportaciones en TPV" },
  { key: "pos.cancel", module: "pos", description: "Cancelar ventas/aportaciones" },
  { key: "pos.refund", module: "pos", description: "Realizar devoluciones" },
  { key: "pos.discount", module: "pos", description: "Aplicar descuentos" },
  { key: "pos.history.read", module: "pos", description: "Ver historial del TPV" },
  { key: "pos.scale.verify", module: "pos", description: "Verificar peso real en báscula" },
  { key: "pos.scale.override", module: "pos", description: "Autorizar tolerancias de báscula" },

  // Caja
  { key: "cash.open", module: "cash", description: "Abrir caja" },
  { key: "cash.close", module: "cash", description: "Cerrar caja" },
  { key: "cash.view", module: "cash", description: "Ver caja completa" },
  { key: "cash.view_own", module: "cash", description: "Ver su propia caja" },
  { key: "cash.summary.view", module: "cash", description: "Ver resumen de caja" },
  { key: "cash.sessions.view", module: "cash", description: "Ver sesiones de caja" },
  { key: "cash.movements.view", module: "cash", description: "Ver movimientos de caja" },
  { key: "cash.movements.create", module: "cash", description: "Crear movimientos de caja" },
  { key: "cash.withdraw", module: "cash", description: "Registrar retiradas de caja" },
  { key: "cash.expense", module: "cash", description: "Registrar gastos de caja" },
  { key: "cash.correction", module: "cash", description: "Registrar correcciones de caja" },

  // Cuentas pendientes / fiados
  { key: "credit.view", module: "credit", description: "Ver cuentas pendientes" },
  { key: "credit.create", module: "credit", description: "Crear cuentas pendientes" },
  { key: "credit.collect", module: "credit", description: "Cobrar cuentas pendientes" },
  { key: "credit.approve", module: "credit", description: "Aprobar cuentas pendientes" },
  { key: "credit.cancel", module: "credit", description: "Cancelar cuentas pendientes" },

  // Terceros / proveedores
  { key: "third_party.view", module: "third_party", description: "Ver terceros y proveedores" },
  { key: "third_party.create", module: "third_party", description: "Crear terceros y proveedores" },
  { key: "third_party.update", module: "third_party", description: "Editar terceros y proveedores" },
  { key: "third_party.archive", module: "third_party", description: "Archivar terceros y proveedores" },
  { key: "third_party_payment.view", module: "third_party_payment", description: "Ver pagos a terceros" },
  { key: "third_party_payment.create", module: "third_party_payment", description: "Registrar pagos a terceros" },
  { key: "third_party_payment.cancel", module: "third_party_payment", description: "Cancelar pagos a terceros" },

  // Reportes y estadísticas
  { key: "reports.view", module: "reports", description: "Ver estadísticas completas" },
  { key: "reports.view_limited", module: "reports", description: "Ver estadísticas limitadas" },
  { key: "reports.export", module: "reports", description: "Exportar reportes" },
  { key: "analytics.collaborators.view", module: "dashboard", description: "Ver rendimiento operativo por colaborador" },

  // Centro de avisos
  { key: "notifications.view", module: "notifications", description: "Ver centro de avisos interno" },
  { key: "notifications.manage", module: "notifications", description: "Archivar avisos internos" },
  { key: "notifications.resolve", module: "notifications", description: "Resolver avisos internos" },

  // Usuarios del club
  { key: "users.create", module: "users", description: "Crear empleados" },
  { key: "users.read", module: "users", description: "Ver empleados" },
  { key: "users.update", module: "users", description: "Editar empleados" },
  { key: "users.disable", module: "users", description: "Desactivar empleados" },
  { key: "users.permissions.update", module: "users", description: "Modificar permisos de empleados" },

  // Chat interno
  { key: "chat.view", module: "chat", description: "Ver chat interno" },
  { key: "chat.send", module: "chat", description: "Enviar mensajes en chat interno" },
  { key: "chat.create", module: "chat", description: "Crear conversaciones de chat interno" },
  { key: "chat.manage", module: "chat", description: "Gestionar conversaciones de chat interno" },

  // Configuración del club
  { key: "settings.read", module: "settings", description: "Ver configuración del club" },
  { key: "settings.update", module: "settings", description: "Editar configuración del club" },
  { key: "settings.scale.update", module: "settings", description: "Editar configuración de báscula" },

  // Seguridad
  { key: "access.regenerate", module: "security", description: "Regenerar enlace de acceso" },
  { key: "emergency.view", module: "security", description: "Ver estado de emergencia" },
  { key: "emergency.activate", module: "security", description: "Activar modo emergencia" },
  { key: "emergency.disable", module: "security", description: "Desactivar modo emergencia" },

  // Auditoría
  { key: "audit.read", module: "audit", description: "Ver auditoría del club" },
  { key: "audit.read_global", module: "audit", description: "Ver auditoría global" },

  // Soporte
  { key: "support.access", module: "support", description: "Acceso técnico de soporte" },

  // Actividad propia
  { key: "own_activity.read", module: "activity", description: "Ver su propia actividad" },
  { key: "member_app.view", module: "member_app", description: "Ver Portal del Socio" },
  { key: "member_app.manage", module: "member_app", description: "Gestionar configuracion del Portal del Socio" },
  { key: "member_app.points.view", module: "member_app", description: "Ver puntos del Portal del Socio" },
  { key: "member_app.points.adjust", module: "member_app", description: "Ajustar puntos del Portal del Socio" },
  { key: "member_app.games.manage", module: "member_app", description: "Gestionar juegos del Portal del Socio" },
  { key: "member_app.missions.manage", module: "member_app", description: "Gestionar misiones del Portal del Socio" },
  { key: "member_app.rewards.manage", module: "member_app", description: "Gestionar recompensas del Portal del Socio" },
  { key: "member_app.redemptions.review", module: "member_app", description: "Revisar canjes del Portal del Socio" },
];

const rolePermissions: Record<UserRole, string[]> = {
  SUPERADMIN: [
    "tenants.create",
    "tenants.read",
    "tenants.update",
    "tenants.disable",
    "access.regenerate",
    "emergency.disable",
    "audit.read_global",
    "support.access",
    "platform.dashboard.view",
    "platform.tenants.view",
    "platform.tenants.create",
    "platform.tenants.update",
    "platform.tenants.suspend",
    "platform.tenants.archive",
    "platform.plans.view",
    "platform.plans.create",
    "platform.plans.update",
    "platform.plans.archive",
    "platform.modules.view",
    "platform.modules.update",
    "platform.support.view",
    "platform.support.manage",
    "platform.support.impersonate",
    "platform.billing.view",
    "platform.billing.manage",
    "platform.collections.view",
    "platform.collections.manage",
    "platform.accounts.view",
    "platform.accounts.manage",
    "platform.emergency.view",
    "platform.emergency.manage",
    "platform.audit.view",
  ],

  OWNER: [
    "dashboard.view",

    "members.create",
    "members.read",
    "members.read_basic",
    "members.update",
    "members.block",
    "members.class.update",
    "members.photo.view",
    "members.photo.upload",
    "members.photo.remove",
    "members.benefits.view",
    "members.benefits.manage",

    "member_notes.create",
    "member_notes.read",
    "member_incidents.create",
    "member_incidents.read",
    "member_incidents.resolve",

    "products.create",
    "products.read",
    "products.read_basic",
    "products.update",
    "products.archive",
    "products.view_cost",

    "product_categories.create",
    "product_categories.read",
    "product_categories.update",

    "stock.read",
    "stock.read_basic",
    "stock.add",
    "stock.adjust",
    "stock.movements.read",

    "pos.sell",
    "pos.cancel",
    "pos.refund",
    "pos.discount",
    "pos.history.read",
    "pos.scale.verify",
    "pos.scale.override",

    "cash.open",
    "cash.close",
    "cash.view",
    "cash.view_own",
    "cash.summary.view",
    "cash.sessions.view",
    "cash.movements.view",
    "cash.movements.create",
    "cash.withdraw",
    "cash.expense",
    "cash.correction",

    "credit.view",
    "credit.create",
    "credit.collect",
    "credit.approve",
    "credit.cancel",

    "third_party.view",
    "third_party.create",
    "third_party.update",
    "third_party.archive",
    "third_party_payment.view",
    "third_party_payment.create",
    "third_party_payment.cancel",

    "reports.view",
    "reports.view_limited",
    "reports.export",
    "analytics.collaborators.view",
    "notifications.view",
    "notifications.manage",
    "notifications.resolve",

    "users.create",
    "users.read",
    "users.update",
    "users.disable",
    "users.permissions.update",

    "chat.view",
    "chat.send",
    "chat.create",
    "chat.manage",

    "settings.read",
    "settings.update",
    "settings.scale.update",
    "member_app.view",
    "member_app.manage",
    "member_app.points.view",
    "member_app.points.adjust",
    "member_app.games.manage",
    "member_app.missions.manage",
    "member_app.rewards.manage",
    "member_app.redemptions.review",

    "access.regenerate",
    "emergency.view",
    "emergency.activate",

    "audit.read",
    "own_activity.read",
  ],

  MANAGER: [
    "dashboard.view_limited",

    "members.create",
    "members.read",
    "members.read_basic",
    "members.update",
    "members.block",
    "members.class.update",
    "members.photo.view",
    "members.photo.upload",
    "members.photo.remove",
    "members.benefits.view",
    "members.benefits.manage",

    "member_notes.create",
    "member_notes.read",
    "member_incidents.create",
    "member_incidents.read",
    "member_incidents.resolve",

    "products.read",
    "products.read_basic",
    "products.update",

    "product_categories.read",

    "stock.read",
    "stock.read_basic",
    "stock.add",
    "stock.adjust",
    "stock.movements.read",

    "pos.sell",
    "pos.cancel",
    "pos.discount",
    "pos.history.read",
    "pos.scale.verify",
    "pos.scale.override",

    "cash.open",
    "cash.close",
    "cash.view",
    "cash.view_own",
    "cash.summary.view",
    "cash.sessions.view",
    "cash.movements.view",
    "cash.movements.create",
    "cash.withdraw",
    "cash.expense",

    "credit.view",
    "credit.create",
    "credit.collect",

    "third_party.view",
    "third_party.create",
    "third_party.update",
    "third_party_payment.view",
    "third_party_payment.create",

    "reports.view_limited",
    "analytics.collaborators.view",
    "notifications.view",
    "notifications.manage",
    "notifications.resolve",
    "member_app.view",
    "member_app.games.manage",
    "member_app.missions.manage",
    "member_app.rewards.manage",
    "member_app.redemptions.review",
    "member_app.points.view",
    "member_app.points.adjust",

    "chat.view",
    "chat.send",
    "chat.create",
    "chat.manage",

    "emergency.view",
    "emergency.activate",
    "pos.scale.verify",
    "pos.scale.override",
    "settings.scale.update",

    "own_activity.read",
  ],

  EMPLOYEE: [
    "members.read_basic",
    "members.photo.view",
    "products.read_basic",
    "stock.read_basic",
    "pos.sell",
    "pos.scale.verify",
    "cash.open",
    "cash.close",
    "cash.view_own",
    "cash.summary.view",
    "credit.collect",
    "chat.view",
    "chat.send",
    "chat.create",
    "own_activity.read",
  ],
};

async function seedPlatformPlans() {
  await prisma.platformPlan.upsert({
    where: { code: "starter" },
    update: {
      name: "Starter",
      description: "Plan inicial para clubes pequeños.",
      priceMonthly: 49,
      currency: "EUR",
      maxUsers: 5,
      maxProducts: 100,
      features: ["TPV", "Caja", "Socios", "Inventario básico"],
      status: "ACTIVE",
    },
    create: {
      code: "starter",
      name: "Starter",
      description: "Plan inicial para clubes pequeños.",
      priceMonthly: 49,
      currency: "EUR",
      maxUsers: 5,
      maxProducts: 100,
      features: ["TPV", "Caja", "Socios", "Inventario básico"],
      status: "ACTIVE",
    },
  });

  await prisma.platformPlan.upsert({
    where: { code: "pro" },
    update: {
      name: "Pro",
      description: "Plan completo para clubes con más operativa.",
      priceMonthly: 99,
      currency: "EUR",
      maxUsers: 15,
      maxProducts: 500,
      features: ["TPV", "Caja", "Socios", "Inventario", "Auditoría", "Seguridad"],
      status: "ACTIVE",
    },
    create: {
      code: "pro",
      name: "Pro",
      description: "Plan completo para clubes con más operativa.",
      priceMonthly: 99,
      currency: "EUR",
      maxUsers: 15,
      maxProducts: 500,
      features: ["TPV", "Caja", "Socios", "Inventario", "Auditoría", "Seguridad"],
      status: "ACTIVE",
    },
  });
}

async function seedPlatformModules() {
  const modules = [
    { key: "dashboard", name: "Dashboard", category: "General", sortOrder: 10, description: "Resumen de actividad y estado general del club." },
    { key: "notifications", name: "Centro de avisos", category: "General", sortOrder: 15, description: "Avisos internos, alertas de inventario, caja y socios." },
    { key: "pos", name: "Punto de dispensación", category: "Operativa", sortOrder: 20, description: "Dispensaciones, báscula y comprobantes." },
    { key: "cash", name: "Caja", category: "Operativa", sortOrder: 30, description: "Sesiones, cierres y movimientos de caja." },
    { key: "chat", name: "Chat interno", category: "Operativa", sortOrder: 35, description: "Mensajería privada interna del club." },
    { key: "members", name: "Socios", category: "CRM", sortOrder: 40, description: "Gestión de socios, clases y beneficios." },
    { key: "products", name: "Productos", category: "Inventario", sortOrder: 50, description: "Catálogo de productos del club." },
    { key: "inventory", name: "Inventario", category: "Inventario", sortOrder: 60, description: "Inventario disponible, ajustes y mermas." },
    { key: "receivables", name: "Cuentas pendientes", category: "Finanzas", sortOrder: 70, description: "Aportaciones pendientes de socios." },
    { key: "third_party_payments", name: "Aportaciones a terceros", category: "Finanzas", sortOrder: 80, description: "Aportaciones a terceros y colaboradores." },
    { key: "analytics", name: "Analítica", category: "Control", sortOrder: 85, description: "Informes de actividad, rendimiento y colaboradores." },
    { key: "users", name: "Colaboradores", category: "Administración", sortOrder: 90, description: "Colaboradores, roles y accesos." },
    { key: "audit", name: "Auditoría", category: "Control", sortOrder: 100, description: "Registro de acciones del club." },
    { key: "security", name: "Seguridad", category: "Administración", sortOrder: 110, description: "Access link, modo emergencia y control de acceso." },
    { key: "settings", name: "Configuración", category: "Administración", sortOrder: 120, description: "Ajustes generales del club." },
  ];

  for (const module of modules) {
    await prisma.platformModuleDefinition.upsert({
      where: { key: module.key },
      update: {
        name: module.name,
        description: module.description,
        category: module.category,
        sortOrder: module.sortOrder,
        status: "ACTIVE",
      },
      create: {
        ...module,
        status: "ACTIVE",
      },
    });
  }
}

async function seedPlanModules() {
  const modules = await prisma.platformModuleDefinition.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, key: true },
  });
  const plans = await prisma.platformPlan.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true },
  });

  const moduleIdsByKey = new Map(modules.map((module) => [module.key, module.id]));
  const starterKeys = ["dashboard", "notifications", "pos", "cash", "members", "products", "inventory", "chat", "settings", "member_app"];
  const proKeys = modules.map((module) => module.key);

  for (const plan of plans) {
    const keys = plan.code === "starter" ? starterKeys : plan.code === "pro" ? proKeys : [];
    if (!keys.length) continue;

    await prisma.platformPlanModule.deleteMany({ where: { planId: plan.id } });
    for (const key of keys) {
      const moduleId = moduleIdsByKey.get(key);
      if (!moduleId) continue;
      await prisma.platformPlanModule.create({
        data: {
          planId: plan.id,
          moduleId,
        },
      });
    }
  }
}

async function enableModulesForTenant(tenantId: string, moduleIds: string[]) {
  for (const moduleId of moduleIds) {
    await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleId: {
          tenantId,
          moduleId,
        },
      },
      update: {
        status: "ENABLED",
        enabledAt: new Date(),
        disabledAt: null,
      },
      create: {
        tenantId,
        moduleId,
        status: "ENABLED",
        enabledAt: new Date(),
      },
    });
  }
}

async function seedDemoData() {
  console.log("Creating demo tenants and users...");

  const passwordHashOwner = await bcrypt.hash("Owner123!", 10);
  const passwordHashEmployee = await bcrypt.hash("Employee123!", 10);
  const passwordHashSuperadmin = await bcrypt.hash("Superadmin123!", 10);

  const platformTenant = await prisma.tenant.upsert({
    where: {
      id: "platform-admin-001",
    },
    update: {
      name: "Cannaclub Platform",
      status: TenantStatus.ACTIVE,
      accessStatus: TenantAccessStatus.ENABLED,
    },
    create: {
      id: "platform-admin-001",
      name: "Cannaclub Platform",
      legalName: "Cannaclub Platform",
      email: "platform@cannaclub.local",
      city: "Santa Cruz de Tenerife",
      country: "ES",
      status: TenantStatus.ACTIVE,
      accessStatus: TenantAccessStatus.ENABLED,
    },
  });

  const superadmin = await prisma.user.upsert({
    where: {
      email: "superadmin@demo.com",
    },
    update: {
      name: "Superadmin Demo",
      passwordHash: passwordHashSuperadmin,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Superadmin Demo",
      email: "superadmin@demo.com",
      passwordHash: passwordHashSuperadmin,
      status: UserStatus.ACTIVE,
    },
  });

  const platformOps = await prisma.user.upsert({
    where: {
      email: "ops@demo.com",
    },
    update: {
      name: "Paula Ops",
      passwordHash: passwordHashEmployee,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Paula Ops",
      email: "ops@demo.com",
      passwordHash: passwordHashEmployee,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: platformTenant.id,
        userId: superadmin.id,
      },
    },
    update: {
      role: UserRole.SUPERADMIN,
      status: TenantUserStatus.ACTIVE,
    },
    create: {
      tenantId: platformTenant.id,
      userId: superadmin.id,
      role: UserRole.SUPERADMIN,
      status: TenantUserStatus.ACTIVE,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: platformTenant.id,
        userId: platformOps.id,
      },
    },
    update: {
      role: UserRole.SUPERADMIN,
      status: TenantUserStatus.ACTIVE,
    },
    create: {
      tenantId: platformTenant.id,
      userId: platformOps.id,
      role: UserRole.SUPERADMIN,
      status: TenantUserStatus.ACTIVE,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: {
      id: "demo-club-001",
    },
    update: {
      name: "Club Demo Tenerife",
      status: TenantStatus.ACTIVE,
      accessStatus: TenantAccessStatus.ENABLED,
    },
    create: {
      id: "demo-club-001",
      name: "Club Demo Tenerife",
      legalName: "Club Demo Tenerife Asociacion",
      taxId: "DEMO123456",
      email: "clubdemo@example.com",
      phone: "600000000",
      city: "Santa Cruz de Tenerife",
      country: "ES",
      status: TenantStatus.ACTIVE,
      accessStatus: TenantAccessStatus.ENABLED,
    },
  });

  const owner = await prisma.user.upsert({
    where: {
      email: "owner@demo.com",
    },
    update: {
      name: "Dueno Demo",
      passwordHash: passwordHashOwner,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Dueno Demo",
      email: "owner@demo.com",
      passwordHash: passwordHashOwner,
      status: UserStatus.ACTIVE,
    },
  });

  const employee = await prisma.user.upsert({
    where: {
      email: "employee@demo.com",
    },
    update: {
      name: "Empleado Demo",
      passwordHash: passwordHashEmployee,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Empleado Demo",
      email: "employee@demo.com",
      passwordHash: passwordHashEmployee,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: owner.id,
      },
    },
    update: {
      role: UserRole.OWNER,
      status: TenantUserStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      role: UserRole.OWNER,
      status: TenantUserStatus.ACTIVE,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: employee.id,
      },
    },
    update: {
      role: UserRole.EMPLOYEE,
      status: TenantUserStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      userId: employee.id,
      role: UserRole.EMPLOYEE,
      status: TenantUserStatus.ACTIVE,
    },
  });

  const activeModules = await prisma.platformModuleDefinition.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, key: true },
  });
  const starterPlan = await prisma.platformPlan.findUnique({
    where: { code: "starter" },
    select: { id: true },
  });
  const proPlan = await prisma.platformPlan.findUnique({
    where: { code: "pro" },
    select: { id: true },
  });

  await enableModulesForTenant(
    tenant.id,
    activeModules.map((module) => module.id),
  );

  const startsAt = new Date();
  const nextRenewalAt = new Date(startsAt);
  nextRenewalAt.setMonth(nextRenewalAt.getMonth() + 1);

  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      planId: starterPlan?.id ?? null,
      status: TenantSubscriptionStatus.ACTIVE,
      startsAt,
      nextRenewalAt,
      trialEndsAt: null,
      endsAt: null,
      suspendedAt: null,
      cancelledAt: null,
      notes: "Suscripcion demo activa con gestion manual de cobro.",
    },
    create: {
      tenantId: tenant.id,
      planId: starterPlan?.id ?? null,
      status: TenantSubscriptionStatus.ACTIVE,
      startsAt,
      nextRenewalAt,
      notes: "Suscripcion demo activa con gestion manual de cobro.",
    },
  });

  await prisma.memberClassBenefit.upsert({
    where: {
      tenantId_memberClass: {
        tenantId: tenant.id,
        memberClass: MemberClass.STANDARD,
      },
    },
    update: {
      discountPercent: 0,
      birthdayBenefitEnabled: false,
      birthdayDiscountPercent: 0,
      allowSpecialCreditLimit: false,
      creditLimitAmount: 0,
      notes: "Clase base demo.",
    },
    create: {
      tenantId: tenant.id,
      memberClass: MemberClass.STANDARD,
      discountPercent: 0,
      birthdayBenefitEnabled: false,
      birthdayDiscountPercent: 0,
      allowSpecialCreditLimit: false,
      creditLimitAmount: 0,
      notes: "Clase base demo.",
    },
  });

  await prisma.memberClassBenefit.upsert({
    where: {
      tenantId_memberClass: {
        tenantId: tenant.id,
        memberClass: MemberClass.PREFERRED,
      },
    },
    update: {
      discountPercent: 5,
      birthdayBenefitEnabled: true,
      birthdayDiscountPercent: 10,
      allowSpecialCreditLimit: true,
      creditLimitAmount: 60,
      notes: "Beneficios intermedios para testing.",
    },
    create: {
      tenantId: tenant.id,
      memberClass: MemberClass.PREFERRED,
      discountPercent: 5,
      birthdayBenefitEnabled: true,
      birthdayDiscountPercent: 10,
      allowSpecialCreditLimit: true,
      creditLimitAmount: 60,
      notes: "Beneficios intermedios para testing.",
    },
  });

  await prisma.memberClassBenefit.upsert({
    where: {
      tenantId_memberClass: {
        tenantId: tenant.id,
        memberClass: MemberClass.VIP,
      },
    },
    update: {
      discountPercent: 10,
      birthdayBenefitEnabled: true,
      birthdayDiscountPercent: 15,
      allowSpecialCreditLimit: true,
      creditLimitAmount: 120,
      notes: "Clase premium para testing.",
    },
    create: {
      tenantId: tenant.id,
      memberClass: MemberClass.VIP,
      discountPercent: 10,
      birthdayBenefitEnabled: true,
      birthdayDiscountPercent: 15,
      allowSpecialCreditLimit: true,
      creditLimitAmount: 120,
      notes: "Clase premium para testing.",
    },
  });

  const memberAna = await prisma.member.upsert({
    where: {
      tenantId_memberNumber: {
        tenantId: tenant.id,
        memberNumber: "SOC-001",
      },
    },
    update: {
      firstName: "Ana",
      lastName: "Perez",
      displayName: "Ana Perez",
      documentType: "DNI",
      documentNumber: "11111111A",
      birthDate: new Date("1990-03-15T00:00:00.000Z"),
      phone: "600123001",
      email: "ana.demo@club.local",
      city: "Santa Cruz de Tenerife",
      status: MemberStatus.ACTIVE,
      memberClass: MemberClass.STANDARD,
      joinedAt: new Date("2026-04-10T09:00:00.000Z"),
      lastVisitAt: new Date("2026-06-22T18:30:00.000Z"),
      createdById: owner.id,
      updatedById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      memberNumber: "SOC-001",
      firstName: "Ana",
      lastName: "Perez",
      displayName: "Ana Perez",
      documentType: "DNI",
      documentNumber: "11111111A",
      birthDate: new Date("1990-03-15T00:00:00.000Z"),
      phone: "600123001",
      email: "ana.demo@club.local",
      city: "Santa Cruz de Tenerife",
      status: MemberStatus.ACTIVE,
      memberClass: MemberClass.STANDARD,
      joinedAt: new Date("2026-04-10T09:00:00.000Z"),
      lastVisitAt: new Date("2026-06-22T18:30:00.000Z"),
      createdById: owner.id,
      updatedById: owner.id,
    },
  });

  const memberBruno = await prisma.member.upsert({
    where: {
      tenantId_memberNumber: {
        tenantId: tenant.id,
        memberNumber: "SOC-002",
      },
    },
    update: {
      firstName: "Bruno",
      lastName: "Diaz",
      displayName: "Bruno Diaz",
      documentType: "DNI",
      documentNumber: "22222222B",
      birthDate: new Date("1986-09-02T00:00:00.000Z"),
      phone: "600123002",
      email: "bruno.demo@club.local",
      city: "La Laguna",
      status: MemberStatus.ACTIVE,
      memberClass: MemberClass.PREFERRED,
      joinedAt: new Date("2026-02-18T11:00:00.000Z"),
      lastVisitAt: new Date("2026-06-23T12:10:00.000Z"),
      createdById: owner.id,
      updatedById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      memberNumber: "SOC-002",
      firstName: "Bruno",
      lastName: "Diaz",
      displayName: "Bruno Diaz",
      documentType: "DNI",
      documentNumber: "22222222B",
      birthDate: new Date("1986-09-02T00:00:00.000Z"),
      phone: "600123002",
      email: "bruno.demo@club.local",
      city: "La Laguna",
      status: MemberStatus.ACTIVE,
      memberClass: MemberClass.PREFERRED,
      joinedAt: new Date("2026-02-18T11:00:00.000Z"),
      lastVisitAt: new Date("2026-06-23T12:10:00.000Z"),
      createdById: owner.id,
      updatedById: owner.id,
    },
  });

  const memberCarla = await prisma.member.upsert({
    where: {
      tenantId_memberNumber: {
        tenantId: tenant.id,
        memberNumber: "SOC-003",
      },
    },
    update: {
      firstName: "Carla",
      lastName: "Moreno",
      displayName: "Carla Moreno",
      documentType: "NIE",
      documentNumber: "X3333333C",
      birthDate: new Date("1995-12-21T00:00:00.000Z"),
      phone: "600123003",
      email: "carla.demo@club.local",
      city: "Tacoronte",
      status: MemberStatus.SUSPENDED,
      memberClass: MemberClass.VIP,
      joinedAt: new Date("2026-01-12T10:00:00.000Z"),
      lastVisitAt: new Date("2026-05-30T19:00:00.000Z"),
      internalNotes: "Suspendida temporalmente por validacion documental.",
      createdById: owner.id,
      updatedById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      memberNumber: "SOC-003",
      firstName: "Carla",
      lastName: "Moreno",
      displayName: "Carla Moreno",
      documentType: "NIE",
      documentNumber: "X3333333C",
      birthDate: new Date("1995-12-21T00:00:00.000Z"),
      phone: "600123003",
      email: "carla.demo@club.local",
      city: "Tacoronte",
      status: MemberStatus.SUSPENDED,
      memberClass: MemberClass.VIP,
      joinedAt: new Date("2026-01-12T10:00:00.000Z"),
      lastVisitAt: new Date("2026-05-30T19:00:00.000Z"),
      internalNotes: "Suspendida temporalmente por validacion documental.",
      createdById: owner.id,
      updatedById: owner.id,
    },
  });

  await prisma.memberNote.upsert({
    where: { id: "member-note-demo-001" },
    update: {
      tenantId: tenant.id,
      memberId: memberBruno.id,
      note: "Socio habitual, suele comprar packs y usar saldo pendiente de forma puntual.",
      visibility: MemberNoteVisibility.ALL_STAFF,
      createdBy: owner.id,
    },
    create: {
      id: "member-note-demo-001",
      tenantId: tenant.id,
      memberId: memberBruno.id,
      note: "Socio habitual, suele comprar packs y usar saldo pendiente de forma puntual.",
      visibility: MemberNoteVisibility.ALL_STAFF,
      createdBy: owner.id,
    },
  });

  await prisma.memberIncident.upsert({
    where: { id: "member-incident-demo-001" },
    update: {
      tenantId: tenant.id,
      memberId: memberCarla.id,
      type: IncidentType.DOCUMENT_ISSUE,
      severity: IncidentSeverity.MEDIUM,
      description: "Falta actualizar documentacion de residencia para reactivar acceso.",
      status: IncidentStatus.UNDER_REVIEW,
      createdBy: owner.id,
      resolvedBy: null,
      resolvedAt: null,
    },
    create: {
      id: "member-incident-demo-001",
      tenantId: tenant.id,
      memberId: memberCarla.id,
      type: IncidentType.DOCUMENT_ISSUE,
      severity: IncidentSeverity.MEDIUM,
      description: "Falta actualizar documentacion de residencia para reactivar acceso.",
      status: IncidentStatus.UNDER_REVIEW,
      createdBy: owner.id,
    },
  });

  const categoryFlowers = await prisma.productCategory.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "Flores",
      },
    },
    update: {
      description: "Flor seca para dispensacion por peso.",
      status: ProductStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      name: "Flores",
      description: "Flor seca para dispensacion por peso.",
      status: ProductStatus.ACTIVE,
    },
  });

  const categoryAccessories = await prisma.productCategory.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "Accesorios",
      },
    },
    update: {
      description: "Articulos unitarios y complementos.",
      status: ProductStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      name: "Accesorios",
      description: "Articulos unitarios y complementos.",
      status: ProductStatus.ACTIVE,
    },
  });

  const productMango = await prisma.product.upsert({
    where: {
      tenantId_sku: {
        tenantId: tenant.id,
        sku: "FLOW-MANGO",
      },
    },
    update: {
      categoryId: categoryFlowers.id,
      name: "Mango Kush",
      description: "Flor aromatica para prueba de stock por gramos.",
      unitType: UnitType.GRAM,
      price: 8.5,
      cost: 4.2,
      status: ProductStatus.ACTIVE,
      minimumStock: 20,
      idealStock: 80,
      allowDecimalQuantity: true,
      trackStock: true,
      createdById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      categoryId: categoryFlowers.id,
      name: "Mango Kush",
      description: "Flor aromatica para prueba de stock por gramos.",
      sku: "FLOW-MANGO",
      barcode: "100000000001",
      unitType: UnitType.GRAM,
      price: 8.5,
      cost: 4.2,
      status: ProductStatus.ACTIVE,
      minimumStock: 20,
      idealStock: 80,
      allowDecimalQuantity: true,
      trackStock: true,
      createdById: owner.id,
    },
  });

  const productLemon = await prisma.product.upsert({
    where: {
      tenantId_sku: {
        tenantId: tenant.id,
        sku: "FLOW-LEMON",
      },
    },
    update: {
      categoryId: categoryFlowers.id,
      name: "Lemon Haze",
      description: "Flor para pruebas de merma y ajuste.",
      unitType: UnitType.GRAM,
      price: 9.25,
      cost: 4.8,
      status: ProductStatus.ACTIVE,
      minimumStock: 15,
      idealStock: 60,
      allowDecimalQuantity: true,
      trackStock: true,
      createdById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      categoryId: categoryFlowers.id,
      name: "Lemon Haze",
      description: "Flor para pruebas de merma y ajuste.",
      sku: "FLOW-LEMON",
      barcode: "100000000002",
      unitType: UnitType.GRAM,
      price: 9.25,
      cost: 4.8,
      status: ProductStatus.ACTIVE,
      minimumStock: 15,
      idealStock: 60,
      allowDecimalQuantity: true,
      trackStock: true,
      createdById: owner.id,
    },
  });

  const productPaper = await prisma.product.upsert({
    where: {
      tenantId_sku: {
        tenantId: tenant.id,
        sku: "ACC-PAPER",
      },
    },
    update: {
      categoryId: categoryAccessories.id,
      name: "Papel 1 1/4",
      description: "Consumible unitario.",
      unitType: UnitType.UNIT,
      price: 1.5,
      cost: 0.5,
      status: ProductStatus.ACTIVE,
      minimumStock: 10,
      idealStock: 40,
      allowDecimalQuantity: false,
      trackStock: true,
      createdById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      categoryId: categoryAccessories.id,
      name: "Papel 1 1/4",
      description: "Consumible unitario.",
      sku: "ACC-PAPER",
      barcode: "100000000003",
      unitType: UnitType.UNIT,
      price: 1.5,
      cost: 0.5,
      status: ProductStatus.ACTIVE,
      minimumStock: 10,
      idealStock: 40,
      allowDecimalQuantity: false,
      trackStock: true,
      createdById: owner.id,
    },
  });

  const productGrinder = await prisma.product.upsert({
    where: {
      tenantId_sku: {
        tenantId: tenant.id,
        sku: "ACC-GRIND",
      },
    },
    update: {
      categoryId: categoryAccessories.id,
      name: "Grinder Club",
      description: "Accesorio promocional demo.",
      unitType: UnitType.UNIT,
      price: 12,
      cost: 5.5,
      status: ProductStatus.ACTIVE,
      minimumStock: 4,
      idealStock: 12,
      allowDecimalQuantity: false,
      trackStock: true,
      createdById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      categoryId: categoryAccessories.id,
      name: "Grinder Club",
      description: "Accesorio promocional demo.",
      sku: "ACC-GRIND",
      barcode: "100000000004",
      unitType: UnitType.UNIT,
      price: 12,
      cost: 5.5,
      status: ProductStatus.ACTIVE,
      minimumStock: 4,
      idealStock: 12,
      allowDecimalQuantity: false,
      trackStock: true,
      createdById: owner.id,
    },
  });

  const inventorySeeds = [
    { product: productMango, current: 65, minimum: 20, maximum: 100, stockIn: 80, stockOut: 15 },
    { product: productLemon, current: 32.5, minimum: 15, maximum: 80, stockIn: 50, stockOut: 17.5 },
    { product: productPaper, current: 28, minimum: 10, maximum: 60, stockIn: 40, stockOut: 12 },
    { product: productGrinder, current: 7, minimum: 4, maximum: 15, stockIn: 10, stockOut: 3 },
  ];

  for (const item of inventorySeeds) {
    await prisma.inventory.upsert({
      where: { productId: item.product.id },
      update: {
        tenantId: tenant.id,
        currentQuantity: item.current,
        minimumQuantity: item.minimum,
        maximumQuantity: item.maximum,
        reservedQuantity: 0,
        lostQuantity: 0.5,
        totalStockIn: item.stockIn,
        totalStockOut: item.stockOut,
        lastMovementAt: new Date("2026-06-23T12:00:00.000Z"),
      },
      create: {
        tenantId: tenant.id,
        productId: item.product.id,
        currentQuantity: item.current,
        minimumQuantity: item.minimum,
        maximumQuantity: item.maximum,
        reservedQuantity: 0,
        lostQuantity: 0.5,
        totalStockIn: item.stockIn,
        totalStockOut: item.stockOut,
        lastMovementAt: new Date("2026-06-23T12:00:00.000Z"),
      },
    });
  }

  await prisma.inventoryMovement.upsert({
    where: { id: "inv-move-demo-001" },
    update: {
      tenantId: tenant.id,
      productId: productMango.id,
      type: InventoryMovementType.STOCK_IN,
      quantity: 80,
      previousQuantity: 0,
      newQuantity: 80,
      reason: "Carga inicial demo",
      notes: "Entrada inicial de inventario para testing.",
      source: "SEED",
      batchCode: "MK-0626",
      unitCost: 4.2,
      totalCost: 336,
      referenceType: "seed",
      referenceId: "demo-club-001",
      createdById: owner.id,
      createdAt: new Date("2026-06-20T09:00:00.000Z"),
    },
    create: {
      id: "inv-move-demo-001",
      tenantId: tenant.id,
      productId: productMango.id,
      type: InventoryMovementType.STOCK_IN,
      quantity: 80,
      previousQuantity: 0,
      newQuantity: 80,
      reason: "Carga inicial demo",
      notes: "Entrada inicial de inventario para testing.",
      source: "SEED",
      batchCode: "MK-0626",
      unitCost: 4.2,
      totalCost: 336,
      referenceType: "seed",
      referenceId: "demo-club-001",
      createdById: owner.id,
      createdAt: new Date("2026-06-20T09:00:00.000Z"),
    },
  });

  await prisma.inventoryMovement.upsert({
    where: { id: "inv-move-demo-002" },
    update: {
      tenantId: tenant.id,
      productId: productLemon.id,
      type: InventoryMovementType.ADJUSTMENT,
      quantity: -0.5,
      previousQuantity: 33,
      newQuantity: 32.5,
      reason: "Ajuste por merma",
      notes: "Correccion demo tras recuento.",
      source: "STOCKTAKE",
      batchCode: "LH-0626",
      unitCost: 4.8,
      totalCost: -2.4,
      referenceType: "seed",
      referenceId: "demo-club-001",
      createdById: owner.id,
      createdAt: new Date("2026-06-22T20:00:00.000Z"),
    },
    create: {
      id: "inv-move-demo-002",
      tenantId: tenant.id,
      productId: productLemon.id,
      type: InventoryMovementType.ADJUSTMENT,
      quantity: -0.5,
      previousQuantity: 33,
      newQuantity: 32.5,
      reason: "Ajuste por merma",
      notes: "Correccion demo tras recuento.",
      source: "STOCKTAKE",
      batchCode: "LH-0626",
      unitCost: 4.8,
      totalCost: -2.4,
      referenceType: "seed",
      referenceId: "demo-club-001",
      createdById: owner.id,
      createdAt: new Date("2026-06-22T20:00:00.000Z"),
    },
  });

  const openSession = await prisma.posSession.upsert({
    where: { id: "pos-demo-open-001" },
    update: {
      tenantId: tenant.id,
      openedById: employee.id,
      closedById: null,
      openingCash: 150,
      closingCash: null,
      expectedCash: null,
      difference: null,
      status: PosSessionStatus.OPEN,
      openedAt: new Date("2026-06-23T09:00:00.000Z"),
      closedAt: null,
    },
    create: {
      id: "pos-demo-open-001",
      tenantId: tenant.id,
      openedById: employee.id,
      openingCash: 150,
      difference: null,
      status: PosSessionStatus.OPEN,
      openedAt: new Date("2026-06-23T09:00:00.000Z"),
    },
  });

  const closedSession = await prisma.posSession.upsert({
    where: { id: "pos-demo-closed-001" },
    update: {
      tenantId: tenant.id,
      openedById: owner.id,
      closedById: owner.id,
      openingCash: 80,
      closingCash: 104.5,
      expectedCash: 104.5,
      difference: 0,
      status: PosSessionStatus.CLOSED,
      openedAt: new Date("2026-06-22T10:00:00.000Z"),
      closedAt: new Date("2026-06-22T18:15:00.000Z"),
    },
    create: {
      id: "pos-demo-closed-001",
      tenantId: tenant.id,
      openedById: owner.id,
      closedById: owner.id,
      openingCash: 80,
      closingCash: 104.5,
      expectedCash: 104.5,
      difference: 0,
      status: PosSessionStatus.CLOSED,
      openedAt: new Date("2026-06-22T10:00:00.000Z"),
      closedAt: new Date("2026-06-22T18:15:00.000Z"),
    },
  });

  const saleCash = await prisma.sale.upsert({
    where: { id: "sale-demo-001" },
    update: {
      tenantId: tenant.id,
      memberId: memberAna.id,
      posSessionId: openSession.id,
      soldById: employee.id,
      subtotal: 18.5,
      discount: 0,
      total: 18.5,
      amountPaid: 18.5,
      amountPending: 0,
      settlementStatus: SettlementStatus.PAID,
      saleType: SaleType.STANDARD,
      status: SaleStatus.COMPLETED,
      createdAt: new Date("2026-06-23T11:20:00.000Z"),
    },
    create: {
      id: "sale-demo-001",
      tenantId: tenant.id,
      memberId: memberAna.id,
      posSessionId: openSession.id,
      soldById: employee.id,
      subtotal: 18.5,
      discount: 0,
      total: 18.5,
      amountPaid: 18.5,
      amountPending: 0,
      settlementStatus: SettlementStatus.PAID,
      saleType: SaleType.STANDARD,
      status: SaleStatus.COMPLETED,
      createdAt: new Date("2026-06-23T11:20:00.000Z"),
    },
  });

  const saleCredit = await prisma.sale.upsert({
    where: { id: "sale-demo-002" },
    update: {
      tenantId: tenant.id,
      memberId: memberBruno.id,
      posSessionId: openSession.id,
      soldById: employee.id,
      subtotal: 21.25,
      discount: 1.25,
      total: 20,
      amountPaid: 16,
      amountPending: 4,
      settlementStatus: SettlementStatus.PARTIALLY_PAID,
      saleType: SaleType.PARTIAL_CREDIT,
      creditReason: "El socio deja saldo pendiente para la tarde.",
      status: SaleStatus.COMPLETED,
      createdAt: new Date("2026-06-23T12:05:00.000Z"),
    },
    create: {
      id: "sale-demo-002",
      tenantId: tenant.id,
      memberId: memberBruno.id,
      posSessionId: openSession.id,
      soldById: employee.id,
      subtotal: 21.25,
      discount: 1.25,
      total: 20,
      amountPaid: 16,
      amountPending: 4,
      settlementStatus: SettlementStatus.PARTIALLY_PAID,
      saleType: SaleType.PARTIAL_CREDIT,
      creditReason: "El socio deja saldo pendiente para la tarde.",
      status: SaleStatus.COMPLETED,
      createdAt: new Date("2026-06-23T12:05:00.000Z"),
    },
  });

  const closedSessionSale = await prisma.sale.upsert({
    where: { id: "sale-demo-closed-001" },
    update: {
      tenantId: tenant.id,
      memberId: memberAna.id,
      posSessionId: closedSession.id,
      soldById: owner.id,
      subtotal: 36,
      discount: 0,
      total: 36,
      amountPaid: 36,
      amountPending: 0,
      settlementStatus: SettlementStatus.PAID,
      saleType: SaleType.STANDARD,
      status: SaleStatus.COMPLETED,
      createdAt: new Date("2026-06-22T12:40:00.000Z"),
    },
    create: {
      id: "sale-demo-closed-001",
      tenantId: tenant.id,
      memberId: memberAna.id,
      posSessionId: closedSession.id,
      soldById: owner.id,
      subtotal: 36,
      discount: 0,
      total: 36,
      amountPaid: 36,
      amountPending: 0,
      settlementStatus: SettlementStatus.PAID,
      saleType: SaleType.STANDARD,
      status: SaleStatus.COMPLETED,
      createdAt: new Date("2026-06-22T12:40:00.000Z"),
    },
  });

  await prisma.sale.upsert({
    where: { id: "sale-demo-cancelled-001" },
    update: {
      tenantId: tenant.id,
      memberId: memberBruno.id,
      posSessionId: closedSession.id,
      soldById: owner.id,
      subtotal: 9,
      discount: 0,
      total: 9,
      amountPaid: 0,
      amountPending: 0,
      settlementStatus: SettlementStatus.CANCELLED,
      saleType: SaleType.STANDARD,
      status: SaleStatus.CANCELLED,
      cancelReason: "Venta anulada en demo por error de producto.",
      cancelledAt: new Date("2026-06-22T16:25:00.000Z"),
      cancelledById: owner.id,
      createdAt: new Date("2026-06-22T16:20:00.000Z"),
    },
    create: {
      id: "sale-demo-cancelled-001",
      tenantId: tenant.id,
      memberId: memberBruno.id,
      posSessionId: closedSession.id,
      soldById: owner.id,
      subtotal: 9,
      discount: 0,
      total: 9,
      amountPaid: 0,
      amountPending: 0,
      settlementStatus: SettlementStatus.CANCELLED,
      saleType: SaleType.STANDARD,
      status: SaleStatus.CANCELLED,
      cancelReason: "Venta anulada en demo por error de producto.",
      cancelledAt: new Date("2026-06-22T16:25:00.000Z"),
      cancelledById: owner.id,
      createdAt: new Date("2026-06-22T16:20:00.000Z"),
    },
  });

  await prisma.saleItem.upsert({
    where: { id: "sale-item-demo-001" },
    update: {
      tenantId: tenant.id,
      saleId: saleCash.id,
      productId: productMango.id,
      productNameSnapshot: "Mango Kush",
      quantity: 2,
      unitPrice: 8.5,
      total: 17,
      pricingMode: "BY_WEIGHT",
      actualWeight: 2,
      weightDifference: 0,
      wasteQuantity: 0,
      scaleVerified: true,
      scaleVerifiedAt: new Date("2026-06-23T11:20:00.000Z"),
      scaleVerifiedById: employee.id,
      scaleToleranceExceeded: false,
    },
    create: {
      id: "sale-item-demo-001",
      tenantId: tenant.id,
      saleId: saleCash.id,
      productId: productMango.id,
      productNameSnapshot: "Mango Kush",
      quantity: 2,
      unitPrice: 8.5,
      total: 17,
      pricingMode: "BY_WEIGHT",
      actualWeight: 2,
      weightDifference: 0,
      wasteQuantity: 0,
      scaleVerified: true,
      scaleVerifiedAt: new Date("2026-06-23T11:20:00.000Z"),
      scaleVerifiedById: employee.id,
      scaleToleranceExceeded: false,
    },
  });

  await prisma.saleItem.upsert({
    where: { id: "sale-item-demo-002" },
    update: {
      tenantId: tenant.id,
      saleId: saleCash.id,
      productId: productPaper.id,
      productNameSnapshot: "Papel 1 1/4",
      quantity: 1,
      unitPrice: 1.5,
      total: 1.5,
      pricingMode: "BY_UNIT",
      scaleVerified: false,
      scaleToleranceExceeded: false,
    },
    create: {
      id: "sale-item-demo-002",
      tenantId: tenant.id,
      saleId: saleCash.id,
      productId: productPaper.id,
      productNameSnapshot: "Papel 1 1/4",
      quantity: 1,
      unitPrice: 1.5,
      total: 1.5,
      pricingMode: "BY_UNIT",
      scaleVerified: false,
      scaleToleranceExceeded: false,
    },
  });

  await prisma.saleItem.upsert({
    where: { id: "sale-item-demo-003" },
    update: {
      tenantId: tenant.id,
      saleId: saleCredit.id,
      productId: productLemon.id,
      productNameSnapshot: "Lemon Haze",
      quantity: 2,
      unitPrice: 9.25,
      total: 18.5,
      pricingMode: "BY_WEIGHT",
      actualWeight: 2,
      weightDifference: 0,
      wasteQuantity: 0,
      scaleVerified: true,
      scaleVerifiedAt: new Date("2026-06-23T12:05:00.000Z"),
      scaleVerifiedById: employee.id,
      scaleToleranceExceeded: false,
    },
    create: {
      id: "sale-item-demo-003",
      tenantId: tenant.id,
      saleId: saleCredit.id,
      productId: productLemon.id,
      productNameSnapshot: "Lemon Haze",
      quantity: 2,
      unitPrice: 9.25,
      total: 18.5,
      pricingMode: "BY_WEIGHT",
      actualWeight: 2,
      weightDifference: 0,
      wasteQuantity: 0,
      scaleVerified: true,
      scaleVerifiedAt: new Date("2026-06-23T12:05:00.000Z"),
      scaleVerifiedById: employee.id,
      scaleToleranceExceeded: false,
    },
  });

  await prisma.saleItem.upsert({
    where: { id: "sale-item-demo-004" },
    update: {
      tenantId: tenant.id,
      saleId: saleCredit.id,
      productId: productPaper.id,
      productNameSnapshot: "Papel 1 1/4",
      quantity: 1,
      unitPrice: 1.5,
      total: 1.5,
      pricingMode: "BY_UNIT",
      scaleVerified: false,
      scaleToleranceExceeded: false,
    },
    create: {
      id: "sale-item-demo-004",
      tenantId: tenant.id,
      saleId: saleCredit.id,
      productId: productPaper.id,
      productNameSnapshot: "Papel 1 1/4",
      quantity: 1,
      unitPrice: 1.5,
      total: 1.5,
      pricingMode: "BY_UNIT",
      scaleVerified: false,
      scaleToleranceExceeded: false,
    },
  });

  await prisma.saleItem.upsert({
    where: { id: "sale-item-demo-closed-001" },
    update: {
      tenantId: tenant.id,
      saleId: closedSessionSale.id,
      productId: productGrinder.id,
      productNameSnapshot: "Grinder Club",
      quantity: 1,
      unitPrice: 12,
      total: 12,
      pricingMode: "BY_UNIT",
      scaleVerified: false,
      scaleToleranceExceeded: false,
    },
    create: {
      id: "sale-item-demo-closed-001",
      tenantId: tenant.id,
      saleId: closedSessionSale.id,
      productId: productGrinder.id,
      productNameSnapshot: "Grinder Club",
      quantity: 1,
      unitPrice: 12,
      total: 12,
      pricingMode: "BY_UNIT",
      scaleVerified: false,
      scaleToleranceExceeded: false,
    },
  });

  await prisma.saleItem.upsert({
    where: { id: "sale-item-demo-closed-002" },
    update: {
      tenantId: tenant.id,
      saleId: closedSessionSale.id,
      productId: productMango.id,
      productNameSnapshot: "Mango Kush",
      quantity: 3,
      unitPrice: 8,
      total: 24,
      pricingMode: "BY_WEIGHT",
      actualWeight: 3,
      weightDifference: 0,
      wasteQuantity: 0,
      scaleVerified: true,
      scaleVerifiedAt: new Date("2026-06-22T12:40:00.000Z"),
      scaleVerifiedById: owner.id,
      scaleToleranceExceeded: false,
    },
    create: {
      id: "sale-item-demo-closed-002",
      tenantId: tenant.id,
      saleId: closedSessionSale.id,
      productId: productMango.id,
      productNameSnapshot: "Mango Kush",
      quantity: 3,
      unitPrice: 8,
      total: 24,
      pricingMode: "BY_WEIGHT",
      actualWeight: 3,
      weightDifference: 0,
      wasteQuantity: 0,
      scaleVerified: true,
      scaleVerifiedAt: new Date("2026-06-22T12:40:00.000Z"),
      scaleVerifiedById: owner.id,
      scaleToleranceExceeded: false,
    },
  });

  await prisma.saleItem.upsert({
    where: { id: "sale-item-demo-cancelled-001" },
    update: {
      tenantId: tenant.id,
      saleId: "sale-demo-cancelled-001",
      productId: productPaper.id,
      productNameSnapshot: "Papel 1 1/4",
      quantity: 6,
      unitPrice: 1.5,
      total: 9,
      pricingMode: "BY_UNIT",
      scaleVerified: false,
      scaleToleranceExceeded: false,
    },
    create: {
      id: "sale-item-demo-cancelled-001",
      tenantId: tenant.id,
      saleId: "sale-demo-cancelled-001",
      productId: productPaper.id,
      productNameSnapshot: "Papel 1 1/4",
      quantity: 6,
      unitPrice: 1.5,
      total: 9,
      pricingMode: "BY_UNIT",
      scaleVerified: false,
      scaleToleranceExceeded: false,
    },
  });

  await prisma.payment.upsert({
    where: { id: "payment-demo-001" },
    update: {
      tenantId: tenant.id,
      saleId: saleCash.id,
      method: PaymentMethod.CASH,
      amount: 18.5,
      status: PaymentStatus.COMPLETED,
      createdAt: new Date("2026-06-23T11:20:30.000Z"),
    },
    create: {
      id: "payment-demo-001",
      tenantId: tenant.id,
      saleId: saleCash.id,
      method: PaymentMethod.CASH,
      amount: 18.5,
      status: PaymentStatus.COMPLETED,
      createdAt: new Date("2026-06-23T11:20:30.000Z"),
    },
  });

  await prisma.payment.upsert({
    where: { id: "payment-demo-002" },
    update: {
      tenantId: tenant.id,
      saleId: saleCredit.id,
      method: PaymentMethod.CARD,
      amount: 10,
      status: PaymentStatus.COMPLETED,
      createdAt: new Date("2026-06-23T12:05:30.000Z"),
    },
    create: {
      id: "payment-demo-002",
      tenantId: tenant.id,
      saleId: saleCredit.id,
      method: PaymentMethod.CARD,
      amount: 10,
      status: PaymentStatus.COMPLETED,
      createdAt: new Date("2026-06-23T12:05:30.000Z"),
    },
  });

  await prisma.payment.upsert({
    where: { id: "payment-demo-closed-001" },
    update: {
      tenantId: tenant.id,
      saleId: closedSessionSale.id,
      method: PaymentMethod.CASH,
      amount: 36,
      status: PaymentStatus.COMPLETED,
      createdAt: new Date("2026-06-22T12:40:30.000Z"),
    },
    create: {
      id: "payment-demo-closed-001",
      tenantId: tenant.id,
      saleId: closedSessionSale.id,
      method: PaymentMethod.CASH,
      amount: 36,
      status: PaymentStatus.COMPLETED,
      createdAt: new Date("2026-06-22T12:40:30.000Z"),
    },
  });

  const saleCreditReceivable = await prisma.receivable.upsert({
    where: { saleId: saleCredit.id },
    update: {
      tenantId: tenant.id,
      memberId: memberBruno.id,
      originalAmount: 10,
      paidAmount: 6,
      outstandingAmount: 4,
      status: ReceivableStatus.PARTIALLY_PAID,
      dueDate: new Date("2026-06-25T23:59:59.000Z"),
      reason: "Saldo pendiente demo.",
      createdById: employee.id,
      approvedById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      memberId: memberBruno.id,
      saleId: saleCredit.id,
      originalAmount: 10,
      paidAmount: 6,
      outstandingAmount: 4,
      status: ReceivableStatus.PARTIALLY_PAID,
      dueDate: new Date("2026-06-25T23:59:59.000Z"),
      reason: "Saldo pendiente demo.",
      createdById: employee.id,
      approvedById: owner.id,
    },
  });

  await prisma.receivablePayment.upsert({
    where: { id: "receivable-payment-demo-001" },
    update: {
      tenantId: tenant.id,
      receivableId: saleCreditReceivable.id,
      memberId: memberBruno.id,
      posSessionId: openSession.id,
      amount: 6,
      notes: "Cobro parcial demo de cuenta pendiente.",
      receivedById: employee.id,
      createdAt: new Date("2026-06-23T15:20:00.000Z"),
    },
    create: {
      id: "receivable-payment-demo-001",
      tenantId: tenant.id,
      receivableId: saleCreditReceivable.id,
      memberId: memberBruno.id,
      posSessionId: openSession.id,
      amount: 6,
      notes: "Cobro parcial demo de cuenta pendiente.",
      receivedById: employee.id,
      createdAt: new Date("2026-06-23T15:20:00.000Z"),
    },
  });

  await prisma.cashMovement.upsert({
    where: { id: "cash-move-demo-001" },
    update: {
      tenantId: tenant.id,
      posSessionId: openSession.id,
      saleId: saleCash.id,
      type: CashMovementType.SALE_CASH_IN,
      amount: 18.5,
      reason: "Cobro venta contado demo",
      createdById: employee.id,
      createdAt: new Date("2026-06-23T11:20:30.000Z"),
    },
    create: {
      id: "cash-move-demo-001",
      tenantId: tenant.id,
      posSessionId: openSession.id,
      saleId: saleCash.id,
      type: CashMovementType.SALE_CASH_IN,
      amount: 18.5,
      reason: "Cobro venta contado demo",
      createdById: employee.id,
      createdAt: new Date("2026-06-23T11:20:30.000Z"),
    },
  });

  await prisma.cashMovement.upsert({
    where: { id: "cash-move-demo-002" },
    update: {
      tenantId: tenant.id,
      posSessionId: openSession.id,
      saleId: null,
      type: CashMovementType.EXPENSE,
      amount: 5,
      reason: "Compra de consumibles demo",
      createdById: owner.id,
      createdAt: new Date("2026-06-23T13:10:00.000Z"),
    },
    create: {
      id: "cash-move-demo-002",
      tenantId: tenant.id,
      posSessionId: openSession.id,
      type: CashMovementType.EXPENSE,
      amount: 5,
      reason: "Compra de consumibles demo",
      createdById: owner.id,
      createdAt: new Date("2026-06-23T13:10:00.000Z"),
    },
  });

  const supplier = await prisma.thirdParty.upsert({
    where: { id: "third-party-demo-001" },
    update: {
      tenantId: tenant.id,
      name: "Green Supply Canarias",
      type: ThirdPartyType.SUPPLIER,
      documentNumber: "B76543210",
      phone: "922444555",
      email: "pedidos@greensupply.demo",
      notes: "Proveedor de accesorios para demo.",
      status: "ACTIVE",
      createdById: owner.id,
    },
    create: {
      id: "third-party-demo-001",
      tenantId: tenant.id,
      name: "Green Supply Canarias",
      type: ThirdPartyType.SUPPLIER,
      documentNumber: "B76543210",
      phone: "922444555",
      email: "pedidos@greensupply.demo",
      notes: "Proveedor de accesorios para demo.",
      status: "ACTIVE",
      createdById: owner.id,
    },
  });

  await prisma.cashMovement.upsert({
    where: { id: "cash-move-demo-003" },
    update: {
      tenantId: tenant.id,
      posSessionId: openSession.id,
      saleId: null,
      type: CashMovementType.THIRD_PARTY_CASH_OUT,
      amount: 24,
      reason: "Pago demo a proveedor",
      createdById: owner.id,
      createdAt: new Date("2026-06-23T14:00:00.000Z"),
    },
    create: {
      id: "cash-move-demo-003",
      tenantId: tenant.id,
      posSessionId: openSession.id,
      type: CashMovementType.THIRD_PARTY_CASH_OUT,
      amount: 24,
      reason: "Pago demo a proveedor",
      createdById: owner.id,
      createdAt: new Date("2026-06-23T14:00:00.000Z"),
    },
  });

  await prisma.cashMovement.upsert({
    where: { id: "cash-move-demo-004" },
    update: {
      tenantId: tenant.id,
      posSessionId: openSession.id,
      saleId: null,
      type: CashMovementType.RECEIVABLE_CASH_IN,
      amount: 6,
      reason: "Cobro parcial demo de cuenta pendiente",
      createdById: employee.id,
      createdAt: new Date("2026-06-23T15:20:00.000Z"),
    },
    create: {
      id: "cash-move-demo-004",
      tenantId: tenant.id,
      posSessionId: openSession.id,
      type: CashMovementType.RECEIVABLE_CASH_IN,
      amount: 6,
      reason: "Cobro parcial demo de cuenta pendiente",
      createdById: employee.id,
      createdAt: new Date("2026-06-23T15:20:00.000Z"),
    },
  });

  await prisma.cashMovement.upsert({
    where: { id: "cash-move-demo-closed-001" },
    update: {
      tenantId: tenant.id,
      posSessionId: closedSession.id,
      saleId: closedSessionSale.id,
      type: CashMovementType.SALE_CASH_IN,
      amount: 36,
      reason: "Cobro historico demo de venta cerrada",
      createdById: owner.id,
      createdAt: new Date("2026-06-22T12:40:30.000Z"),
    },
    create: {
      id: "cash-move-demo-closed-001",
      tenantId: tenant.id,
      posSessionId: closedSession.id,
      saleId: closedSessionSale.id,
      type: CashMovementType.SALE_CASH_IN,
      amount: 36,
      reason: "Cobro historico demo de venta cerrada",
      createdById: owner.id,
      createdAt: new Date("2026-06-22T12:40:30.000Z"),
    },
  });

  await prisma.cashMovement.upsert({
    where: { id: "cash-move-demo-closed-002" },
    update: {
      tenantId: tenant.id,
      posSessionId: closedSession.id,
      saleId: null,
      type: CashMovementType.WITHDRAWAL,
      amount: 11.5,
      reason: "Retirada historica demo para cierre de caja",
      createdById: owner.id,
      createdAt: new Date("2026-06-22T18:00:00.000Z"),
    },
    create: {
      id: "cash-move-demo-closed-002",
      tenantId: tenant.id,
      posSessionId: closedSession.id,
      type: CashMovementType.WITHDRAWAL,
      amount: 11.5,
      reason: "Retirada historica demo para cierre de caja",
      createdById: owner.id,
      createdAt: new Date("2026-06-22T18:00:00.000Z"),
    },
  });

  await prisma.thirdPartyPayment.upsert({
    where: { id: "third-party-payment-demo-001" },
    update: {
      tenantId: tenant.id,
      thirdPartyId: supplier.id,
      posSessionId: openSession.id,
      amount: 24,
      category: ThirdPartyPaymentCategory.SUPPLIER_PAYMENT,
      status: ThirdPartyPaymentStatus.PAID,
      reason: "Reposicion de grinders y papel",
      notes: "Pago manual demo.",
      paidById: owner.id,
      cancelledById: null,
      cancelledAt: null,
      cancelReason: null,
      cashMovementId: "cash-move-demo-003",
    },
    create: {
      id: "third-party-payment-demo-001",
      tenantId: tenant.id,
      thirdPartyId: supplier.id,
      posSessionId: openSession.id,
      amount: 24,
      category: ThirdPartyPaymentCategory.SUPPLIER_PAYMENT,
      status: ThirdPartyPaymentStatus.PAID,
      reason: "Reposicion de grinders y papel",
      notes: "Pago manual demo.",
      paidById: owner.id,
      cashMovementId: "cash-move-demo-003",
    },
  });

  await prisma.thirdPartyPayment.upsert({
    where: { id: "third-party-payment-demo-002" },
    update: {
      tenantId: tenant.id,
      thirdPartyId: supplier.id,
      posSessionId: closedSession.id,
      amount: 15,
      category: ThirdPartyPaymentCategory.EXPENSE,
      status: ThirdPartyPaymentStatus.CANCELLED,
      reason: "Pedido demo cancelado",
      notes: "Pago preparado pero cancelado antes de ejecutarse.",
      paidById: owner.id,
      cancelledById: owner.id,
      cancelledAt: new Date("2026-06-22T17:10:00.000Z"),
      cancelReason: "Proveedor sin stock en demo.",
      cashMovementId: null,
    },
    create: {
      id: "third-party-payment-demo-002",
      tenantId: tenant.id,
      thirdPartyId: supplier.id,
      posSessionId: closedSession.id,
      amount: 15,
      category: ThirdPartyPaymentCategory.EXPENSE,
      status: ThirdPartyPaymentStatus.CANCELLED,
      reason: "Pedido demo cancelado",
      notes: "Pago preparado pero cancelado antes de ejecutarse.",
      paidById: owner.id,
      cancelledById: owner.id,
      cancelledAt: new Date("2026-06-22T17:10:00.000Z"),
      cancelReason: "Proveedor sin stock en demo.",
    },
  });

  await prisma.receivable.upsert({
    where: { id: "receivable-demo-overdue-001" },
    update: {
      tenantId: tenant.id,
      memberId: memberCarla.id,
      saleId: null,
      originalAmount: 25,
      paidAmount: 0,
      outstandingAmount: 25,
      status: ReceivableStatus.OVERDUE,
      dueDate: new Date("2026-06-10T23:59:59.000Z"),
      reason: "Cuenta manual vencida para pruebas demo.",
      createdById: owner.id,
      approvedById: owner.id,
    },
    create: {
      id: "receivable-demo-overdue-001",
      tenantId: tenant.id,
      memberId: memberCarla.id,
      originalAmount: 25,
      paidAmount: 0,
      outstandingAmount: 25,
      status: ReceivableStatus.OVERDUE,
      dueDate: new Date("2026-06-10T23:59:59.000Z"),
      reason: "Cuenta manual vencida para pruebas demo.",
      createdById: owner.id,
      approvedById: owner.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: {
      email: "manager.saas@demo.com",
    },
    update: {
      name: "Marta SaaS",
      passwordHash: passwordHashEmployee,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Marta SaaS",
      email: "manager.saas@demo.com",
      passwordHash: passwordHashEmployee,
      status: UserStatus.ACTIVE,
    },
  });

  const accountOwner = await prisma.user.upsert({
    where: {
      email: "owner.saas@demo.com",
    },
    update: {
      name: "Laura Costa",
      passwordHash: passwordHashOwner,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Laura Costa",
      email: "owner.saas@demo.com",
      passwordHash: passwordHashOwner,
      status: UserStatus.ACTIVE,
    },
  });

  const tenantRich = await prisma.tenant.upsert({
    where: {
      id: "demo-saas-001",
    },
    update: {
      name: "Asociacion Costa Verde",
      legalName: "Asociacion Cannabica Costa Verde",
      taxId: "G38492015",
      email: "admin@costaverde.demo",
      phone: "922555111",
      address: "Calle del Mar 18",
      city: "La Laguna",
      postalCode: "38201",
      country: "ES",
      status: TenantStatus.ACTIVE,
      accessStatus: TenantAccessStatus.ENABLED,
      lifecycleStage: TenantLifecycleStage.ACTIVE_AT_RISK,
      riskLevel: TenantRiskLevel.MEDIUM,
      accountHealth: PlatformAccountHealth.FOLLOW_UP,
      platformNotes:
        "Empresa demo para testing de plataforma. Pago manual, seguimiento comercial y recobro activo.",
      lastContactAt: new Date("2026-06-19T10:30:00.000Z"),
      nextReviewAt: new Date("2026-06-27T09:00:00.000Z"),
      onboardingStartedAt: new Date("2026-05-28T09:00:00.000Z"),
      onboardingCompletedAt: new Date("2026-06-06T18:00:00.000Z"),
      activatedAt: new Date("2026-06-07T09:30:00.000Z"),
      accountOwnerId: platformOps.id,
    },
    create: {
      id: "demo-saas-001",
      name: "Asociacion Costa Verde",
      legalName: "Asociacion Cannabica Costa Verde",
      taxId: "G38492015",
      email: "admin@costaverde.demo",
      phone: "922555111",
      address: "Calle del Mar 18",
      city: "La Laguna",
      postalCode: "38201",
      country: "ES",
      status: TenantStatus.ACTIVE,
      accessStatus: TenantAccessStatus.ENABLED,
      lifecycleStage: TenantLifecycleStage.ACTIVE_AT_RISK,
      riskLevel: TenantRiskLevel.MEDIUM,
      accountHealth: PlatformAccountHealth.FOLLOW_UP,
      platformNotes:
        "Empresa demo para testing de plataforma. Pago manual, seguimiento comercial y recobro activo.",
      lastContactAt: new Date("2026-06-19T10:30:00.000Z"),
      nextReviewAt: new Date("2026-06-27T09:00:00.000Z"),
      onboardingStartedAt: new Date("2026-05-28T09:00:00.000Z"),
      onboardingCompletedAt: new Date("2026-06-06T18:00:00.000Z"),
      activatedAt: new Date("2026-06-07T09:30:00.000Z"),
      accountOwnerId: platformOps.id,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenantRich.id,
        userId: accountOwner.id,
      },
    },
    update: {
      role: UserRole.OWNER,
      status: TenantUserStatus.ACTIVE,
    },
    create: {
      tenantId: tenantRich.id,
      userId: accountOwner.id,
      role: UserRole.OWNER,
      status: TenantUserStatus.ACTIVE,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenantRich.id,
        userId: manager.id,
      },
    },
    update: {
      role: UserRole.MANAGER,
      status: TenantUserStatus.ACTIVE,
    },
    create: {
      tenantId: tenantRich.id,
      userId: manager.id,
      role: UserRole.MANAGER,
      status: TenantUserStatus.ACTIVE,
    },
  });

  await enableModulesForTenant(
    tenantRich.id,
    activeModules.map((module) => module.id),
  );

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenantRich.id },
    update: {
      displayName: "Costa Verde Club",
      primaryColor: "#0F766E",
      accentColor: "#14B8A6",
      defaultDensity: "compact",
      memberNumberPrefix: "CV",
      autoGenerateMemberNumber: true,
      recommendedOpeningCash: 150,
      alertOpenCashSessionMinutes: 180,
    },
    create: {
      tenantId: tenantRich.id,
      displayName: "Costa Verde Club",
      primaryColor: "#0F766E",
      accentColor: "#14B8A6",
      defaultDensity: "compact",
      memberNumberPrefix: "CV",
      autoGenerateMemberNumber: true,
      recommendedOpeningCash: 150,
      alertOpenCashSessionMinutes: 180,
    },
  });

  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenantRich.id },
    update: {
      planId: proPlan?.id ?? null,
      status: TenantSubscriptionStatus.PAST_DUE,
      startsAt: new Date("2026-05-01T09:00:00.000Z"),
      nextRenewalAt: new Date("2026-06-25T09:00:00.000Z"),
      trialEndsAt: null,
      endsAt: null,
      suspendedAt: null,
      cancelledAt: null,
      notes:
        "Cliente demo con cobro manual. Tiene una factura vencida y seguimiento activo desde plataforma.",
    },
    create: {
      tenantId: tenantRich.id,
      planId: proPlan?.id ?? null,
      status: TenantSubscriptionStatus.PAST_DUE,
      startsAt: new Date("2026-05-01T09:00:00.000Z"),
      nextRenewalAt: new Date("2026-06-25T09:00:00.000Z"),
      notes:
        "Cliente demo con cobro manual. Tiene una factura vencida y seguimiento activo desde plataforma.",
    },
  });

  await prisma.tenantContact.deleteMany({
    where: { tenantId: tenantRich.id },
  });
  await prisma.tenantContact.createMany({
    data: [
      {
        tenantId: tenantRich.id,
        name: "Laura Costa",
        role: "Presidenta",
        email: "laura@costaverde.demo",
        phone: "600111222",
        isPrimary: true,
        notes: "Contacto principal para renovaciones y cobros.",
      },
      {
        tenantId: tenantRich.id,
        name: "Carlos Medina",
        role: "Administracion",
        email: "admin@costaverde.demo",
        phone: "600111333",
        isPrimary: false,
        notes: "Valida facturas y pagos manuales.",
      },
    ],
  });

  await prisma.tenantOnboardingTask.deleteMany({
    where: { tenantId: tenantRich.id },
  });
  await prisma.tenantOnboardingTask.createMany({
    data: [
      {
        tenantId: tenantRich.id,
        title: "Configurar branding y datos fiscales",
        description: "Personalizacion inicial de la cuenta y validacion de razon social.",
        status: OnboardingTaskStatus.COMPLETED,
        owner: "Marta SaaS",
        dueAt: new Date("2026-05-29T10:00:00.000Z"),
        completedAt: new Date("2026-05-29T16:00:00.000Z"),
        sortOrder: 10,
      },
      {
        tenantId: tenantRich.id,
        title: "Cargar equipo inicial",
        description: "Dar de alta owner, manager y perfiles operativos.",
        status: OnboardingTaskStatus.COMPLETED,
        owner: "Marta SaaS",
        dueAt: new Date("2026-05-30T10:00:00.000Z"),
        completedAt: new Date("2026-05-31T12:00:00.000Z"),
        sortOrder: 20,
      },
      {
        tenantId: tenantRich.id,
        title: "Activar protocolo de cobro manual",
        description: "Definir circuito administrativo para renovaciones y seguimiento.",
        status: OnboardingTaskStatus.IN_PROGRESS,
        owner: "Equipo Finanzas",
        dueAt: new Date("2026-06-24T09:00:00.000Z"),
        sortOrder: 30,
      },
      {
        tenantId: tenantRich.id,
        title: "Cerrar validacion de formacion",
        description: "Pendiente de validacion final del equipo del club.",
        status: OnboardingTaskStatus.BLOCKED,
        owner: "Soporte",
        dueAt: new Date("2026-06-28T09:00:00.000Z"),
        sortOrder: 40,
      },
    ],
  });

  await prisma.tenantCollectionCase.upsert({
    where: { tenantId: tenantRich.id },
    update: {
      assignedToId: platformOps.id,
      status: PlatformCollectionStatus.CONTACTED,
      notes:
        "Se contacto con administracion. Esperan regularizar la factura vencida junto a la renovacion de junio.",
      openedAt: new Date("2026-06-15T10:00:00.000Z"),
      lastContactAt: new Date("2026-06-19T10:30:00.000Z"),
      nextActionAt: new Date("2026-06-24T09:30:00.000Z"),
      promiseDate: new Date("2026-06-25T12:00:00.000Z"),
      closedAt: null,
    },
    create: {
      tenantId: tenantRich.id,
      assignedToId: platformOps.id,
      status: PlatformCollectionStatus.CONTACTED,
      notes:
        "Se contacto con administracion. Esperan regularizar la factura vencida junto a la renovacion de junio.",
      openedAt: new Date("2026-06-15T10:00:00.000Z"),
      lastContactAt: new Date("2026-06-19T10:30:00.000Z"),
      nextActionAt: new Date("2026-06-24T09:30:00.000Z"),
      promiseDate: new Date("2026-06-25T12:00:00.000Z"),
    },
  });

  await prisma.tenantAccountActivity.deleteMany({
    where: { tenantId: tenantRich.id },
  });
  await prisma.tenantAccountActivity.createMany({
    data: [
      {
        tenantId: tenantRich.id,
        actorUserId: superadmin.id,
        type: PlatformAccountActivityType.NOTE,
        title: "Alta inicial completada",
        notes: "Se creo la cuenta y se asigno owner del club.",
        createdAt: new Date("2026-05-28T11:00:00.000Z"),
      },
      {
        tenantId: tenantRich.id,
        actorUserId: platformOps.id,
        type: PlatformAccountActivityType.CONTACT,
        title: "Llamada de seguimiento",
        notes: "Revisamos onboarding y proxima renovacion manual.",
        createdAt: new Date("2026-06-10T10:15:00.000Z"),
      },
      {
        tenantId: tenantRich.id,
        actorUserId: platformOps.id,
        type: PlatformAccountActivityType.COLLECTION,
        title: "Aviso de factura vencida",
        notes: "Se notifico la factura INV-DEMO-002 y se acordo seguimiento.",
        createdAt: new Date("2026-06-19T10:30:00.000Z"),
      },
      {
        tenantId: tenantRich.id,
        actorUserId: platformOps.id,
        type: PlatformAccountActivityType.PROMISE,
        title: "Promesa de pago",
        notes: "Compromiso de pago para el 25/06 junto a renovacion.",
        createdAt: new Date("2026-06-20T12:00:00.000Z"),
      },
    ],
  });

  await prisma.platformSupportSession.upsert({
    where: { id: "support-demo-001" },
    update: {
      tenantId: tenantRich.id,
      openedById: platformOps.id,
      closedById: null,
      reason: "Seguimiento de renovacion manual y factura vencida",
      status: "OPEN",
      notes:
        "Sesion abierta para acompanar al club en regularizacion administrativa.",
      openedAt: new Date("2026-06-20T09:15:00.000Z"),
      closedAt: null,
    },
    create: {
      id: "support-demo-001",
      tenantId: tenantRich.id,
      openedById: platformOps.id,
      reason: "Seguimiento de renovacion manual y factura vencida",
      status: "OPEN",
      notes:
        "Sesion abierta para acompanar al club en regularizacion administrativa.",
      openedAt: new Date("2026-06-20T09:15:00.000Z"),
    },
  });

  await prisma.platformInvoice.upsert({
    where: { number: "INV-DEMO-001" },
    update: {
      tenantId: tenantRich.id,
      description: "Suscripcion Pro mayo 2026",
      amount: 99,
      currency: "EUR",
      status: PlatformInvoiceStatus.PAID,
      issuedAt: new Date("2026-05-01T09:00:00.000Z"),
      dueAt: new Date("2026-05-05T23:59:59.000Z"),
      paidAt: new Date("2026-05-04T12:15:00.000Z"),
      voidedAt: null,
    },
    create: {
      number: "INV-DEMO-001",
      tenantId: tenantRich.id,
      description: "Suscripcion Pro mayo 2026",
      amount: 99,
      currency: "EUR",
      status: PlatformInvoiceStatus.PAID,
      issuedAt: new Date("2026-05-01T09:00:00.000Z"),
      dueAt: new Date("2026-05-05T23:59:59.000Z"),
      paidAt: new Date("2026-05-04T12:15:00.000Z"),
    },
  });

  await prisma.platformInvoice.upsert({
    where: { number: "INV-DEMO-002" },
    update: {
      tenantId: tenantRich.id,
      description: "Suscripcion Pro junio 2026",
      amount: 99,
      currency: "EUR",
      status: PlatformInvoiceStatus.ISSUED,
      issuedAt: new Date("2026-06-01T09:00:00.000Z"),
      dueAt: new Date("2026-06-10T23:59:59.000Z"),
      paidAt: null,
      voidedAt: null,
    },
    create: {
      number: "INV-DEMO-002",
      tenantId: tenantRich.id,
      description: "Suscripcion Pro junio 2026",
      amount: 99,
      currency: "EUR",
      status: PlatformInvoiceStatus.ISSUED,
      issuedAt: new Date("2026-06-01T09:00:00.000Z"),
      dueAt: new Date("2026-06-10T23:59:59.000Z"),
    },
  });

  const invoiceMay = await prisma.platformInvoice.findUnique({
    where: { number: "INV-DEMO-001" },
    select: { id: true },
  });
  const invoiceJune = await prisma.platformInvoice.findUnique({
    where: { number: "INV-DEMO-002" },
    select: { id: true },
  });

  await prisma.platformPayment.upsert({
    where: { id: "pay-demo-001" },
    update: {
      tenantId: tenantRich.id,
      invoiceId: invoiceMay?.id ?? null,
      amount: 99,
      currency: "EUR",
      method: "Transferencia",
      reference: "TRX-DEMO-MAYO",
      status: PlatformPaymentStatus.PAID,
      paidAt: new Date("2026-05-04T12:15:00.000Z"),
    },
    create: {
      id: "pay-demo-001",
      tenantId: tenantRich.id,
      invoiceId: invoiceMay?.id ?? null,
      amount: 99,
      currency: "EUR",
      method: "Transferencia",
      reference: "TRX-DEMO-MAYO",
      status: PlatformPaymentStatus.PAID,
      paidAt: new Date("2026-05-04T12:15:00.000Z"),
    },
  });

  await prisma.platformPayment.upsert({
    where: { id: "pay-demo-002" },
    update: {
      tenantId: tenantRich.id,
      invoiceId: invoiceJune?.id ?? null,
      amount: 40,
      currency: "EUR",
      method: "Efectivo",
      reference: "ANTICIPO-JUNIO",
      status: PlatformPaymentStatus.PAID,
      paidAt: new Date("2026-06-03T17:00:00.000Z"),
    },
    create: {
      id: "pay-demo-002",
      tenantId: tenantRich.id,
      invoiceId: invoiceJune?.id ?? null,
      amount: 40,
      currency: "EUR",
      method: "Efectivo",
      reference: "ANTICIPO-JUNIO",
      status: PlatformPaymentStatus.PAID,
      paidAt: new Date("2026-06-03T17:00:00.000Z"),
    },
  });

  console.log("Demo club created:", tenant.name);
  console.log("Demo owner: owner@demo.com / Owner123!");
  console.log("Demo employee: employee@demo.com / Employee123!");
  console.log("Demo superadmin: superadmin@demo.com / Superadmin123!");
  console.log("Platform ops: ops@demo.com / Employee123!");
  console.log("Platform company demo:", tenantRich.name);
  console.log("Platform company owner: owner.saas@demo.com / Owner123!");
  console.log("Platform company manager: manager.saas@demo.com / Employee123!");
}

async function main() {
  console.log("🌱 Iniciando seed de permisos y roles...");

  const createdPermissions = new Map<string, string>();

  for (const permission of permissions) {
    const created = await prisma.permission.upsert({
      where: {
        key: permission.key,
      },
      update: {
        module: permission.module,
        description: permission.description,
      },
      create: permission,
    });

    createdPermissions.set(created.key, created.id);
  }

  console.log(`✅ Permisos creados/actualizados: ${createdPermissions.size}`);

  for (const [role, permissionKeys] of Object.entries(rolePermissions) as [
    UserRole,
    string[],
  ][]) {
    for (const permissionKey of permissionKeys) {
      const permissionId = createdPermissions.get(permissionKey);

      if (!permissionId) {
        throw new Error(`Permiso no encontrado: ${permissionKey}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role,
            permissionId,
          },
        },
        update: {},
        create: {
          role,
          permissionId,
        },
      });
    }

    console.log(`✅ Permisos asignados al rol: ${role}`);
  }

  await seedPlatformPlans();
  console.log("✅ Planes de plataforma creados/actualizados.");
  await seedPlatformModules();
  console.log("✅ Módulos de plataforma creados/actualizados.");
  await seedPlanModules();
  console.log("✅ Módulos por plan creados/actualizados.");

  await seedDemoData();

  console.log("🎉 Seed completado correctamente.");
}

async function seedMemberPortal() {
  const TENANT = "demo-club-001";
  console.log("🎮 Seeding Portal del Socio...");

  // Socio demo
  const member = await prisma.member.upsert({
    where: { tenantId_memberNumber: { tenantId: TENANT, memberNumber: "SOCIO-DEMO-001" } },
    update: {
      firstName: "Socio",
      lastName: "Demo",
      email: "socio@demo.com",
      phone: "600111222",
      memberClass: "VIP" as MemberClass,
      status: "ACTIVE" as MemberStatus,
    },
    create: {
      tenantId: TENANT,
      memberNumber: "SOCIO-DEMO-001",
      firstName: "Socio",
      lastName: "Demo",
      email: "socio@demo.com",
      phone: "600111222",
      memberClass: "VIP" as MemberClass,
      status: "ACTIVE" as MemberStatus,
    },
  });

  // Point balance
  await prisma.memberPointBalance.upsert({
    where: { tenantId_memberId: { tenantId: TENANT, memberId: member.id } },
    update: { points: 100, lifetimePoints: 100 },
    create: { tenantId: TENANT, memberId: member.id, points: 100, lifetimePoints: 100 },
  });

  // Initial transaction
  const existingTx = await prisma.memberPointTransaction.findFirst({
    where: { tenantId: TENANT, memberId: member.id, sourceType: "DEMO_SEED" },
  });
  if (!existingTx) {
    await prisma.memberPointTransaction.create({
      data: { tenantId: TENANT, memberId: member.id, type: "EARNED", points: 100, reason: "Puntos iniciales de prueba", sourceType: "DEMO_SEED", sourceId: "SOCIO-DEMO-001" },
    });
  }

  // MemberAppSettings
  await prisma.memberAppSettings.upsert({
    where: { tenantId: TENANT },
    update: {
      enabled: true,
      catalogEnabled: true,
      pointsEnabled: true,
      digitalCardEnabled: true,
      allowProfileEdit: true,
      showProductValues: true,
      showApproxAvailability: true,
      gamesEnabled: true,
      missionsEnabled: true,
      rewardsEnabled: true,
      allowRewardRedemption: true,
      requireRewardApproval: true,
      maxDailyGamePlays: 5,
      maxDailyPointsFromGames: 100,
    },
    create: {
      tenantId: TENANT, enabled: true, catalogEnabled: true, pointsEnabled: true,
      digitalCardEnabled: true, allowProfileEdit: true, showProductValues: true,
      showApproxAvailability: true, gamesEnabled: true, missionsEnabled: true,
      rewardsEnabled: true, allowRewardRedemption: true, requireRewardApproval: true,
      maxDailyGamePlays: 5, maxDailyPointsFromGames: 100,
    },
  });

  // Games — archive old types, keep only Phaser mini-games
  await prisma.rewardGame.updateMany({
    where: { tenantId: TENANT, type: { in: ["DAILY_CHECKIN", "QUIZ", "SPIN", "SURVEY", "CUSTOM"] } },
    data: { status: "ARCHIVED" },
  });

  await prisma.rewardGame.upsert({
    where: { id: "demo-game-bubble-pop" },
    update: {
      tenantId: TENANT,
      title: "Bubble Pop",
      description: "Explota burbujas antes de que se escapen. Las doradas valen x5 y los combos multiplican tus puntos.",
      type: "BUBBLE_POP",
      status: "ACTIVE",
      pointsReward: 15,
      cooldownHours: 2,
      maxPlaysPerDay: 5,
    },
    create: {
      id: "demo-game-bubble-pop", tenantId: TENANT, title: "Bubble Pop",
      description: "Explota burbujas antes de que se escapen. Las doradas valen x5 y los combos multiplican tus puntos.",
      type: "BUBBLE_POP", status: "ACTIVE", pointsReward: 15, cooldownHours: 2, maxPlaysPerDay: 5,
    },
  });

  await prisma.rewardGame.upsert({
    where: { id: "demo-game-memory-cards" },
    update: {
      tenantId: TENANT,
      title: "Memory Cards",
      description: "Encuentra todas las parejas de cartas antes de que se agote el tiempo. Las rachas suman bonus extra.",
      type: "MEMORY_CARDS",
      status: "ACTIVE",
      pointsReward: 20,
      cooldownHours: 3,
      maxPlaysPerDay: 3,
    },
    create: {
      id: "demo-game-memory-cards", tenantId: TENANT, title: "Memory Cards",
      description: "Encuentra todas las parejas de cartas antes de que se agote el tiempo. Las rachas suman bonus extra.",
      type: "MEMORY_CARDS", status: "ACTIVE", pointsReward: 20, cooldownHours: 3, maxPlaysPerDay: 3,
    },
  });

  await prisma.rewardGame.upsert({
    where: { id: "demo-game-reaction-tap" },
    update: {
      tenantId: TENANT,
      title: "Reaction Tap",
      description: "Toca los circulos lo mas rapido posible. 20 rondas para demostrar tus reflejos.",
      type: "REACTION_TAP",
      status: "ACTIVE",
      pointsReward: 18,
      cooldownHours: 2,
      maxPlaysPerDay: 4,
    },
    create: {
      id: "demo-game-reaction-tap", tenantId: TENANT, title: "Reaction Tap",
      description: "Toca los circulos lo mas rapido posible. 20 rondas para demostrar tus reflejos.",
      type: "REACTION_TAP", status: "ACTIVE", pointsReward: 18, cooldownHours: 2, maxPlaysPerDay: 4,
    },
  });

  // Missions
  await prisma.mission.upsert({
    where: { id: "demo-mission-profile" },
    update: {
      tenantId: TENANT,
      title: "Completa tu perfil",
      description: "Rellena tus datos basicos para ganar puntos.",
      type: "COMPLETE_PROFILE",
      status: "ACTIVE",
      pointsReward: 25,
      targetValue: 1,
    },
    create: {
      id: "demo-mission-profile", tenantId: TENANT, title: "Completa tu perfil",
      description: "Rellena tus datos basicos para ganar puntos.",
      type: "COMPLETE_PROFILE", status: "ACTIVE", pointsReward: 25, targetValue: 1,
    },
  });

  await prisma.mission.upsert({
    where: { id: "demo-mission-checkin" },
    update: {
      tenantId: TENANT,
      title: "Primer check-in",
      description: "Haz tu primer check-in diario.",
      type: "CHECK_IN",
      status: "ACTIVE",
      pointsReward: 10,
      targetValue: 1,
    },
    create: {
      id: "demo-mission-checkin", tenantId: TENANT, title: "Primer check-in",
      description: "Haz tu primer check-in diario.",
      type: "CHECK_IN", status: "ACTIVE", pointsReward: 10, targetValue: 1,
    },
  });

  await prisma.mission.upsert({
    where: { id: "demo-mission-quiz" },
    update: {
      tenantId: TENANT,
      title: "Participa en un quiz",
      description: "Responde tu primera pregunta del quiz.",
      type: "QUIZ_PARTICIPATION",
      status: "ACTIVE",
      pointsReward: 15,
      targetValue: 1,
    },
    create: {
      id: "demo-mission-quiz", tenantId: TENANT, title: "Participa en un quiz",
      description: "Responde tu primera pregunta del quiz.",
      type: "QUIZ_PARTICIPATION", status: "ACTIVE", pointsReward: 15, targetValue: 1,
    },
  });

  // Rewards
  await prisma.reward.upsert({
    where: { id: "demo-reward-badge" },
    update: {
      tenantId: TENANT,
      title: "Insignia de socio destacado",
      description: "Reconocimiento interno para socios activos en el Portal del Socio.",
      pointsCost: 50,
      status: "ACTIVE",
      requiresApproval: true,
      stockLimit: null,
      currentStock: null,
      terms: null,
    },
    create: {
      id: "demo-reward-badge", tenantId: TENANT, title: "Insignia de socio destacado",
      description: "Reconocimiento interno para socios activos en el Portal del Socio.",
      pointsCost: 50, status: "ACTIVE", requiresApproval: true,
    },
  });

  await prisma.reward.upsert({
    where: { id: "demo-reward-bonus" },
    update: {
      tenantId: TENANT,
      title: "Bonificacion especial revisable",
      description: "Solicitud revisable por el club. No se aplica automaticamente.",
      pointsCost: 80,
      status: "ACTIVE",
      requiresApproval: true,
      stockLimit: null,
      currentStock: null,
      terms: "Sujeto a revision y aprobacion del club.",
    },
    create: {
      id: "demo-reward-bonus", tenantId: TENANT, title: "Bonificacion especial revisable",
      description: "Solicitud revisable por el club. No se aplica automaticamente.",
      pointsCost: 80, status: "ACTIVE", requiresApproval: true,
      terms: "Sujeto a revision y aprobacion del club.",
    },
  });

  console.log("✅ Portal del Socio seed completado");
}

main()
  .then(() => seedMemberPortal())
  .catch((error) => {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  
