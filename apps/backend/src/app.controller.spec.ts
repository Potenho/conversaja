import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('status', () => {
    it('retorna o nome do serviço e os limites de negócio compartilhados', () => {
      const status = appController.getStatus();
      expect(status.servico).toBe('ConversaJá');
      expect(status.limites.MENSAGEM_MAX).toBe(500);
    });
  });
});
