import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { PrismaClient } from './generated/client/client';

export const initPrisma = ({
  connectionString,
}: {
  connectionString: string;
}) => {
  const adapter = new PrismaPg({ connectionString: connectionString });
  return new PrismaClient({ adapter });
};

const prisma = initPrisma({ connectionString: `${process.env.DATABASE_URL}` });

export { prisma };
