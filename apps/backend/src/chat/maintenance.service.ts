import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { RoomsService } from './rooms.service';

/**
 * Varredura periódica que aplica a RN07: remove salas públicas ociosas e
 * atualiza o lobby de todos quando alguma é removida.
 */
@Injectable()
export class MaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceService.name);
  private readonly intervaloMs = 60_000; // varre a cada 1 minuto
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly rooms: RoomsService,
    private readonly gateway: ChatGateway,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.varrer(), this.intervaloMs);
    // Não impedir o encerramento do processo por causa do timer.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Remove as salas ociosas e notifica o lobby se houver mudanças. */
  async varrer(): Promise<void> {
    const removidas = await this.rooms.removerSalasOciosas();
    if (removidas.length > 0) {
      this.logger.log(
        `Removidas ${removidas.length} sala(s) ociosa(s) (RN07).`,
      );
      await this.gateway.notificarSalas();
    }
  }
}
