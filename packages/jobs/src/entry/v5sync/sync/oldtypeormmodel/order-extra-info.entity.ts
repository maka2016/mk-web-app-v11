import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { OrderEntity } from './order.entity'

@Entity('order_extra_info')
export class OrderExtraInfoEntity {
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

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '设备信息' })
  device?: string

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '设备版本号',
  })
  version?: string

  @Column({
    name: 'bundle_id',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Bundle ID',
  })
  bundleId?: string

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: '用户 IP 地址',
  })
  ip?: string

  @Column({
    name: 'header_info',
    type: 'text',
    nullable: true,
    comment: 'Header 信息',
  })
  headerInfo?: string

  @Column({
    name: 'channel_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '渠道ID',
  })
  channelId?: string

  @Column({
    name: 'device_identifiers',
    type: 'text',
    nullable: true,
    comment: '设备标识符',
  })
  deviceIdentifiers?: string

  @Column({
    name: 'utm_metadata',
    type: 'text',
    nullable: true,
    comment: 'UTM 元数据',
  })
  utmMetadata?: string

  @Column({
    name: 'trace_metadata',
    type: 'text',
    nullable: true,
    comment: '来源追踪元数据',
  })
  traceMetadata?: string

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: '用户语言和地区',
  })
  locale: string

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

  @OneToOne(() => OrderEntity, (order) => order.extraInfo)
  @JoinColumn({ name: 'order_no', referencedColumnName: 'orderNo' })
  order?: OrderEntity
}
