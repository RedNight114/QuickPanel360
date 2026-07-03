import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MemberAuthService } from './member-auth.service';

@Injectable()
export class MemberAuthGuard implements CanActivate {
  constructor(private readonly memberAuthService: MemberAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acceso requerido');
    }

    const token = authHeader.slice(7);
    const { memberId, tenantId } =
      await this.memberAuthService.validateToken(token);

    request.memberAuth = { memberId, tenantId };

    return true;
  }
}
