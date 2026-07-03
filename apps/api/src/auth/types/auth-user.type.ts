import { UserRole } from '@prisma/client';

export type AuthUser = {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  tenantUserId: string;
  role: UserRole;
  permissions: string[];
  supportSessionId?: string;
  impersonatedByUserId?: string;
};
