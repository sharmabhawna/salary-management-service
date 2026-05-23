const required = ['DATABASE_URL', 'PORT'] as const;

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const config = {
  databaseUrl: process.env.DATABASE_URL as string,
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isTest: process.env.NODE_ENV === 'test',
};