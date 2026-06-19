import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Protege as rotas administrativas. O administrador se autentica enviando o
 * cabeçalho `x-admin-token`, comparado com a variável de ambiente ADMIN_TOKEN
 * (padrão "admin" em desenvolvimento).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-admin-token'];
    const esperado = process.env.ADMIN_TOKEN ?? 'admin';
    if (token !== esperado) {
      throw new UnauthorizedException('Token de administrador inválido.');
    }
    return true;
  }
}
