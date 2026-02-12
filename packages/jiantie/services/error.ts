export class SaveError extends Error {
  name = 'SaveError';

  constructor(message: string) {
    super(message);
    console.log(message);
  }
}

export class NetworkError extends Error {
  name = 'NetworkError';

  constructor(message: string) {
    super(message);
    console.log(message);
  }
}

export class TokenError extends Error {
  name = 'TokenError';

  constructor(message: string) {
    super(message);
    console.log(message);
  }
}
