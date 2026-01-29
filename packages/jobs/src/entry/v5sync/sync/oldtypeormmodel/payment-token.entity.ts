import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity('payment_tokens')
export class PaymentTokenEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', comment: '自增ID' })
  id: number

  @Column({ type: 'varchar', length: 50, comment: '应用ID' })
  appid: string

  @Column({ type: 'int', comment: '用户ID' })
  uid: number

  @Column({
    name: 'bundle_id',
    type: 'varchar',
    length: 50,
    comment: 'bundle_id',
  })
  bundleId: string

  @Column({
    type: 'varchar',
    length: 20,
    comment: '支付渠道',
  })
  channel: string

  @Column({
    name: 'token_type',
    type: 'varchar',
    length: 20,
    comment: '凭证类型',
  })
  tokenType: string

  @Column({ name: 'token_value', type: 'text', comment: '凭证数据' })
  tokenValue: string

  @Column({ name: 'extra', type: 'text', nullable: true, comment: '额外数据' })
  extra: string

  @Column({
    name: 'expires_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: '凭证过期时间',
  })
  expiresAt?: Date

  @Column({ name: 'is_valid', type: 'tinyint', comment: '手动标记失效' })
  isValid: boolean

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    comment: '创建时间',
  })
  createdAt: Date

  @Column({
    name: 'updated_at',
    type: 'datetime',
    precision: 3,
    comment: '更新时间',
  })
  updatedAt: Date
}
