import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm'
import { OrderProductEntity } from './order-product.entity'
import { OrderExtraInfoEntity } from './order-extra-info.entity'
import { PaymentEntity } from '../../payment/entities/payment.entity'

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('increment', {
    type: 'int',
    comment: '自增订单ID',
  })
  id: number

  @Column({
    name: 'order_no',
    type: 'char',
    length: 30,
    unique: true,
    comment: '业务唯一订单号',
  })
  orderNo: string

  @Column({ type: 'varchar', length: 50, comment: '应用ID' })
  appid: string

  @Column({ type: 'int', comment: '用户ID' })
  uid: number

  @Column({ type: 'int', unsigned: true, comment: '订单金额（最小货币单位）' })
  amount: number

  @Column({ type: 'char', length: 10, comment: '货币类型' })
  currency: string

  @Column({
    name: 'order_status',
    type: 'varchar',
    length: 10,
    comment: '订单状态',
  })
  orderStatus: string

  @Column({
    name: 'notification_url',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '订单状态变更时通知URL',
  })
  notificationUrl?: string

  @Column({
    name: 'notification_attach',
    type: 'text',
    nullable: true,
    comment: '通知透传数据',
  })
  notificationAttach?: string

  @Column({
    name: 'updated_at',
    type: 'datetime',
    precision: 3,
    comment: '更新时间',
  })
  updatedAt: Date

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    comment: '创建时间',
  })
  createdAt: Date

  @OneToMany(() => OrderProductEntity, (orderProduct) => orderProduct.order)
  products?: OrderProductEntity[]

  @OneToOne(
    () => OrderExtraInfoEntity,
    (orderExtraInfo) => orderExtraInfo.order,
  )
  extraInfo?: OrderExtraInfoEntity

  @OneToOne(() => PaymentEntity, (payment) => payment.order)
  payment?: PaymentEntity
}
