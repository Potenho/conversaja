import { TipoMensagem } from '@conversaja/shared';
import { MessagesService } from './messages.service';
import { DomainError } from './domain-error';
import { InMemoryMensagemStore } from './stores/in-memory.store';

describe('MessagesService (RN04, RN05, RNF06 — mensagens)', () => {
  let service: MessagesService;

  beforeEach(() => {
    service = new MessagesService(new InMemoryMensagemStore());
  });

  it('armazena uma mensagem válida', async () => {
    const msg = await service.adicionar('sala-1', 'maria', 'Olá pessoal');
    expect(msg.conteudo).toBe('Olá pessoal');
    expect(msg.tipo).toBe(TipoMensagem.TEXTO);
    expect(await service.recentes('sala-1')).toHaveLength(1);
  });

  it('rejeita mensagem vazia ou só com espaços (RN05)', async () => {
    await expect(service.adicionar('sala-1', 'maria', '   ')).rejects.toThrow(
      DomainError,
    );
  });

  it('rejeita mensagem acima de 500 caracteres (RN04)', async () => {
    const longa = 'a'.repeat(501);
    await expect(service.adicionar('sala-1', 'maria', longa)).rejects.toThrow(
      'limite',
    );
  });

  it('sanitiza conteúdo para evitar XSS (RNF06)', async () => {
    const msg = await service.adicionar(
      'sala-1',
      'maria',
      '<script>alert(1)</script>',
    );
    expect(msg.conteudo).not.toContain('<script>');
    expect(msg.conteudo).toContain('&lt;script&gt;');
  });

  it('remove uma mensagem existente (RF12) e falha em id inexistente', async () => {
    const msg = await service.adicionar('sala-1', 'maria', 'apagar isto');
    await service.remover('sala-1', msg.id);
    expect(await service.recentes('sala-1')).toHaveLength(0);
    await expect(service.remover('sala-1', 'nao-existe')).rejects.toThrow(
      DomainError,
    );
  });

  it('retorna apenas as mensagens recentes em ordem cronológica (RF08)', async () => {
    for (let i = 0; i < 60; i++) {
      await service.adicionar('sala-1', 'maria', `msg ${i}`);
    }
    const recentes = await service.recentes('sala-1');
    expect(recentes).toHaveLength(50);
    expect(recentes[recentes.length - 1].conteudo).toBe('msg 59');
  });
});
