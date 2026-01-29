import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm'

@Entity({ name: 'payment_tokens_log' })
export class PaymentTokensLogEntity {
  @PrimaryGeneratedColumn({ name: 'log_id', type: 'bigint', unsigned: true })
  logId: string

  @Column({ type: 'int', unsigned: true })
  @Index('idx_id')
  id: number

  @Column({ type: 'varchar', length: 50, comment: '应用ID' })
  appid: string

  @Column({ type: 'int', comment: '用户ID' })
  uid: number

  @Column({ name: 'original_record', type: 'text' })
  originalRecord: string

  @Column({ type: 'varchar', length: 20 })
  operation: string

  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Index('idx_created_at')
  createdAt: Date
}
