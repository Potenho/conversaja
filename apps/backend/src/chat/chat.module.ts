import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaEntity } from '../database/entities/sala.entity';
import { MensagemEntity } from '../database/entities/mensagem.entity';
import { ChatGateway } from './chat.gateway';
import { MaintenanceService } from './maintenance.service';
import { MessagesService } from './messages.service';
import { RoomsService } from './rooms.service';
import { SessionService } from './session.service';
import { SalaStore } from './stores/sala-store';
import { MensagemStore } from './stores/mensagem-store';
import { TypeOrmMensagemStore, TypeOrmSalaStore } from './stores/typeorm.store';

/** Módulo de chat em tempo real: sessões, salas, mensagens e o gateway WebSocket. */
@Module({
  imports: [TypeOrmModule.forFeature([SalaEntity, MensagemEntity])],
  providers: [
    ChatGateway,
    MaintenanceService,
    SessionService,
    RoomsService,
    MessagesService,
    { provide: SalaStore, useClass: TypeOrmSalaStore },
    { provide: MensagemStore, useClass: TypeOrmMensagemStore },
  ],
  exports: [
    ChatGateway,
    SessionService,
    RoomsService,
    SalaStore,
    MensagemStore,
  ],
})
export class ChatModule {}
