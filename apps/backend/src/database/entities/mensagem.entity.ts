import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('mensagens')
@Index(['salaId', 'enviadaEm'])
export class MensagemEntity {
  // O id e a data são definidos pelo domínio (mesma identidade da mensagem
  // transmitida em tempo real), por isso não são autogerados.
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  salaId!: string;

  @Column()
  autor!: string;

  @Column({ type: 'text' })
  conteudo!: string;

  @Column({ default: 'TEXTO' })
  tipo!: string;

  @Column({ type: 'timestamptz' })
  enviadaEm!: Date;
}
