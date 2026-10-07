import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('checkins')
export class CheckinOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  cpf!: string;

  @Column()
  nome!: string;

  // Setado explicitamente pelo CheckinService (não @CreateDateColumn), para
  // o "agora" usado na regra de negócio ser o mesmo gravado no banco.
  @Column({ name: 'chegada_em', type: 'timestamptz' })
  chegadaEm!: Date;

  @Column({ name: 'atendido_em', type: 'timestamptz', nullable: true })
  atendidoEm!: Date | null;
}
