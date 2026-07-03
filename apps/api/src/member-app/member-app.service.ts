import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PointTransactionType,
  type RewardGameType,
  type RewardGameStatus,
  type MissionType,
  type MissionStatus,
  type RewardStatus,
  type RewardRedemptionStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

const PHASER_GAME_TYPES: RewardGameType[] = [
  'BUBBLE_POP',
  'MEMORY_CARDS',
  'BLOCK_PUZZLE',
  'RUNNER',
  'REACTION_TAP',
];

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 min max per session

@Injectable()
export class MemberAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  // ── Home ──────────────────────────────────────────────────────────────

  async getHome(tenantId: string, memberId: string) {
    const [member, tenant, settings] = await Promise.all([
      this.prisma.member.findFirst({
        where: { id: memberId, tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          memberNumber: true,
          memberClass: true,
          status: true,
          photoUrl: true,
          email: true,
          phone: true,
        },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
      this.getSettings(tenantId),
    ]);

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    await this.awardFirstAccess(tenantId, memberId);

    const hasCompletedProfile = Boolean(
      member.firstName &&
        member.lastName &&
        member.email &&
        member.phone,
    );

    if (hasCompletedProfile) {
      await this.awardProfileCompletion(tenantId, memberId);
    }

    const balance = await this.getOrCreateBalance(tenantId, memberId);

    const name =
      member.displayName ??
      [member.firstName, member.lastName].filter(Boolean).join(' ') ??
      'Socio';

    return {
      member: {
        name,
        memberNumber: member.memberNumber,
        memberClass: member.memberClass,
        status: member.status,
        photoUrl: member.photoUrl,
        points: balance.points,
        lifetimePoints: balance.lifetimePoints,
      },
      name,
      memberNumber: member.memberNumber,
      memberClass: member.memberClass,
      status: member.status,
      photoUrl: member.photoUrl,
      points: balance.points,
      lifetimePoints: balance.lifetimePoints,
      clubName: tenant?.name ?? '',
      settings: {
        enabled: settings.enabled,
        catalogEnabled: settings.catalogEnabled,
        pointsEnabled: settings.pointsEnabled,
        digitalCardEnabled: settings.digitalCardEnabled,
        allowProfileEdit: settings.allowProfileEdit,
        showProductValues: settings.showProductValues,
        showApproxAvailability: settings.showApproxAvailability,
        gamesEnabled: settings.gamesEnabled,
        missionsEnabled: settings.missionsEnabled,
        rewardsEnabled: settings.rewardsEnabled,
      },
    };
  }

  // ── Profile ───────────────────────────────────────────────────────────

  async getProfile(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: {
        id: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        displayName: true,
        documentType: true,
        documentNumber: true,
        birthDate: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        postalCode: true,
        photoUrl: true,
        status: true,
        memberClass: true,
        preferredContactMethod: true,
        marketingConsent: true,
        joinedAt: true,
        lastVisitAt: true,
        createdAt: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const balance = await this.getOrCreateBalance(tenantId, memberId);

    const name =
      member.displayName ??
      [member.firstName, member.lastName].filter(Boolean).join(' ') ??
      'Socio';

    return {
      ...member,
      name,
      birthday: member.birthDate,
      joinDate: member.joinedAt,
      avatar: member.photoUrl,
      points: balance.points,
      lifetimePoints: balance.lifetimePoints,
    };
  }

  async updateProfile(
    tenantId: string,
    memberId: string,
    data: { phone?: string; email?: string },
  ) {
    const settings = await this.getSettings(tenantId);

    if (!settings.allowProfileEdit) {
      throw new ForbiddenException(
        'La edición de perfil no está habilitada',
      );
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const updateData: Record<string, string> = {};
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No se proporcionaron campos a actualizar');
    }

    const updated = await this.prisma.member.update({
      where: { id: member.id },
      data: updateData,
      select: {
        id: true,
        phone: true,
        email: true,
      },
    });

    if (updated.phone && updated.email) {
      await this.awardProfileCompletion(tenantId, memberId);
    }

    return updated;
  }

  // ── Digital Card ──────────────────────────────────────────────────────

  async getCard(tenantId: string, memberId: string) {
    const [member, tenant] = await Promise.all([
      this.prisma.member.findFirst({
        where: { id: memberId, tenantId },
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          displayName: true,
          memberClass: true,
          photoUrl: true,
          joinedAt: true,
        },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
    ]);

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const name =
      member.displayName ??
      [member.firstName, member.lastName].filter(Boolean).join(' ') ??
      'Socio';

    return {
      memberNumber: member.memberNumber,
      name,
      memberClass: member.memberClass,
      photoUrl: member.photoUrl,
      avatar: member.photoUrl,
      clubName: tenant?.name ?? '',
      joinedAt: member.joinedAt,
      joinDate: member.joinedAt,
    };
  }

  // ── Catalog ───────────────────────────────────────────────────────────

  async getCatalog(
    tenantId: string,
    memberId: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    const settings = await this.getSettings(tenantId);

    if (!settings.catalogEnabled) {
      throw new ForbiddenException('El catálogo no está habilitado');
    }

    // Verify member exists
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const trimmedSearch = search?.trim();
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          ...(trimmedSearch
            ? {
                OR: [
                  { name: { contains: trimmedSearch, mode: 'insensitive' } },
                  {
                    description: {
                      contains: trimmedSearch,
                      mode: 'insensitive',
                    },
                  },
                  { sku: { contains: trimmedSearch, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          description: true,
          sku: true,
          imageUrl: true,
          unitType: true,
          price: true,
          category: {
            select: { id: true, name: true },
          },
          inventory: {
            select: { currentQuantity: true },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          ...(trimmedSearch
            ? {
                OR: [
                  { name: { contains: trimmedSearch, mode: 'insensitive' } },
                  {
                    description: {
                      contains: trimmedSearch,
                      mode: 'insensitive',
                    },
                  },
                  { sku: { contains: trimmedSearch, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      }),
    ]);

    // Transform products for member view, respecting settings
    const items = products.map((product) => {
      const item: Record<string, unknown> = {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        imageUrl: product.imageUrl,
        image: product.imageUrl,
        unitType: product.unitType,
        category: product.category?.name ?? 'Sin categoria',
        categoryName: product.category?.name ?? 'Sin categoria',
      };

      if (settings.showProductValues) {
        item.price = product.price;
        item.value = product.price;
      }

      if (settings.showApproxAvailability) {
        const qty = Number(product.inventory?.currentQuantity ?? 0);
        item.availability =
          qty > 10 ? 'high' : qty > 0 ? 'low' : 'out_of_stock';
        item.available = qty > 0;
      }

      if (!settings.showApproxAvailability) {
        item.available = true;
      }

      return item;
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      showProductValues: settings.showProductValues,
    };
  }

  // ── Points ────────────────────────────────────────────────────────────

  async getPoints(
    tenantId: string,
    memberId: string,
    page: number,
    limit: number,
  ) {
    const settings = await this.getSettings(tenantId);

    if (!settings.pointsEnabled) {
      throw new ForbiddenException(
        'El sistema de puntos no está habilitado',
      );
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const balance = await this.getOrCreateBalance(tenantId, memberId);

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.memberPointTransaction.findMany({
        where: { tenantId, memberId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          points: true,
          reason: true,
          sourceType: true,
          createdAt: true,
        },
      }),
      this.prisma.memberPointTransaction.count({
        where: { tenantId, memberId },
      }),
    ]);

    return {
      balance: {
        points: balance.points,
        lifetimePoints: balance.lifetimePoints,
      },
      currentPoints: balance.points,
      lifetimePoints: balance.lifetimePoints,
      transactions: transactions.map((transaction) => ({
        ...transaction,
        date: transaction.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Check-in ──────────────────────────────────────────────────────────

  async checkIn(tenantId: string, memberId: string) {
    const settings = await this.getSettings(tenantId);

    if (!settings.pointsEnabled) {
      throw new ForbiddenException(
        'El sistema de puntos no está habilitado',
      );
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingCheckIn =
      await this.prisma.memberPointTransaction.findFirst({
        where: {
          tenantId,
          memberId,
          sourceType: 'daily_checkin',
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

    if (existingCheckIn) {
      throw new BadRequestException('Ya registraste tu visita hoy');
    }

    const transaction = await this.addPoints(
      tenantId,
      memberId,
      5,
      PointTransactionType.EARNED,
      'Check-in diario',
      'daily_checkin',
    );

    // Auto-progress check-in missions
    await this.updateMissionProgress(tenantId, memberId, 'CHECK_IN');
    await this.updateMissionProgress(tenantId, memberId, 'DAILY_ACCESS');

    return {
      points: transaction.points,
      message: 'Check-in registrado correctamente',
    };
  }

  // ── Profile Completion Points ─────────────────────────────────────────

  async awardProfileCompletion(tenantId: string, memberId: string) {
    const settings = await this.getSettings(tenantId);

    if (!settings.pointsEnabled) {
      return null;
    }

    const existing = await this.prisma.memberPointTransaction.findFirst({
      where: {
        tenantId,
        memberId,
        sourceType: 'profile_complete',
      },
    });

    if (existing) {
      return null;
    }

    return this.addPoints(
      tenantId,
      memberId,
      25,
      PointTransactionType.EARNED,
      'Perfil completado',
      'profile_complete',
    );
  }

  // ── First Access Points ───────────────────────────────────────────────

  async awardFirstAccess(tenantId: string, memberId: string) {
    const settings = await this.getSettings(tenantId);

    if (!settings.pointsEnabled) {
      return null;
    }

    const existing = await this.prisma.memberPointTransaction.findFirst({
      where: {
        tenantId,
        memberId,
        sourceType: 'first_access',
      },
    });

    if (existing) {
      return null;
    }

    return this.addPoints(
      tenantId,
      memberId,
      10,
      PointTransactionType.EARNED,
      'Primer acceso al portal',
      'first_access',
    );
  }

  // ── Admin: Get Settings ───────────────────────────────────────────────

  async getSettingsForAdmin(tenantId: string) {
    return this.getSettings(tenantId);
  }

  // ── Admin: Update Settings ────────────────────────────────────────────

  async updateSettings(
    tenantId: string,
    data: {
      enabled?: boolean;
      catalogEnabled?: boolean;
      showProductValues?: boolean;
      showApproxAvailability?: boolean;
      pointsEnabled?: boolean;
      allowProfileEdit?: boolean;
      digitalCardEnabled?: boolean;
      gamesEnabled?: boolean;
      missionsEnabled?: boolean;
      rewardsEnabled?: boolean;
      allowRewardRedemption?: boolean;
      requireRewardApproval?: boolean;
      maxDailyGamePlays?: number;
      maxDailyPointsFromGames?: number;
    },
  ) {
    const settings = await this.getSettings(tenantId);

    return this.prisma.memberAppSettings.update({
      where: { id: settings.id },
      data,
    });
  }

  // ── Admin: Get Member Points ──────────────────────────────────────────

  async getMemberPointsForAdmin(
    tenantId: string,
    memberId: string,
    page: number,
    limit: number,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        memberNumber: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const balance = await this.getOrCreateBalance(tenantId, memberId);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.memberPointTransaction.findMany({
        where: { tenantId, memberId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.memberPointTransaction.count({
        where: { tenantId, memberId },
      }),
    ]);

    return {
      member: {
        id: member.id,
        name:
          member.displayName ??
          [member.firstName, member.lastName].filter(Boolean).join(' '),
        memberNumber: member.memberNumber,
      },
      balance: {
        points: balance.points,
        lifetimePoints: balance.lifetimePoints,
      },
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Admin: Adjust Points ──────────────────────────────────────────────

  async adjustPoints(
    tenantId: string,
    memberId: string,
    data: { points: number; reason: string },
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    if (!data.points || data.points === 0) {
      throw new BadRequestException('Los puntos deben ser distintos de 0');
    }

    if (!data.reason?.trim()) {
      throw new BadRequestException('Se requiere un motivo');
    }

    return this.addPoints(
      tenantId,
      memberId,
      data.points,
      PointTransactionType.ADJUSTED,
      data.reason,
      'admin_adjustment',
    );
  }

  // ── Games (Member) ────────────────────────────────────────────────────

  async getGames(tenantId: string, memberId: string) {
    const settings = await this.getSettings(tenantId);

    if (!settings.gamesEnabled) {
      throw new ForbiddenException('Los juegos no están habilitados');
    }

    const now = new Date();

    const games = await this.prisma.rewardGame.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPlays = await this.prisma.rewardGamePlay.findMany({
      where: {
        tenantId,
        memberId,
        createdAt: { gte: today, lt: tomorrow },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPlaysToday = todayPlays.length;

    return {
      games: games.map((game) => {
      const gamePlaysToday = todayPlays.filter((p) => p.gameId === game.id);
      const lastPlay = gamePlaysToday[0] ?? null;

      let canPlay = gamePlaysToday.length < game.maxPlaysPerDay
        && totalPlaysToday < settings.maxDailyGamePlays;

      // Check cooldown
      if (canPlay && lastPlay && game.cooldownHours > 0) {
        const cooldownEnd = new Date(lastPlay.createdAt);
        cooldownEnd.setHours(cooldownEnd.getHours() + game.cooldownHours);
        if (now < cooldownEnd) {
          canPlay = false;
        }
      }

      const publicConfig =
        game.type === 'QUIZ' && game.config
          ? {
              ...(game.config as Record<string, unknown>),
              correctAnswer: undefined,
            }
          : game.config;

      const nextPlayAt =
        lastPlay && game.cooldownHours > 0
          ? new Date(
              new Date(lastPlay.createdAt).getTime() +
                game.cooldownHours * 60 * 60 * 1000,
            )
          : null;

      return {
        id: game.id,
        title: game.title,
        description: game.description,
        type: game.type,
        pointsReward: game.pointsReward,
        cooldownHours: game.cooldownHours,
        maxPlaysPerDay: game.maxPlaysPerDay,
        config: publicConfig,
        canPlay,
        lastPlayedAt: lastPlay?.createdAt ?? null,
        nextPlayAt,
        todayPlays: gamePlaysToday.length,
      };
    }),
    };
  }

  async playGame(
    tenantId: string,
    memberId: string,
    gameId: string,
    result?: string,
  ) {
    const settings = await this.getSettings(tenantId);

    if (!settings.gamesEnabled) {
      throw new ForbiddenException('Los juegos no están habilitados');
    }

    const game = await this.prisma.rewardGame.findFirst({
      where: { id: gameId, tenantId, status: 'ACTIVE' },
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const now = new Date();

    // Check date range
    if (game.startsAt && now < game.startsAt) {
      throw new BadRequestException('El juego aún no ha comenzado');
    }
    if (game.endsAt && now > game.endsAt) {
      throw new BadRequestException('El juego ha finalizado');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check per-game daily limit
    const gamePlaysToday = await this.prisma.rewardGamePlay.count({
      where: {
        tenantId,
        memberId,
        gameId,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    if (gamePlaysToday >= game.maxPlaysPerDay) {
      throw new BadRequestException(
        'Has alcanzado el límite de jugadas diarias para este juego',
      );
    }

    // Check global daily limit
    const totalPlaysToday = await this.prisma.rewardGamePlay.count({
      where: {
        tenantId,
        memberId,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    if (totalPlaysToday >= settings.maxDailyGamePlays) {
      throw new BadRequestException(
        'Has alcanzado el límite de jugadas diarias',
      );
    }

    // Check cooldown
    if (game.cooldownHours > 0) {
      const lastPlay = await this.prisma.rewardGamePlay.findFirst({
        where: { tenantId, memberId, gameId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastPlay) {
        const cooldownEnd = new Date(lastPlay.createdAt);
        cooldownEnd.setHours(cooldownEnd.getHours() + game.cooldownHours);
        if (now < cooldownEnd) {
          throw new BadRequestException(
            'Debes esperar antes de jugar de nuevo',
          );
        }
      }
    }

    // Check daily points cap
    const todayPointsAgg = await this.prisma.rewardGamePlay.aggregate({
      where: {
        tenantId,
        memberId,
        createdAt: { gte: today, lt: tomorrow },
      },
      _sum: { pointsEarned: true },
    });
    const todayPoints = todayPointsAgg._sum.pointsEarned ?? 0;

    let pointsEarned = game.pointsReward;

    // For quiz games, validate answer
    if (game.type === 'QUIZ' && game.config) {
      const config = game.config as Record<string, unknown>;
      if (config.correctAnswer && result !== config.correctAnswer) {
        pointsEarned = 0;
      }
    }

    // Cap points if would exceed daily limit
    if (todayPoints + pointsEarned > settings.maxDailyPointsFromGames) {
      pointsEarned = Math.max(
        0,
        settings.maxDailyPointsFromGames - todayPoints,
      );
    }

    const play = await this.prisma.rewardGamePlay.create({
      data: {
        tenantId,
        gameId,
        memberId,
        result,
        pointsEarned,
      },
    });

    if (pointsEarned > 0) {
      await this.addPoints(
        tenantId,
        memberId,
        pointsEarned,
        PointTransactionType.EARNED,
        `Juego: ${game.title}`,
        'game',
        play.id,
      );
    }

    if (game.type === 'QUIZ') {
      await this.updateMissionProgress(
        tenantId,
        memberId,
        'QUIZ_PARTICIPATION',
      );
    }

    if (game.type === 'DAILY_CHECKIN') {
      await this.updateMissionProgress(tenantId, memberId, 'CHECK_IN');
      await this.updateMissionProgress(tenantId, memberId, 'DAILY_ACCESS');
    }

    return {
      id: play.id,
      success: true,
      pointsEarned,
      result,
      correct:
        game.type === 'QUIZ'
          ? pointsEarned > 0
          : undefined,
      message:
        pointsEarned > 0
          ? `+${pointsEarned} puntos ganados`
          : game.type === 'QUIZ'
            ? 'Respuesta incorrecta. Intentalo de nuevo manana.'
            : 'Participacion registrada.',
    };
  }

  // ── Leaderboard ───────────────────────────────────────────────────────

  async getLeaderboard(tenantId: string, memberId: string) {
    const settings = await this.getSettings(tenantId);
    if (!settings.pointsEnabled) {
      throw new ForbiddenException('Los puntos no están habilitados');
    }

    const balances = await this.prisma.memberPointBalance.findMany({
      where: { tenantId },
      orderBy: { points: 'desc' },
      take: 50,
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            memberNumber: true,
            memberClass: true,
            photoUrl: true,
          },
        },
      },
    });

    const entries = balances.map((b, i) => {
      const displayName =
        b.member.displayName ??
        ([b.member.firstName, b.member.lastName].filter(Boolean).join(' ') ||
          `Socio #${b.member.memberNumber ?? ''}`);
      return {
        rank: i + 1,
        memberId: b.memberId,
        name: displayName,
        memberClass: b.member.memberClass,
        photoUrl: b.member.photoUrl,
        totalPoints: b.points,
        isMe: b.memberId === memberId,
      };
    });

    const myEntry = entries.find((e) => e.isMe);
    const myRank = myEntry?.rank ?? null;

    return { entries, myRank, total: balances.length };
  }

  // ── Game History ──────────────────────────────────────────────────────

  async getGameHistory(tenantId: string, memberId: string, gameId: string) {
    const game = await this.prisma.rewardGame.findFirst({
      where: { id: gameId, tenantId },
      select: { id: true, title: true, type: true, pointsReward: true },
    });

    if (!game) throw new NotFoundException('Juego no encontrado');

    const sessions = await this.prisma.rewardGameSession.findMany({
      where: {
        tenantId,
        memberId,
        gameId,
        status: 'FINISHED',
      },
      orderBy: { finishedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        score: true,
        pointsAwarded: true,
        finishedAt: true,
      },
    });

    const bestScore = sessions.length > 0
      ? Math.max(...sessions.map((s) => s.score ?? 0))
      : null;

    const totalPlays = await this.prisma.rewardGameSession.count({
      where: { tenantId, memberId, gameId, status: 'FINISHED' },
    });

    return {
      game,
      bestScore,
      totalPlays,
      recent: sessions.slice(0, 5).map((s) => ({
        id: s.id,
        score: s.score,
        pointsAwarded: s.pointsAwarded,
        finishedAt: s.finishedAt,
      })),
    };
  }

  // ── Phaser Game Sessions ──────────────────────────────────────────────

  async startGameSession(tenantId: string, memberId: string, gameId: string) {
    const settings = await this.getSettings(tenantId);
    if (!settings.gamesEnabled) {
      throw new ForbiddenException('Los juegos no estan habilitados');
    }

    const game = await this.prisma.rewardGame.findFirst({
      where: { id: gameId, tenantId, status: 'ACTIVE' },
    });
    if (!game) throw new NotFoundException('Juego no encontrado');
    if (!PHASER_GAME_TYPES.includes(game.type)) {
      throw new BadRequestException('Este juego no soporta sesiones');
    }

    const now = new Date();
    if (game.startsAt && now < game.startsAt) {
      throw new BadRequestException('El juego aun no ha comenzado');
    }
    if (game.endsAt && now > game.endsAt) {
      throw new BadRequestException('El juego ha finalizado');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const gamePlaysToday = await this.prisma.rewardGamePlay.count({
      where: { tenantId, memberId, gameId, createdAt: { gte: today, lt: tomorrow } },
    });
    if (gamePlaysToday >= game.maxPlaysPerDay) {
      throw new BadRequestException('Has alcanzado el limite de jugadas diarias para este juego');
    }

    const totalPlaysToday = await this.prisma.rewardGamePlay.count({
      where: { tenantId, memberId, createdAt: { gte: today, lt: tomorrow } },
    });
    if (totalPlaysToday >= settings.maxDailyGamePlays) {
      throw new BadRequestException('Has alcanzado el limite de jugadas diarias');
    }

    if (game.cooldownHours > 0) {
      const lastPlay = await this.prisma.rewardGamePlay.findFirst({
        where: { tenantId, memberId, gameId },
        orderBy: { createdAt: 'desc' },
      });
      if (lastPlay) {
        const cooldownEnd = new Date(lastPlay.createdAt);
        cooldownEnd.setHours(cooldownEnd.getHours() + game.cooldownHours);
        if (now < cooldownEnd) {
          throw new BadRequestException('Debes esperar antes de jugar de nuevo');
        }
      }
    }

    // Cancel any stale STARTED sessions for this member+game
    await this.prisma.rewardGameSession.updateMany({
      where: { tenantId, memberId, gameId, status: 'STARTED' },
      data: { status: 'CANCELLED' },
    });

    const seed = randomBytes(16).toString('hex');
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    const session = await this.prisma.rewardGameSession.create({
      data: { tenantId, gameId, memberId, seed, expiresAt },
    });

    return {
      sessionId: session.id,
      seed,
      expiresAt: session.expiresAt,
      config: game.config,
      pointsReward: game.pointsReward,
    };
  }

  async finishGameSession(
    tenantId: string,
    memberId: string,
    sessionId: string,
    score: number,
  ) {
    const session = await this.prisma.rewardGameSession.findFirst({
      where: { id: sessionId, tenantId, memberId, status: 'STARTED' },
      include: { game: true },
    });

    if (!session) {
      throw new NotFoundException('Sesion no encontrada o ya finalizada');
    }

    if (new Date() > session.expiresAt) {
      await this.prisma.rewardGameSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('La sesion ha expirado');
    }

    const game = session.game;
    const settings = await this.getSettings(tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPointsAgg = await this.prisma.rewardGamePlay.aggregate({
      where: { tenantId, memberId, createdAt: { gte: today, lt: tomorrow } },
      _sum: { pointsEarned: true },
    });
    const todayPoints = todayPointsAgg._sum.pointsEarned ?? 0;

    let pointsEarned = game.pointsReward;
    if (todayPoints + pointsEarned > settings.maxDailyPointsFromGames) {
      pointsEarned = Math.max(0, settings.maxDailyPointsFromGames - todayPoints);
    }

    const [play] = await this.prisma.$transaction([
      this.prisma.rewardGamePlay.create({
        data: { tenantId, gameId: game.id, memberId, result: String(score), pointsEarned },
      }),
      this.prisma.rewardGameSession.update({
        where: { id: sessionId },
        data: {
          status: 'FINISHED',
          finishedAt: new Date(),
          score,
          pointsAwarded: pointsEarned,
        },
      }),
    ]);

    if (pointsEarned > 0) {
      await this.addPoints(
        tenantId,
        memberId,
        pointsEarned,
        PointTransactionType.EARNED,
        `Juego: ${game.title}`,
        'game',
        play.id,
      );
    }

    await this.updateMissionProgress(tenantId, memberId, 'GAME_PLAY');

    if (pointsEarned > 0) {
      this.pushService.sendToMember(memberId, {
        title: `+${pointsEarned} CR ganados 🎮`,
        body: `${game.title} — puntuación: ${score}`,
        url: '/member/points',
        tag: 'game-result',
      }).catch(() => {});
    }

    return {
      sessionId,
      score,
      pointsEarned,
      message: pointsEarned > 0
        ? `+${pointsEarned} puntos ganados`
        : 'Participacion registrada.',
    };
  }

  // ── Missions (Member) ────────────────────────────────────────────────

  async getMissions(tenantId: string, memberId: string) {
    const settings = await this.getSettings(tenantId);

    if (!settings.missionsEnabled) {
      throw new ForbiddenException('Las misiones no están habilitadas');
    }

    const now = new Date();

    const missions = await this.prisma.mission.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const missionIds = missions.map((m) => m.id);

    const progressRecords = await this.prisma.memberMissionProgress.findMany({
      where: {
        tenantId,
        memberId,
        missionId: { in: missionIds },
      },
    });

    const progressMap = new Map(
      progressRecords.map((p) => [p.missionId, p]),
    );

    return {
      missions: missions.map((mission) => {
      const mp = progressMap.get(mission.id);
      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        type: mission.type,
        targetValue: mission.targetValue,
        pointsReward: mission.pointsReward,
        progress: mp?.progress ?? 0,
        completed: mp?.completedAt !== null && mp?.completedAt !== undefined,
        pointsAwarded: mp?.pointsAwarded ?? 0,
        memberProgress: {
          progress: mp?.progress ?? 0,
          completedAt: mp?.completedAt ?? null,
        },
      };
    }),
    };
  }

  async updateMissionProgress(
    tenantId: string,
    memberId: string,
    missionType: string,
  ) {
    const settings = await this.getSettings(tenantId);

    if (!settings.missionsEnabled) {
      return;
    }

    const now = new Date();

    const missions = await this.prisma.mission.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        type: missionType as MissionType,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } },
            ],
          },
        ],
      },
    });

    for (const mission of missions) {
      const existing = await this.prisma.memberMissionProgress.findUnique({
        where: {
          tenantId_missionId_memberId: {
            tenantId,
            missionId: mission.id,
            memberId,
          },
        },
      });

      // Already completed
      if (existing?.completedAt) {
        continue;
      }

      const newProgress = (existing?.progress ?? 0) + 1;
      const completed = newProgress >= mission.targetValue;

      await this.prisma.memberMissionProgress.upsert({
        where: {
          tenantId_missionId_memberId: {
            tenantId,
            missionId: mission.id,
            memberId,
          },
        },
        create: {
          tenantId,
          missionId: mission.id,
          memberId,
          progress: newProgress,
          completedAt: completed ? now : null,
          pointsAwarded: completed ? mission.pointsReward : 0,
        },
        update: {
          progress: newProgress,
          completedAt: completed ? now : undefined,
          pointsAwarded: completed ? mission.pointsReward : undefined,
        },
      });

      if (completed) {
        await this.addPoints(
          tenantId,
          memberId,
          mission.pointsReward,
          PointTransactionType.EARNED,
          `Misión completada: ${mission.title}`,
          'mission',
          mission.id,
        );
      }
    }
  }

  // ── Rewards (Member) ─────────────────────────────────────────────────

  async getRewards(tenantId: string, memberId: string) {
    const settings = await this.getSettings(tenantId);

    if (!settings.rewardsEnabled) {
      throw new ForbiddenException(
        'Las recompensas no están habilitadas',
      );
    }

    const [rewards, balance] = await Promise.all([
      this.prisma.reward.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        description: true,
        pointsCost: true,
        stockLimit: true,
        currentStock: true,
        requiresApproval: true,
        imageUrl: true,
        terms: true,
      },
      orderBy: { createdAt: 'desc' },
      }),
      this.getOrCreateBalance(tenantId, memberId),
    ]);

    return {
      rewards,
      memberPoints: balance.points,
    };
  }

  async redeemReward(tenantId: string, memberId: string, rewardId: string) {
    const settings = await this.getSettings(tenantId);

    if (!settings.rewardsEnabled) {
      throw new ForbiddenException(
        'Las recompensas no están habilitadas',
      );
    }

    if (!settings.allowRewardRedemption) {
      throw new ForbiddenException(
        'El canje de recompensas no está habilitado',
      );
    }

    const reward = await this.prisma.reward.findFirst({
      where: { id: rewardId, tenantId, status: 'ACTIVE' },
    });

    if (!reward) {
      throw new NotFoundException('Recompensa no encontrada');
    }

    // Check stock
    if (reward.stockLimit !== null && reward.currentStock !== null && reward.currentStock <= 0) {
      throw new BadRequestException('Recompensa sin stock disponible');
    }

    // Check balance
    const balance = await this.getOrCreateBalance(tenantId, memberId);

    if (balance.points < reward.pointsCost) {
      throw new BadRequestException('No tienes suficientes puntos');
    }

    const redemption = await this.prisma.$transaction(async (tx) => {
      const createdRedemption = await tx.rewardRedemption.create({
        data: {
          tenantId,
          rewardId: reward.id,
          memberId,
          pointsSpent: reward.pointsCost,
          status: 'REQUESTED',
        },
      });

      await this.addPoints(
        tenantId,
        memberId,
        -reward.pointsCost,
        PointTransactionType.REDEEMED,
        `Canje: ${reward.title}`,
        'reward_redemption',
        createdRedemption.id,
        tx,
      );

      if (reward.stockLimit !== null && reward.currentStock !== null) {
        await tx.reward.update({
          where: { id: reward.id },
          data: { currentStock: { decrement: 1 } },
        });
      }

      return createdRedemption;
    });

    return {
      success: true,
      id: redemption.id,
      redemptionId: redemption.id,
      rewardTitle: reward.title,
      pointsSpent: redemption.pointsSpent,
      status: redemption.status,
      createdAt: redemption.createdAt,
      message: 'Solicitud de canje enviada correctamente',
    };
  }

  async getRedemptions(
    tenantId: string,
    memberId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [redemptions, total] = await Promise.all([
      this.prisma.rewardRedemption.findMany({
        where: { tenantId, memberId },
        include: {
          reward: { select: { title: true, imageUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rewardRedemption.count({
        where: { tenantId, memberId },
      }),
    ]);

    return {
      redemptions: redemptions.map((r) => ({
        id: r.id,
        rewardTitle: r.reward.title,
        rewardImageUrl: r.reward.imageUrl,
        pointsSpent: r.pointsSpent,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
      items: redemptions.map((r) => ({
        id: r.id,
        rewardTitle: r.reward.title,
        rewardImageUrl: r.reward.imageUrl,
        pointsSpent: r.pointsSpent,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Admin: Rewards ───────────────────────────────────────────────────

  async getRewardsAdmin(tenantId: string) {
    return this.prisma.reward.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReward(
    tenantId: string,
    data: {
      title: string;
      description?: string;
      pointsCost: number;
      requiresApproval?: boolean;
      stockLimit?: number;
      imageUrl?: string;
      terms?: string;
    },
  ) {
    return this.prisma.reward.create({
      data: {
        tenantId,
        title: data.title,
        description: data.description,
        pointsCost: data.pointsCost,
        requiresApproval: data.requiresApproval,
        stockLimit: data.stockLimit,
        currentStock: data.stockLimit ?? null,
        imageUrl: data.imageUrl,
        terms: data.terms,
      },
    });
  }

  async updateReward(
    tenantId: string,
    rewardId: string,
    data: {
      title?: string;
      description?: string;
      pointsCost?: number;
      status?: RewardStatus;
      requiresApproval?: boolean;
      stockLimit?: number;
      currentStock?: number;
      imageUrl?: string;
      terms?: string;
    },
  ) {
    const reward = await this.prisma.reward.findFirst({
      where: { id: rewardId, tenantId },
    });

    if (!reward) {
      throw new NotFoundException('Recompensa no encontrada');
    }

    return this.prisma.reward.update({
      where: { id: rewardId },
      data,
    });
  }

  // ── Admin: Redemptions ───────────────────────────────────────────────

  async getRedemptionsAdmin(
    tenantId: string,
    status: RewardRedemptionStatus | undefined,
    page: number,
    limit: number,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const trimmedSearch = search?.trim();
    const where: Record<string, unknown> = { tenantId };
    if (status) {
      where.status = status;
    }
    if (trimmedSearch) {
      where.OR = [
        {
          member: {
            OR: [
              { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
              { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
              { displayName: { contains: trimmedSearch, mode: 'insensitive' } },
              { memberNumber: { contains: trimmedSearch, mode: 'insensitive' } },
            ],
          },
        },
        {
          reward: {
            title: { contains: trimmedSearch, mode: 'insensitive' },
          },
        },
      ];
    }

    const [redemptions, total] = await Promise.all([
      this.prisma.rewardRedemption.findMany({
        where,
        include: {
          reward: { select: { title: true, imageUrl: true } },
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              memberNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rewardRedemption.count({ where }),
    ]);

    return {
      items: redemptions.map((r) => ({
        id: r.id,
        rewardTitle: r.reward.title,
        rewardImageUrl: r.reward.imageUrl,
        member: {
          id: r.member.id,
          name:
            r.member.displayName ??
            [r.member.firstName, r.member.lastName]
              .filter(Boolean)
              .join(' '),
          memberNumber: r.member.memberNumber,
        },
        pointsSpent: r.pointsSpent,
        status: r.status,
        notes: r.notes,
        reviewedAt: r.reviewedAt,
        deliveredAt: r.deliveredAt,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveRedemption(
    tenantId: string,
    redemptionId: string,
    userId: string,
  ) {
    const redemption = await this.prisma.rewardRedemption.findFirst({
      where: { id: redemptionId, tenantId, status: 'REQUESTED' },
    });

    if (!redemption) {
      throw new NotFoundException(
        'Solicitud de canje no encontrada o ya procesada',
      );
    }

    return this.prisma.rewardRedemption.update({
      where: { id: redemptionId },
      data: {
        status: 'APPROVED',
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    });
  }

  async rejectRedemption(
    tenantId: string,
    redemptionId: string,
    userId: string,
    notes?: string,
  ) {
    const redemption = await this.prisma.rewardRedemption.findFirst({
      where: { id: redemptionId, tenantId, status: 'REQUESTED' },
      include: {
        reward: {
          select: {
            id: true,
            stockLimit: true,
            currentStock: true,
          },
        },
      },
    });

    if (!redemption) {
      throw new NotFoundException(
        'Solicitud de canje no encontrada o ya procesada',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.addPoints(
        tenantId,
        redemption.memberId,
        redemption.pointsSpent,
        PointTransactionType.ADJUSTED,
        `Reembolso por canje rechazado`,
        'reward_redemption',
        redemption.id,
        tx,
      );

      if (
        redemption.reward.stockLimit !== null &&
        redemption.reward.currentStock !== null
      ) {
        await tx.reward.update({
          where: { id: redemption.reward.id },
          data: { currentStock: { increment: 1 } },
        });
      }

      return tx.rewardRedemption.update({
        where: { id: redemptionId },
        data: {
          status: 'REJECTED',
          reviewedById: userId,
          reviewedAt: new Date(),
          notes,
        },
      });
    });
  }

  async deliverRedemption(
    tenantId: string,
    redemptionId: string,
    userId: string,
  ) {
    const redemption = await this.prisma.rewardRedemption.findFirst({
      where: { id: redemptionId, tenantId, status: 'APPROVED' },
    });

    if (!redemption) {
      throw new NotFoundException(
        'Solicitud de canje no encontrada o no aprobada',
      );
    }

    return this.prisma.rewardRedemption.update({
      where: { id: redemptionId },
      data: {
        status: 'DELIVERED',
        reviewedById: userId,
        deliveredAt: new Date(),
      },
    });
  }

  // ── Admin: Games ─────────────────────────────────────────────────────

  async getGamesAdmin(tenantId: string) {
    return this.prisma.rewardGame.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGame(
    tenantId: string,
    data: {
      title: string;
      type: RewardGameType;
      description?: string;
      pointsReward?: number;
      cooldownHours?: number;
      maxPlaysPerDay?: number;
      config?: Record<string, unknown>;
    },
  ) {
    return this.prisma.rewardGame.create({
      data: {
        tenantId,
        title: data.title,
        type: data.type,
        description: data.description,
        pointsReward: data.pointsReward,
        cooldownHours: data.cooldownHours,
        maxPlaysPerDay: data.maxPlaysPerDay,
        config: data.config
          ? (data.config as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async updateGame(
    tenantId: string,
    gameId: string,
    data: {
      title?: string;
      description?: string;
      type?: RewardGameType;
      status?: RewardGameStatus;
      pointsReward?: number;
      cooldownHours?: number;
      maxPlaysPerDay?: number;
      config?: Record<string, unknown>;
      startsAt?: Date;
      endsAt?: Date;
    },
  ) {
    const game = await this.prisma.rewardGame.findFirst({
      where: { id: gameId, tenantId },
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    return this.prisma.rewardGame.update({
      where: { id: gameId },
      data: {
        ...data,
        config: data.config
          ? (data.config as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  // ── Admin: Missions ──────────────────────────────────────────────────

  async getMissionsAdmin(tenantId: string) {
    const missions = await this.prisma.mission.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const completionCounts = await this.prisma.memberMissionProgress.groupBy({
      by: ['missionId'],
      where: {
        tenantId,
        completedAt: { not: null },
      },
      _count: { missionId: true },
    });

    const completedByMissionId = new Map(
      completionCounts.map((item) => [item.missionId, item._count.missionId]),
    );

    return missions.map((mission) => ({
      ...mission,
      completedMembersCount: completedByMissionId.get(mission.id) ?? 0,
    }));
  }

  async createMission(
    tenantId: string,
    data: {
      title: string;
      type: MissionType;
      description?: string;
      pointsReward?: number;
      targetValue?: number;
    },
  ) {
    return this.prisma.mission.create({
      data: {
        tenantId,
        title: data.title,
        type: data.type,
        description: data.description,
        pointsReward: data.pointsReward,
        targetValue: data.targetValue,
      },
    });
  }

  async updateMission(
    tenantId: string,
    missionId: string,
    data: {
      title?: string;
      description?: string;
      type?: MissionType;
      status?: MissionStatus;
      pointsReward?: number;
      targetValue?: number;
      startsAt?: Date;
      endsAt?: Date;
    },
  ) {
    const mission = await this.prisma.mission.findFirst({
      where: { id: missionId, tenantId },
    });

    if (!mission) {
      throw new NotFoundException('Misión no encontrada');
    }

    return this.prisma.mission.update({
      where: { id: missionId },
      data,
    });
  }

  // ── Private Helpers ───────────────────────────────────────────────────

  private async getOrCreateBalance(tenantId: string, memberId: string) {
    const existing = await this.prisma.memberPointBalance.findUnique({
      where: {
        tenantId_memberId: { tenantId, memberId },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.memberPointBalance.create({
      data: { tenantId, memberId },
    });
  }

  private async addPoints(
    tenantId: string,
    memberId: string,
    points: number,
    type: PointTransactionType,
    reason: string,
    sourceType?: string,
    sourceId?: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const currentBalance = await client.memberPointBalance.findUnique({
      where: {
        tenantId_memberId: { tenantId, memberId },
      },
    });

    const nextPoints = (currentBalance?.points ?? 0) + points;
    if (nextPoints < 0) {
      throw new BadRequestException('No tienes suficientes puntos');
    }

    const transaction = await client.memberPointTransaction.create({
      data: {
        tenantId,
        memberId,
        type,
        points,
        reason,
        sourceType,
        sourceId,
      },
    });

    // Update balance
    await client.memberPointBalance.upsert({
      where: {
        tenantId_memberId: { tenantId, memberId },
      },
      create: {
        tenantId,
        memberId,
        points: Math.max(0, points),
        lifetimePoints: points > 0 ? points : 0,
      },
      update: {
        points: { increment: points },
        ...(points > 0 ? { lifetimePoints: { increment: points } } : {}),
      },
    });

    return transaction;
  }

  async getSettings(tenantId: string) {
    const existing = await this.prisma.memberAppSettings.findUnique({
      where: { tenantId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.memberAppSettings.create({
      data: { tenantId },
    });
  }
}
