import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

export type AuditTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type FormattedAuditLog = {
  title: string;
  description: string;
  details: string[];
  tone: AuditTone;
  icon: string;
  category: string;
  actor: string;
  dateLabel: string;
  technicalAction: string;
};

type JsonRecord = Record<string, unknown>;

const statusLabels: Record<string, string> = {
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  BANNED: 'Vetado',
  INACTIVE: 'Inactivo',
  ARCHIVED: 'Archivado',
  EMERGENCY_LOCKED: 'Emergencia activa',
  ENABLED: 'Acceso activo',
  CASH: 'Efectivo',
  CASH_IN: 'Entrada manual',
  CASH_OUT: 'Salida manual',
  CORRECTION: 'Corrección',
  EXPENSE: 'Salida',
  SALE_CASH_IN: 'Entrada por dispensación',
  RECEIVABLE_CASH_IN: 'Registro de aportación de pendiente',
  THIRD_PARTY_CASH_OUT: 'Aportación a tercero',
  WITHDRAWAL: 'Retirada',
  CORRECTION_IN: 'Corrección positiva',
  CORRECTION_OUT: 'Corrección negativa',
  SUPPLIER: 'Proveedor',
  SERVICE_PROVIDER: 'Servicio',
  COLLABORATOR: 'Colaborador',
  SUPPLIER_PAYMENT: 'Aportación a proveedor',
  SERVICE_PAYMENT: 'Aportación de servicio',
  COLLABORATOR_PAYMENT: 'Aportación a colaborador',
  CASH_WITHDRAWAL: 'Retirada',
  STANDARD: 'Dispensación estándar',
  CREDIT: 'Pendiente de aportación',
  PARTIAL_CREDIT: 'Aportación parcial',
  PAID: 'Regularizado',
  PARTIALLY_PAID: 'Parcialmente regularizado',
  PENDING: 'Pendiente',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  BIZUM: 'Bizum',
  DIRECT: 'Directa',
  GROUP: 'Grupo',
  OWNER: 'Propietario',
  MEMBER: 'Miembro',
};

const fieldLabels: Record<string, string> = {
  name: 'Nombre',
  sku: 'SKU',
  price: 'Valor',
  cost: 'Coste',
  status: 'Estado',
  phone: 'Teléfono',
  email: 'Email',
  address: 'Dirección',
  firstName: 'Nombre',
  lastName: 'Apellidos',
  memberNumber: 'Número de socio',
  documentType: 'Tipo de documento',
  documentNumber: 'Documento',
  unitType: 'Unidad',
  categoryId: 'Categoría',
  timezone: 'Zona horaria',
  allowCreditSales: 'Permitir pendientes de aportación',
  requireCreditReason: 'Motivo en pendientes de aportación',
  showSecurityBadges: 'Badges de seguridad',
  requireAccessLink: 'Access link requerido',
};

const moneyFields = new Set([
  'openingCash',
  'closingCash',
  'expectedCash',
  'difference',
  'subtotal',
  'discount',
  'total',
  'price',
  'cost',
  'unitPrice',
  'amount',
]);

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currency(value: unknown): string {
  return formatCurrency(numberValue(value));
}

function labelStatus(value: unknown): string {
  const raw = text(value);
  return statusLabels[raw] ?? raw;
}

function actorLabel(log: AuditLog): string {
  return log.user?.name ?? log.user?.email ?? 'Sistema';
}

function formatAuditDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  if (isToday(date)) return `Hoy, ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Ayer, ${format(date, 'HH:mm')}`;
  return format(date, 'd MMMM yyyy, HH:mm', { locale: es });
}

function memberName(value: JsonRecord): string {
  const fullName = `${text(value.firstName, '')} ${text(value.lastName, '')}`.trim();
  return fullName || text(value.memberName, '') || text(value.memberId, 'socio');
}

function productName(value: JsonRecord): string {
  return text(value.name, '') || text(value.productName, '') || text(value.productId, 'producto');
}

function paymentMethods(value: unknown): string {
  if (!Array.isArray(value)) return '-';
  return value
    .map((payment) => labelStatus(asRecord(payment).method))
    .filter(Boolean)
    .join(', ');
}

function productList(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return '-';
  return value
    .map((item) => {
      const record = asRecord(item);
      const name = text(record.productNameSnapshot ?? record.name ?? record.productId, 'Producto');
      const quantity = text(record.quantity, '1');
      const requestedGrams = record.quantityGrams;
      const actualGrams = record.actualWeightGrams;
      const differenceGrams = record.weightDifferenceGrams;

      if (record.scaleVerified && actualGrams !== null && actualGrams !== undefined) {
        const diff = Number(differenceGrams ?? 0);
        const diffLabel =
          diff > 0
            ? `merma +${text(differenceGrams)} g`
            : diff < 0
              ? `diferencia ${text(differenceGrams)} g`
              : 'sin diferencia';

        return `${name}: solicitado ${text(requestedGrams ?? quantity)} g, peso real ${text(actualGrams)} g, ${diffLabel}`;
      }

      return `${name} x${quantity}`;
    })
    .join(', ');
}

function valueForField(field: string, value: unknown): string {
  if (moneyFields.has(field)) return currency(value);
  if (field === 'status') return labelStatus(value);
  return text(value);
}

function changedDetails(oldValue: JsonRecord, newValue: JsonRecord, fields: string[]): string[] {
  return fields
    .filter((field) => JSON.stringify(oldValue[field] ?? null) !== JSON.stringify(newValue[field] ?? null))
    .map((field) => {
      const label = fieldLabels[field] ?? field;
      return `${label}: antes ${valueForField(field, oldValue[field])}, ahora ${valueForField(field, newValue[field])}`;
    });
}

function buildLog(
  log: AuditLog,
  override: Partial<Omit<FormattedAuditLog, 'actor' | 'dateLabel' | 'technicalAction'>>,
): FormattedAuditLog {
  return {
    title: 'Actividad registrada',
    description: 'Se registró una acción en el sistema.',
    details: [],
    tone: 'neutral',
    icon: 'activity',
    category: 'Sistema',
    actor: actorLabel(log),
    dateLabel: formatAuditDate(log.createdAt),
    technicalAction: log.action,
    ...override,
  };
}

export function formatAuditLog(log: AuditLog): FormattedAuditLog {
  const oldValue = asRecord(log.oldValue);
  const newValue = asRecord(log.newValue);
  const actor = actorLabel(log);

  switch (log.action) {
    case 'chat.conversation_created':
      return buildLog(log, {
        title: 'Conversación creada',
        description: `${actor} inició una conversación interna.`,
        details: [`Tipo: ${labelStatus(newValue.type)}`, `Participantes: ${text(newValue.participantCount)}`],
        tone: 'info',
        icon: 'user',
        category: 'Chat interno',
      });
    case 'chat.group_created':
      return buildLog(log, {
        title: 'Grupo de chat creado',
        description: `${actor} creó un grupo de chat interno.`,
        details: [`Tipo: ${labelStatus(newValue.type)}`, `Participantes: ${text(newValue.participantCount)}`],
        tone: 'info',
        icon: 'user',
        category: 'Chat interno',
      });
    case 'chat.message_deleted':
      return buildLog(log, {
        title: 'Mensaje eliminado',
        description: `${actor} eliminó un mensaje del chat interno.`,
        details: [`Conversación: ${text(newValue.conversationId)}`],
        tone: 'warning',
        icon: 'user',
        category: 'Chat interno',
      });
    case 'chat.device_key_revoked':
      return buildLog(log, {
        title: 'Dispositivo de chat revocado',
        description: `${actor} revocó una clave de dispositivo del chat interno.`,
        details: [`Dispositivo: ${text(newValue.deviceId)}`, `Algoritmo: ${text(newValue.algorithm)}`],
        tone: 'warning',
        icon: 'shield',
        category: 'Chat interno',
      });
    case 'chat.conversation_member_added':
      return buildLog(log, {
        title: 'Participante añadido al chat',
        description: `${actor} añadió participantes a un grupo de chat interno.`,
        details: [`Añadidos: ${text(newValue.addedCount)}`],
        tone: 'info',
        icon: 'user',
        category: 'Chat interno',
      });
    case 'chat.conversation_member_removed':
      return buildLog(log, {
        title: 'Participante quitado del chat',
        description: `${actor} quitó un participante de un grupo de chat interno.`,
        details: ['Se actualizó la lista de participantes.'],
        tone: 'warning',
        icon: 'user',
        category: 'Chat interno',
      });
    case 'chat.conversation_member_left':
      return buildLog(log, {
        title: 'Participante salió del chat',
        description: `${actor} salió de un grupo de chat interno.`,
        details: [`Participantes restantes: ${text(newValue.participantCount)}`],
        tone: 'warning',
        icon: 'user',
        category: 'Chat interno',
      });
    case 'chat.conversation_member_role_updated':
      return buildLog(log, {
        title: 'Rol de chat actualizado',
        description: `${actor} actualizó el rol de un participante en un grupo de chat.`,
        details: [`Nuevo rol: ${labelStatus(newValue.role)}`],
        tone: 'info',
        icon: 'user',
        category: 'Chat interno',
      });
    case 'cash.opened':
      return buildLog(log, {
        title: 'Caja abierta',
        description: `${actor} abrió una caja con ${currency(newValue.openingCash)} de efectivo inicial.`,
        details: [`Efectivo inicial: ${currency(newValue.openingCash)}`],
        tone: 'success',
        icon: 'cash',
        category: 'Caja',
      });
    case 'cash.closed': {
      const difference = numberValue(newValue.difference);
      return buildLog(log, {
        title: difference === 0 ? 'Caja cerrada correctamente' : difference > 0 ? 'Caja cerrada con sobrante' : 'Caja cerrada con faltante',
        description: `${actor} cerró una caja. Sistema esperaba ${currency(newValue.expectedCash)}, se declaró ${currency(newValue.closingCash)} y la diferencia fue de ${currency(newValue.difference)}.`,
        details: [
          `Efectivo inicial: ${currency(newValue.openingCash ?? oldValue.openingCash)}`,
          `Efectivo esperado: ${currency(newValue.expectedCash)}`,
          `Efectivo declarado: ${currency(newValue.closingCash)}`,
          `Diferencia: ${currency(newValue.difference)}`,
        ],
        tone: difference < 0 ? 'danger' : difference > 0 ? 'warning' : 'success',
        icon: 'cash',
        category: 'Caja',
      });
    }
    case 'sale.created':
    case 'sale.updated':
    case 'sale.cancelled':
    case 'sale.cash_created':
    case 'sale.credit_created':
      return buildLog(log, {
        title:
          log.action === 'sale.cancelled'
            ? 'Dispensación cancelada'
            : log.action === 'sale.updated'
              ? 'Dispensación actualizada'
              : log.action === 'sale.credit_created'
                ? 'Dispensación con pendiente registrada'
                : log.action === 'sale.cash_created'
                  ? 'Dispensación en efectivo registrada'
                  : 'Dispensación registrada',
        description:
          log.action === 'sale.cancelled'
            ? `${actor} canceló una dispensación.`
            : log.action === 'sale.updated'
              ? `${actor} actualizó una dispensación por ${currency(newValue.total ?? oldValue.total)}.`
              : log.action === 'sale.credit_created'
                ? `${actor} registró una dispensación de ${currency(newValue.total)}. Se registraron ${currency(newValue.amountPaid)} en efectivo y quedaron ${currency(newValue.amountPending)} pendientes.`
                : `${actor} registró una dispensación por ${currency(newValue.total)}. Se registraron ${currency(newValue.amountPaid ?? newValue.total)} en efectivo y el cambio fue de ${currency(newValue.changeDue)}.`,
        details: [
          `Subtotal: ${currency(newValue.subtotal)}`,
          `Bonificación: ${currency(newValue.discount)}`,
          `Total: ${currency(newValue.total)}`,
          `Efectivo aplicado: ${currency(newValue.amountPaid ?? newValue.total)}`,
          `Pendiente: ${currency(newValue.amountPending)}`,
          `Cambio: ${currency(newValue.changeDue)}`,
          `Estado: ${labelStatus(newValue.settlementStatus)}`,
          ...(newValue.creditReason ? [`Motivo: ${text(newValue.creditReason)}`] : []),
          `Productos: ${productList(newValue.items)}`,
          `Métodos de aportación: ${paymentMethods(newValue.payments)}`,
        ],
        tone: log.action === 'sale.cancelled' ? 'danger' : log.action === 'sale.credit_created' ? 'warning' : 'success',
        icon: 'sale',
        category: 'Dispensaciones',
      });
    case 'receivable.created':
      return buildLog(log, {
        title: 'Pendiente de aportación creado',
        description: `Se creó una cuenta pendiente de ${currency(newValue.outstandingAmount ?? newValue.originalAmount)} para el socio ${text(newValue.memberName ?? newValue.memberId)}.`,
        details: [
          `Socio: ${text(newValue.memberId)}`,
          `Dispensación: ${text(newValue.saleId)}`,
          `Créditos originales: ${currency(newValue.originalAmount)}`,
          `Pendiente: ${currency(newValue.outstandingAmount)}`,
        ],
        tone: 'warning',
        icon: 'sale',
        category: 'Dispensaciones',
      });
    case 'receivable.payment_received':
    case 'payment.created':
      return buildLog(log, {
        title: 'Aportación registrada',
        description: `${actor} registró una aportación en efectivo de ${currency(newValue.amount)}.`,
        details: [
          `Socio: ${text(newValue.memberName ?? newValue.memberId)}`,
          `Pendiente de aportación: ${text(newValue.receivableId)}`,
          `Pendiente anterior: ${currency(newValue.previousOutstandingAmount)}`,
          `Aportación: ${currency(newValue.amount)}`,
          `Pendiente final: ${currency(newValue.newOutstandingAmount)}`,
        ],
        tone: numberValue(newValue.newOutstandingAmount) === 0 ? 'success' : 'warning',
        icon: 'sale',
        category: 'Dispensaciones',
      });
    case 'receivable.cancelled':
      return buildLog(log, {
        title: 'Pendiente de aportación cancelado',
        description: `${actor} canceló una cuenta pendiente.`,
        details: [`Pendiente anterior: ${currency(oldValue.outstandingAmount)}`, `Motivo: ${text(newValue.cancelReason)}`],
        tone: 'danger',
        icon: 'sale',
        category: 'Dispensaciones',
      });
    case 'cash.manual_movement_created':
      return buildLog(log, {
        title: 'Movimiento de caja registrado',
        description: `${actor} registró un movimiento de caja de ${currency(newValue.amount)}.`,
        details: [`Tipo: ${labelStatus(newValue.type)}`, `Créditos: ${currency(newValue.amount)}`, `Motivo: ${text(newValue.reason)}`],
        tone: ['WITHDRAWAL', 'EXPENSE', 'CORRECTION_OUT'].includes(text(newValue.type)) ? 'warning' : 'info',
        icon: 'cash',
        category: 'Caja',
      });
    case 'cash.movement_created':
    case 'cash.sale_in':
      return buildLog(log, {
        title:
          log.action === 'cash.sale_in' || text(newValue.type) === 'SALE_CASH_IN'
            ? 'Entrada por dispensación'
            : text(newValue.type) === 'RECEIVABLE_CASH_IN'
              ? 'Registro de aportación pendiente'
              : text(newValue.type) === 'THIRD_PARTY_CASH_OUT'
                ? 'Salida de caja por aportación a tercero'
                : 'Movimiento de caja registrado',
        description:
          log.action === 'cash.sale_in' || text(newValue.type) === 'SALE_CASH_IN'
            ? `${currency(newValue.amount)} entraron en caja por una dispensación.`
            : text(newValue.type) === 'RECEIVABLE_CASH_IN'
              ? `${currency(newValue.amount)} entraron en caja por el registro de aportación de una cuenta pendiente.`
              : text(newValue.type) === 'THIRD_PARTY_CASH_OUT'
                ? `${currency(newValue.amount)} salieron de caja por una aportación a tercero.`
                : `${actor} registró un movimiento de caja de ${currency(newValue.amount)}.`,
        details: [`Tipo: ${labelStatus(newValue.type)}`, `Créditos: ${currency(newValue.amount)}`, `Motivo: ${text(newValue.reason)}`],
        tone: 'info',
        icon: 'cash',
        category: 'Caja',
      });
    case 'third_party.created':
      return buildLog(log, {
        title: 'Tercero creado',
        description: `${actor} creó el tercero ${text(newValue.name)}.`,
        details: [`Tipo: ${labelStatus(newValue.type)}`, ...(newValue.phone ? [`Teléfono: ${text(newValue.phone)}`] : [])],
        tone: 'success',
        icon: 'user',
        category: 'Aportaciones a terceros',
      });
    case 'third_party.updated':
      return buildLog(log, {
        title: 'Tercero actualizado',
        description: `${actor} actualizó los datos de ${text(newValue.name, 'un tercero')}.`,
        details: changedDetails(oldValue, newValue, ['name', 'type', 'documentNumber', 'phone', 'email', 'status']),
        tone: 'warning',
        icon: 'user',
        category: 'Aportaciones a terceros',
      });
    case 'third_party.archived':
      return buildLog(log, {
        title: 'Tercero archivado',
        description: `${actor} archivó un tercero.`,
        details: [`Nombre: ${text(newValue.name)}`],
        tone: 'warning',
        icon: 'user',
        category: 'Aportaciones a terceros',
      });
    case 'third_party_payment.created':
      return buildLog(log, {
        title: 'Aportación a tercero registrada',
        description: `${actor} registró una aportación de ${currency(newValue.amount)} a ${text(newValue.thirdPartyName, 'un tercero')}.`,
        details: [`Categoría: ${labelStatus(newValue.category)}`, `Créditos: ${currency(newValue.amount)}`, `Motivo: ${text(newValue.reason)}`],
        tone: 'warning',
        icon: 'cash',
        category: 'Aportaciones a terceros',
      });
    case 'third_party_payment.cancelled':
      return buildLog(log, {
        title: 'Aportación a tercero cancelada',
        description: `${actor} canceló una aportación a tercero.`,
        details: [`Créditos: ${currency(oldValue.amount)}`, `Motivo: ${text(newValue.cancelReason)}`],
        tone: 'danger',
        icon: 'cash',
        category: 'Aportaciones a terceros',
      });
    case 'stock.sold':
      return buildLog(log, {
        title: 'Stock descontado por dispensación',
        description: newValue.stockQuantityGrams
          ? `Se descontó stock por dispensación con báscula: solicitado ${text(newValue.quantitySoldGrams)} g, peso real ${text(newValue.stockQuantityGrams)} g.`
          : `Se descontaron ${text(newValue.quantitySold)} unidades del stock por una dispensación.`,
        details: [`Producto: ${text(newValue.productName ?? newValue.productId)}`, `Dispensación relacionada: ${text(newValue.saleId)}`],
        tone: 'info',
        icon: 'stock',
        category: 'Stock',
      });
    case 'stock.added':
      return buildLog(log, {
        title: 'Stock añadido',
        description: `${actor} añadió ${text(newValue.quantityAdded)} unidades al inventario.`,
        details: [`Producto: ${text(newValue.productName ?? newValue.productId)}`, `Cantidad añadida: ${text(newValue.quantityAdded)}`],
        tone: 'success',
        icon: 'stock',
        category: 'Stock',
      });
    case 'stock.adjusted':
      return buildLog(log, {
        title: 'Stock ajustado manualmente',
        description: `${actor} ajustó manualmente el stock.`,
        details: [`Producto: ${text(newValue.productName ?? newValue.productId)}`, `Diferencia: ${text(newValue.difference)}`],
        tone: 'warning',
        icon: 'stock',
        category: 'Stock',
      });
    case 'stock.waste_registered':
    case 'stock.wasted':
      return buildLog(log, {
        title: newValue.source === 'scale' ? 'Merma automática por báscula registrada' : 'Merma registrada',
        description:
          newValue.source === 'scale'
            ? `Se registró automáticamente una merma de ${text(newValue.quantityLostGrams ?? newValue.quantityLost ?? newValue.quantity)} g por diferencia de báscula en ${text(newValue.productName ?? newValue.productId, 'un producto')}.`
            : `${actor} registró una merma de ${text(newValue.quantityLost ?? newValue.quantity)} en ${text(newValue.productName ?? newValue.productId, 'un producto')}.`,
        details: [`Motivo: ${text(newValue.reason)}`],
        tone: 'danger',
        icon: 'stock',
        category: 'Stock',
      });
    case 'product.created':
      return buildLog(log, {
        title: 'Producto creado',
        description: `${actor} creó el producto ${productName(newValue)}.`,
        details: [`SKU: ${text(newValue.sku)}`, `Valor: ${currency(newValue.price)}`],
        tone: 'success',
        icon: 'product',
        category: 'Productos',
      });
    case 'product.updated':
      return buildLog(log, {
        title: 'Producto actualizado',
        description: `${actor} actualizó el producto ${productName(newValue) || text(log.entityId)}.`,
        details: changedDetails(oldValue, newValue, ['name', 'sku', 'price', 'cost', 'status', 'categoryId', 'unitType']),
        tone: 'warning',
        icon: 'product',
        category: 'Productos',
      });
    case 'product.archived':
      return buildLog(log, {
        title: 'Producto archivado',
        description: `${actor} archivó un producto.`,
        details: [`Estado nuevo: ${labelStatus(newValue.status ?? 'ARCHIVED')}`],
        tone: 'warning',
        icon: 'product',
        category: 'Productos',
      });
    case 'member.created':
      return buildLog(log, {
        title: 'Socio creado',
        description: `${actor} registró al socio ${memberName(newValue)}.`,
        details: [`Número de socio: ${text(newValue.memberNumber)}`, ...(newValue.phone ? [`Teléfono: ${text(newValue.phone)}`] : [])],
        tone: 'success',
        icon: 'member',
        category: 'Socios',
      });
    case 'member.updated':
      return buildLog(log, {
        title: 'Socio actualizado',
        description: `${actor} actualizó la ficha de un socio.`,
        details: changedDetails(oldValue, newValue, ['firstName', 'lastName', 'phone', 'email', 'address', 'memberClass', 'status', 'memberNumber']),
        tone: 'warning',
        icon: 'member',
        category: 'Socios',
      });
    case 'member.class_updated':
      return buildLog(log, {
        title: 'Clase de socio actualizada',
        description: `${actor} cambió la clase de socio de ${labelStatus(oldValue.memberClass)} a ${labelStatus(newValue.memberClass)}.`,
        details: [],
        tone: 'info',
        icon: 'member',
        category: 'Socios',
      });
    case 'member.photo_updated':
      return buildLog(log, {
        title: 'Foto de socio actualizada',
        description: `${actor} actualizó la foto de un socio.`,
        details: [],
        tone: 'info',
        icon: 'member',
        category: 'Socios',
      });
    case 'member.photo_removed':
      return buildLog(log, {
        title: 'Foto de socio eliminada',
        description: `${actor} quitó la foto de un socio.`,
        details: [],
        tone: 'warning',
        icon: 'member',
        category: 'Socios',
      });
    case 'member.benefit_updated':
      return buildLog(log, {
        title: 'Beneficios de socios actualizados',
        description: `${actor} actualizó los beneficios por clase de socio.`,
        details: ['Se actualizaron bonificaciones sugeridas, cumpleaños o límites de fiado.'],
        tone: 'info',
        icon: 'member',
        category: 'Socios',
      });
    case 'member.status_updated':
      return buildLog(log, {
        title: 'Estado de socio actualizado',
        description: `${actor} cambió el estado del socio de ${labelStatus(oldValue.status)} a ${labelStatus(newValue.status)}.`,
        details: [],
        tone: ['BANNED', 'SUSPENDED'].includes(text(newValue.status)) ? 'danger' : 'warning',
        icon: 'member',
        category: 'Socios',
      });
    case 'user.created':
    case 'employee.created':
      return buildLog(log, {
        title: 'Colaborador creado',
        description: `${actor} creó un nuevo colaborador.`,
        details: changedDetails({}, newValue, ['name', 'email', 'phone', 'status']).map((detail) => detail.replace('antes -, ahora ', '')),
        tone: 'success',
        icon: 'user',
        category: 'Colaboradores',
      });
    case 'user.updated':
    case 'employee.updated':
      return buildLog(log, {
        title: 'Colaborador actualizado',
        description: `${actor} actualizó los datos de un colaborador.`,
        details: changedDetails(oldValue, newValue, ['name', 'phone', 'avatarUrl', 'status']),
        tone: 'warning',
        icon: 'user',
        category: 'Colaboradores',
      });
    case 'user.role_updated':
      return buildLog(log, {
        title: 'Rol de colaborador actualizado',
        description: `${actor} cambió el rol de un colaborador.`,
        details: changedDetails(oldValue, newValue, ['role']),
        tone: 'warning',
        icon: 'user',
        category: 'Colaboradores',
      });
    case 'user.disabled':
    case 'employee.deleted':
      return buildLog(log, {
        title: log.action === 'employee.deleted' ? 'Colaborador eliminado' : 'Colaborador desactivado',
        description: log.action === 'employee.deleted' ? `${actor} eliminó un colaborador.` : `${actor} desactivó el acceso de un colaborador.`,
        details: changedDetails(oldValue, newValue, ['status']),
        tone: 'danger',
        icon: 'user',
        category: 'Colaboradores',
      });
    case 'member.sale_created':
      return buildLog(log, {
        title: 'Dispensación asociada al socio',
        description: `${actor} registró una dispensación asociada a un socio.`,
        details: [`Socio: ${text(newValue.memberName ?? newValue.memberId)}`, `Dispensación: ${text(newValue.saleId ?? log.entityId)}`, `Total: ${currency(newValue.total)}`],
        tone: 'info',
        icon: 'member',
        category: 'Socios',
      });
    case 'discount.applied':
      return buildLog(log, {
        title: 'Bonificación aplicada',
        description: `${actor} aplicó una bonificación.`,
        details: [`Bonificación: ${currency(newValue.discount ?? newValue.amount)}`],
        tone: 'info',
        icon: 'sale',
        category: 'Dispensaciones',
      });
    case 'access_link.regenerated':
      return buildLog(log, {
        title: 'Enlace de acceso regenerado',
        description: `${actor} generó un nuevo enlace seguro de acceso al club.`,
        details: [`Estado: ${labelStatus(newValue.status)}`],
        tone: 'info',
        icon: 'security',
        category: 'Seguridad',
      });
    case 'emergency.activated':
      return buildLog(log, {
        title: 'Modo emergencia activado',
        description: `${actor} activó el modo emergencia. Los accesos públicos fueron bloqueados.`,
        details: [`Motivo: ${text(newValue.reason)}`],
        tone: 'danger',
        icon: 'emergency',
        category: 'Emergencia',
      });
    case 'emergency.deactivated':
      return buildLog(log, {
        title: 'Modo emergencia desactivado',
        description: `${actor} desactivó el modo emergencia y restauró el acceso.`,
        details: [],
        tone: 'success',
        icon: 'security',
        category: 'Emergencia',
      });
    case 'emergency.deactivated_by_platform':
      return buildLog(log, {
        title: 'Modo emergencia desactivado por plataforma',
        description: 'El administrador de plataforma restauró el acceso de la empresa.',
        details: [`Motivo: ${text(newValue.resolutionReason)}`],
        tone: 'success',
        icon: 'security',
        category: 'Emergencia',
      });
    case 'access_link.used':
      return buildLog(log, {
        title: 'Enlace seguro utilizado',
        description: 'Se validó un enlace seguro de acceso al club.',
        details: [`Último uso: ${formatAuditDate(text(newValue.lastUsedAt, log.createdAt))}`],
        tone: 'info',
        icon: 'security',
        category: 'Seguridad',
      });
    case 'settings.updated': {
      const oldSettings = asRecord(oldValue.settings);
      const newSettings = asRecord(newValue.settings);
      const oldTenant = asRecord(oldValue.tenant);
      const newTenant = asRecord(newValue.tenant);
      const details = [
        ...changedDetails(oldTenant, newTenant, ['name', 'email']),
        ...changedDetails(oldSettings, newSettings, ['timezone', 'allowCreditSales', 'requireCreditReason', 'showSecurityBadges', 'requireAccessLink']),
      ];

      return buildLog(log, {
        title: 'Configuración actualizada',
        description: `${actor} actualizó la configuración del club.`,
        details: details.length ? details : ['Se guardaron ajustes de configuración.'],
        tone: 'info',
        icon: 'settings',
        category: 'Configuración',
      });
    }
    default:
      return buildLog(log, {
        details: [`Acción técnica: ${log.action}`],
      });
  }
}

export function isCriticalAuditLog(log: AuditLog): boolean {
  const oldValue = asRecord(log.oldValue);
  const newValue = asRecord(log.newValue);

  if (['emergency.activated', 'user.disabled', 'product.archived'].includes(log.action)) {
    return true;
  }

  if (log.action === 'member.status_updated' && ['BANNED', 'SUSPENDED'].includes(text(newValue.status))) {
    return true;
  }

  if (log.action === 'cash.closed') {
    return numberValue(newValue.difference ?? oldValue.difference) !== 0;
  }

  return false;
}
