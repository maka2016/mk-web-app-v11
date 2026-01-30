import knex, { Knex } from 'knex';

class DB {
  makadb: Knex;
  biAdb: Knex;
  makauserPropertyDB: Knex;
  makaContentDB: Knex;
  marketActivityDB: Knex;
  makaStoreDB: Knex;
  makawriteDB: Knex;
  usercenterDB: Knex;
  wenzyDB: Knex;
  pgDB: Knex;
  makadata: Knex;
  workV2Db: Knex;

  orderDB: Knex;
  constructor() {
    this.makadb = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
        user: 'mso_read_only',
        password: 'j3E4h6NWBQ5U',
        database: 'makaplatv4',
      },
    });

    this.makadata = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
        user: 'mso_read_only',
        password: 'j3E4h6NWBQ5U',
        database: 'makadata',
      },
    });

    this.marketActivityDB = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rm-2ze2ogt63if7p51t3822.mysql.rds.aliyuncs.com',
        user: 'mso_read_only',
        password: 'j3E4h6NWBQ5U',
        database: 'market_activity',
      },
    });

    this.biAdb = knex({
      client: 'mysql',
      connection: {
        host: 'am-2zeo48x814d64lo93167330.ads.aliyuncs.com',
        // user: "root",
        // password: "uB=$4ySh2Zak",
        user: 'report_api',
        password: 'j3E4h6NWBQ5U-',
        database: 'mk_datawork',
      },
    });

    this.makauserPropertyDB = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
        user: 'mso_read_only',
        password: 'j3E4h6NWBQ5U',
        database: 'mk-userproperty-center',
      },
    });

    this.makaContentDB = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
        user: 'mso_read_only',
        password: 'j3E4h6NWBQ5U',
        database: 'mk_content_center',
      },
    });

    this.makaStoreDB = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com', //数据库地址
        user: 'query_prod', //数据库登录名
        password: 'jCItnVtI0k67RBrt', //数据库登录密码
        // database : 'makaplatv4' //要操作的库名称
        database: 'mk-store-center',
      },
    });

    this.makawriteDB = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com', //数据库地址
        user: 'query_prod', //数据库登录名
        password: 'jCItnVtI0k67RBrt', //数据库登录密码
        database: 'makaplatv4', //要操作的库名称
        // database: 'mk-store-center',
      },
    });

    this.usercenterDB = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com', //数据库地址
        user: 'query_prod', //数据库登录名
        password: 'jCItnVtI0k67RBrt', //数据库登录密码
        database: 'mk_user_center', //要操作的库名称
      },
    });

    this.orderDB = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com', //数据库地址
        user: 'query_prod', //数据库登录名
        password: 'jCItnVtI0k67RBrt', //数据库登录密码
        database: 'mk_order_center', //要操作的库名称
      },
    });

    this.wenzyDB = knex({
      client: 'mysql', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com', //数据库地址
        user: 'query_prod', //数据库登录名
        password: 'jCItnVtI0k67RBrt', //数据库登录密码
        database: 'mk_wenzy', //要操作的库名称
      },
    });

    this.pgDB = knex({
      client: 'pg', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'pgm-2zej954yimh6gxjh174350.pg.rds.aliyuncs.com', //数据库地址
        user: 'crud', //数据库登录名
        password: 'wrb1MVP0v9VqFOK58LmbUMu', //数据库登录密码
        database: 'mk-chat-project', //要操作的库名称
      },
    });

    this.workV2Db = knex({
      client: 'pg', //指定knex要操作的数据库为MySQL
      connection: {
        host: 'pgm-2zej954yimh6gxjh174350.pg.rds.aliyuncs.com', //数据库地址
        user: 'crud', //数据库登录名
        password: 'wrb1MVP0v9VqFOK58LmbUMu', //数据库登录密码
        database: 'works-v2-db', //要操作的库名称
      },
    });
  }
}

export default new DB();
