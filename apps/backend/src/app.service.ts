import { Injectable } from '@nestjs/common';
import { LIMITES } from '@conversaja/shared';

@Injectable()
export class AppService {
  /** Endpoint simples de saúde, expõe limites de negócio compartilhados. */
  getStatus(): { servico: string; limites: typeof LIMITES } {
    return { servico: 'ConversaJá', limites: LIMITES };
  }
}
