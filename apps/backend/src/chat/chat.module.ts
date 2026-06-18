import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesService } from './messages.service';
import { RoomsService } from './rooms.service';
import { SessionService } from './session.service';

/** Módulo de chat em tempo real: sessões, salas, mensagens e o gateway WebSocket. */
@Module({
  providers: [ChatGateway, SessionService, RoomsService, MessagesService],
})
export class ChatModule {}
