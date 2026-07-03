import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicPlans() {
    const plans = await this.prisma.platformPlan.findMany({
      where: { status: 'ACTIVE', publicVisible: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        priceMonthly: true,
        priceAnnual: true,
        currency: true,
        maxUsers: true,
        maxProducts: true,
        marketingTitle: true,
        marketingDescription: true,
        isRecommended: true,
        sortOrder: true,
        ctaLabel: true,
        offerLabel: true,
        offerEndsAt: true,
        modules: {
          select: {
            module: {
              select: { id: true, key: true, name: true, category: true },
            },
          },
        },
      },
    });

    return plans.map((plan) => ({
      ...plan,
      priceMonthly: Number(plan.priceMonthly),
      priceAnnual: plan.priceAnnual ? Number(plan.priceAnnual) : null,
      modules: plan.modules.map((m) => m.module),
    }));
  }

  async getPublicModules() {
    return this.prisma.platformModuleDefinition.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
      },
    });
  }

  async createLead(dto: CreateLeadDto) {
    if (!dto.consentGiven) {
      throw new BadRequestException('Debes aceptar ser contactado para enviar la solicitud.');
    }

    const recentFromSameEmail = await this.prisma.commercialLead.count({
      where: {
        email: dto.email.toLowerCase().trim(),
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentFromSameEmail >= 3) {
      throw new BadRequestException('Ya has enviado varias solicitudes recientemente. Inténtalo más tarde.');
    }

    await this.prisma.commercialLead.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        companyName: dto.companyName.trim(),
        country: dto.country?.trim() || 'ES',
        preferredLanguage: dto.preferredLanguage?.trim() || 'es',
        requestedPlanId: dto.requestedPlanId || null,
        estimatedUsers: dto.estimatedUsers || null,
        message: dto.message?.trim() || null,
        consentGiven: dto.consentGiven,
        source: 'landing',
      },
    });

    return {
      ok: true,
      message: 'Solicitud recibida. Nuestro equipo revisará la información y contactará contigo.',
    };
  }
}
