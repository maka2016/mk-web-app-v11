import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { OrderEntity } from '../../order/entities/order.entity'

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', comment: '自增ID' })
  id: number

  @Column({
    name: 'order_no',
    type: 'char',
    length: 30,
    unique: true,
    comment: '订单号',
  })
  orderNo: string

  @Column({ type: 'varchar', length: 50, comment: '应用ID' })
  appid: string

  @Column({ type: 'int', comment: '用户ID' })
  uid: number

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 20,
    comment: '支付方式',
  })
  paymentMethod: string

  @Column({
    name: 'payment_type',
    type: 'varchar',
    length: 20,
    comment: '支付类型',
  })
  paymentType: string

  @Column({
    name: 'transaction_id',
    type: 'char',
    length: 100,
    comment: '支付交易ID',
    nullable: true,
  })
  transactionId: string

  @Column({ type: 'int', unsigned: true, comment: '支付金额' })
  amount: number

  @Column({ type: 'varchar', length: 10, comment: '货币类型' })
  currency: string

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 10,
    comment: '支付状态',
  })
  paymentStatus: string

  @Column({
    name: 'raw_response',
    type: 'text',
    nullable: true,
    comment: '渠道原始响应',
  })
  rawResponse?: string

  @Column({
    name: 'paid_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: '支付完成时间',
  })
  paidAt?: Date

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

  @OneToOne(() => OrderEntity, (order) => order.payment)
  @JoinColumn({ name: 'order_no', referencedColumnName: 'orderNo' })
  order?: OrderEntity
}
