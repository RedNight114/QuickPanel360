import type { Member, MemberClassBenefit } from './types';

export type SpanishDocumentType = 'NIF' | 'NIE' | 'OTHER' | '';

export function detectSpanishDocumentType(value: string): SpanishDocumentType {
  const normalized = value.trim().toUpperCase().replace(/[\s-]/g, '');

  if (!normalized) return '';
  if (/^\d{8}[A-Z]$/.test(normalized)) return 'NIF';
  if (/^[XYZ]\d{7}[A-Z]$/.test(normalized)) return 'NIE';

  return 'OTHER';
}

export function getMemberDisplayName(member: Pick<Member, 'displayName' | 'firstName' | 'lastName' | 'memberNumber'>) {
  return (
    member.displayName?.trim() ||
    `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() ||
    `Socio ${member.memberNumber ?? ''}`.trim() ||
    'Socio'
  );
}

export function getMemberClassLabel(memberClass?: string | null) {
  if (memberClass === 'VIP') return 'VIP';
  if (memberClass === 'PREFERRED') return 'Preferente';
  return 'Estándar';
}

export function getBirthdayInfo(birthDate?: string | null) {
  if (!birthDate) return null;

  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), parsed.getMonth(), parsed.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);

  const days = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
  return {
    days,
    isToday: days === 0,
    isSoon: days > 0 && days <= 7,
  };
}

export function getBenefitForMember(member: Member | null | undefined, benefits: MemberClassBenefit[]) {
  if (!member) return null;
  return benefits.find((benefit) => benefit.memberClass === (member.memberClass ?? 'STANDARD')) ?? null;
}
