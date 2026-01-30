import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm'

@Entity({ name: 'payment_webhooks', comment: '支付回调日志表' })
@Unique(['eventId'])
export class PaymentWebhookEntity {
  @PrimaryGeneratedColumn({ unsigned: true, comment: '自增ID' })
  id: number

  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 64,
    comment: '事件类型',
  })
  eventType: string

  @Column({
    name: 'event_id',
    type: 'varchar',
    length: 128,
    comment: '事件唯一ID（防止重复处理）',
  })
  eventId: string

  @Column({
    type: 'varchar',
    length: 20,
    comment: '支付渠道 WECHAT, ALIPAY, APPLE, GOOGLE',
  })
  channel: string

  @Column({ type: 'text', comment: '原始回调数据' })
  payload: string

  @Column({
    type: 'varchar',
    length: 15,
    comment: '处理状态',
  })
  status: string

  @Column({
    name: 'retry_count',
    type: 'tinyint',
    unsigned: true,
    comment: '重试次数',
  })
  retryCount: number

  @Column({
    name: 'last_attempt_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: '上次尝试时间',
  })
  lastAttemptAt?: Date

  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
    comment: '创建时间',
    name: 'created_at',
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'datetime',
    precision: 3,
    comment: '更新时间',
    name: 'updated_at',
  })
  updatedAt: Date
}
