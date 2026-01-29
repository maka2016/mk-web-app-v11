import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('payment_history')
export class PaymentHistoryEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', comment: '自增ID' })
  id: number

  @Column({ name: 'payment_id', type: 'int', comment: '支付ID' })
  paymentId: number

  @Column({ name: 'order_no', type: 'char', length: 30, comment: '订单号' })
  orderNo: string

  @Column({ type: 'varchar', length: 50, comment: '应用ID' })
  appid: string

  @Column({ type: 'bigint', comment: '用户ID' })
  uid: number

  @Column({
    name: 'original_record',
    type: 'varchar',
    length: 10,
    comment: '原记录数据（JSON格式）',
  })
  originalRecord: string

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    comment: '创建时间',
  })
  createdAt: Date
}
