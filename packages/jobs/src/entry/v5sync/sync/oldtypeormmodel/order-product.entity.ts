import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { OrderEntity } from './order.entity'

@Entity('order_products')
export class OrderProductEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', comment: '自增ID' })
  id: number

  @Column({ name: 'order_no', type: 'char', length: 30, comment: '订单号' })
  orderNo: string

  @Column({ type: 'varchar', length: 50, comment: '应用ID' })
  appid: string

  @Column({ type: 'int', comment: '用户ID' })
  uid: number

  @Column({
    name: 'external_product_id',
    type: 'varchar',
    length: 255,
    comment: '外部商品ID',
  })
  externalProductId: string

  @Column({
    name: 'product_name',
    type: 'varchar',
    length: 255,
    comment: '商品名称',
  })
  productName: string

  @Column({
    name: 'product_price',
    type: 'int',
    unsigned: true,
    comment: '商品价格（最小货币单位）',
  })
  productPrice: number

  @Column({ type: 'char', length: 10, comment: '货币类型' })
  currency: string

  @Column({
    name: 'product_type',
    type: 'varchar',
    length: 50,
    comment: '商品类型',
  })
  productType: string

  @Column({
    name: 'product_thumbnail_url',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '商品缩略图',
  })
  productThumbnailUrl?: string

  @Column({ type: 'int', comment: '商品数量' })
  quantity: number

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

  @ManyToOne(() => OrderEntity, (order) => order.products)
  @JoinColumn({ name: 'order_no', referencedColumnName: 'orderNo' })
  order?: OrderEntity
}
