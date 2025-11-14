import { betterAuth } from 'better-auth';
import { bearer, phoneNumber } from 'better-auth/plugins';
import 'dotenv/config'; // 会自动加载 .env
import { Pool } from 'pg';

// 假设我们用一个 map 临时存储 code

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

  plugins: [
    bearer(),
    phoneNumber({
      otpLength: 4,
      requireVerification: false,
      sendOTP: ({ phoneNumber, code }, request) => {
        try {
          console.log('sendOTP', phoneNumber, code, request);
          // const resp = await smsClient.send({
          //   phoneNumber,
          //   templateParams: [code],
          // });
          // if (!resp.success) {
          //   throw new Error(resp.message ?? '短信发送失败');
          // }
          throw new Error('短信发送失败，请稍后再试');
        } catch (err) {
          console.error('sendOTP error', err);
        }
        // Implement sending OTP code via SMS
      },
      signUpOnVerification: {
        getTempEmail: phoneNumber => {
          return `${phoneNumber}@makaai.com`;
        },
        //optionally, you can also pass `getTempName` function to generate a temporary name for the user
        getTempName: phoneNumber => {
          return phoneNumber; //by default, it will use the phone number as the name
        },
      },
    }),
  ],
});
