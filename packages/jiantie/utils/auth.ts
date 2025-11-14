import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import 'dotenv/config'; // 会自动加载 .env
import { Pool } from 'pg';
export const auth = betterAuth({
  trustedOrigins: ['*'],
  session: {
    strategy: 'jwt',
    disableSessionRefresh: true, // JWT 不需要刷新
    expiresIn: 60 * 60 * 24 * 90, // 30 days
    // updateAge: 60 * 60 * 24, // 1day
  },

  database: new Pool({
    connectionString: process.env.AUTH_DATABASE_URL,
  }),
  socialProviders: {
    apple: {
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: process.env.APPLE_CLIENT_SECRET as string,
    },
    // google: {
    //   clientId: '1',
    //   clientSecret: '2',
    // },
  },
  emailAndPassword: {
    enabled: true,
  },

  plugins: [bearer()],
});
