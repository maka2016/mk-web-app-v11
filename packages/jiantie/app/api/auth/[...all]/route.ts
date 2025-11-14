import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '../../../../utils/auth';

// console.log(auth.api);

// auth.api.signInSocial({
//   provider: 'apple',
//   idToken: idToken,
// });
export const { POST, GET } = toNextJsHandler(auth);
