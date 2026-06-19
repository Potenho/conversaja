import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('salas')
export class SalaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  nome!: string;

  @Column()
  tema!: string;

  @Column({ default: 'PUBLICA' })
  visibilidade!: string;

  @Column({ type: 'int', default: 50 })
  capacidadeMax!: number;

  @Column()
  criadorApelido!: string;

  @CreateDateColumn()
  criadaEm!: Date;
}
