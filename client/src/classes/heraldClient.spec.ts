import { Socket } from 'socket.io-client';
import { HeraldClient } from './heraldClient';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { createHeraldServer } from 'server/src/operations/createHeraldServer';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { HeraldPrismaStorageProvider } from 'server/src/classes/heraldPrismaStorage';
import { randomInt } from 'crypto';
import { MessageStates } from 'common';

let server;
const PORT = randomInt(7000, 7999);
let storage: HeraldPrismaStorageProvider;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForConnection(socket: Socket) {
  return new Promise<void>(function (resolve) {
    socket.on('connect', resolve);
  });
}

function waitForDisconnect(socket: Socket, maxTime = 500) {
  return new Promise<void>(function (resolve, reject) {
    if (maxTime <= 0) {
      socket.disconnect();
    }
    const start = Date.now();
    setTimeout(function () {
      if (socket.disconnected) {
        resolve();
      } else {
        waitForDisconnect(socket, maxTime - (Date.now() - start))
          .then(resolve)
          .catch(reject);
      }
    }, 5);
  });
}

async function createTestClient(id: string, closeAfter = 1) {
  const c = new HeraldClient({
    subscriberId: id,
    serverAddress: `http://localhost:${PORT}`,
  });

  await waitForConnection(c.socket);

  c.socket.onAny((eventName, ...args) => {
    if (c.messagesReceived >= closeAfter) {
      c.socket.disconnect();
    }
  });

  return c;
}

beforeAll(async () => {
  storage = new HeraldPrismaStorageProvider();
  server = createHeraldServer({
    port: PORT,
    storage: new HeraldPrismaStorageProvider(),
  });
  await storage.__dangerous__flushAllData();
});

describe('client', () => {
  it('Should send one message to one subscriber', async () => {
    const c = await createTestClient('test1', 1);
    let result = false;
    await c.subscribe({ sender: 'test1', type: 'hello' }, async () => {
      result = true;
    });
    await c.publish('hello', { test: 'WHAT!' });
    await waitForDisconnect(c.socket);
    expect(result).toBeTruthy();
  });

  it('Should only send messages to subscribers', async () => {
    const client1 = await createTestClient('client1', 3);
    const client2 = await createTestClient('client2', 1);

    let result1 = 0;
    let result2 = 0;

    await client1.subscribe({ sender: 'client1' }, async () => {
      result1++;
    });

    await client2.subscribe({ sender: 'client1', type: 'hello' }, async () => {
      result2++;
    });

    await client1.publish('hello', { test: 'WHAT!' });

    await client1.publish('world', { test: 'world' });

    await waitForDisconnect(client1.socket);
    await waitForDisconnect(client2.socket);

    expect(result1).toEqual(2);
    expect(result2).toEqual(1);
  });

  it('Should send queued messages on reconnect', async () => {
    const subscriber = await createTestClient('subscriber');
    const publisher = await createTestClient('publisher');

    let result = 0;

    await subscriber.subscribe(
      { sender: 'publisher', type: 'hello' },
      async () => {
        result++;
      }
    );

    await subscriber.socket.disconnect();
    await delay(200);

    await publisher.publish('hello', {});
    await publisher.publish('hello', {});

    const subscriber2 = await createTestClient('subscriber', 2);

    await subscriber2.subscribe(
      { sender: 'publisher', type: 'hello' },
      async () => {
        result++;
      }
    );

    await waitForDisconnect(subscriber2.socket, 1000).catch((err) => {
      console.error({ result, err });
    });
    expect(result).toEqual(2);
  });

  it('Should mark messages as processed if processed succesfully', async () => {
    const sub = await createTestClient('sub', 2);

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await sub.subscribe({ sender: 'sub' }, async () => {});

    let processedMessageCount = await storage.prisma.subscriberMessage.count({
      where: { subscriberId: 'sub', state: MessageStates.PROCESSED },
    });
    expect(processedMessageCount).toEqual(0);

    await sub.publish('sub', {});

    await delay(100);

    processedMessageCount = await storage.prisma.subscriberMessage.count({
      where: { subscriberId: 'sub', state: MessageStates.PROCESSED },
    });

    expect(processedMessageCount).toEqual(1);
  });
});

it('Should retry messages 3 times before marking them as errored', async () => {
  const sub = await createTestClient('errorSub', 3);
  let executionCount = 0;
  await sub.subscribe({ sender: 'errorSub' }, async () => {
    executionCount++;
    throw new Error(`Failed!`);
  });

  await sub.publish('failure', {});

  await waitForDisconnect(sub.socket, 1000);

  const errorCount = await storage.prisma.subscriberMessage.count({
    where: { subscriberId: 'errorSub', state: MessageStates.ERROR },
  });
  expect(executionCount).toEqual(3);
  expect(errorCount).toEqual(1);
});

afterAll(async () => {
  //await storage.__dangerous__flushAllData();
});
