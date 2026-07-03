import { Injectable } from '@nestjs/common';
import { MemberClass, MemberStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SuggestedDiscount {
  discountType: 'member_class' | 'birthday';
  discountPercent: number;
  reason: string;
  requiresConfirmation: boolean;
  giftNote?: string;
}

export interface MemberDiscountInfo {
  memberId: string;
  memberClass: MemberClass;
  isBirthday: boolean;
  suggestedDiscounts: SuggestedDiscount[];
  totalDiscountPercent: number;
}

@Injectable()
export class MemberDiscountService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateMemberDiscounts(
    tenantId: string,
    memberId: string,
  ): Promise<MemberDiscountInfo> {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
        status: { not: MemberStatus.DELETED },
      },
      select: {
        id: true,
        memberClass: true,
        birthDate: true,
      },
    });

    if (!member) {
      return {
        memberId,
        memberClass: MemberClass.STANDARD,
        isBirthday: false,
        suggestedDiscounts: [],
        totalDiscountPercent: 0,
      };
    }

    const benefits = await this.prisma.memberClassBenefit.findFirst({
      where: {
        tenantId,
        memberClass: member.memberClass,
      },
    });

    const suggestedDiscounts: SuggestedDiscount[] = [];
    let totalDiscountPercent = 0;

    // Class discount
    if (benefits && Number(benefits.discountPercent) > 0) {
      suggestedDiscounts.push({
        discountType: 'member_class',
        discountPercent: Number(benefits.discountPercent),
        reason: `Descuento de socio ${member.memberClass}`,
        requiresConfirmation: false,
      });
      totalDiscountPercent += Number(benefits.discountPercent);
    }

    // Birthday discount
    const isBirthday = this.isBirthday(member.birthDate);
    if (
      isBirthday &&
      benefits?.birthdayBenefitEnabled &&
      Number(benefits.birthdayDiscountPercent) > 0
    ) {
      suggestedDiscounts.push({
        discountType: 'birthday',
        discountPercent: Number(benefits.birthdayDiscountPercent),
        reason: '¡Descuento de cumpleaños!',
        requiresConfirmation: true,
        giftNote: benefits.birthdayGiftNote || undefined,
      });
      totalDiscountPercent += Number(benefits.birthdayDiscountPercent);
    }

    return {
      memberId,
      memberClass: member.memberClass,
      isBirthday,
      suggestedDiscounts,
      totalDiscountPercent,
    };
  }

  private isBirthday(birthDate: Date | null): boolean {
    if (!birthDate) return false;

    const today = new Date();
    return (
      birthDate.getMonth() === today.getMonth() &&
      birthDate.getDate() === today.getDate()
    );
  }

  /**
   * Calcula el descuento total en dinero basado en subtotal y porcentaje
   */
  calculateDiscountAmount(subtotal: number, discountPercent: number): number {
    return Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
  }
}
