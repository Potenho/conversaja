import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [DatabaseModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
