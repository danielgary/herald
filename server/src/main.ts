import { HeraldPrismaStorageProvider } from './classes/heraldPrismaStorage';
import { createHeraldServer } from './operations/createHeraldServer';

async function startServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 9110;
  const storage = new HeraldPrismaStorageProvider();

  await createHeraldServer({ port, storage });
}

startServer();
