import { createHeraldServer } from './createHeraldServer';
import { HeraldPrismaStorageProvider } from '../classes/heraldPrismaStorage';
import { addSeconds } from 'date-fns';
import { MessageStates } from 'common';
import { randomInt } from 'crypto';
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('createHeraldServer', () => {
  it('Should flag stale messages', async () => {
    const PORT = randomInt(7000, 7999);
    const storage = new HeraldPrismaStorageProvider();
    await storage.__dangerous__flushAllData();

    const server = await createHeraldServer({
      storage: new HeraldPrismaStorageProvider(),
      staleCheckIntervalSeconds: 1,
      staleThresholdSeconds: 1,
      port: PORT,
    });

    await storage.prisma.subscriberMessage.create({
      data: {
        updatedAt: addSeconds(new Date(), -10),
        state: MessageStates.PROCESSING,
        subscriberId: 'test',
        message: {
          create: {
            body: '',
            source: 'test',
            type: 'test',
            created: addSeconds(new Date(), -10),
          },
        },
      },
    });

    await delay(2000);

    const staleCount = await storage.prisma.subscriberMessage.count({
      where: {
        subscriberId: 'test',
        state: MessageStates.QUEUED,
        errors: 1,

        errorText: 'Timeout',
      },
    });
    expect(staleCount).toEqual(1);
  });
});
