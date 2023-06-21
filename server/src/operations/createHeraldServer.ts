import { Server } from 'socket.io';
import { HeraldStorageProvider } from '../types/heraldStorageProvider';
import { HeraldSubscription } from '../types/heraldSubscription';
import { KnownCommands, MessageStates } from 'common';
import { subscribeActivity } from '../activities/subscribeActivity';
import { HeraldMessageContext } from '../types/heraldMessageContext';
import * as fastq from 'fastq';
import { publishActivity } from '../activities/publishActivity';
import { processMessageForSubscriber } from './processMessageForSubscriber';
import { acknowledgeMessageActivity } from '../activities/acknowledgeMessageActivity';
import { requeueMessageActivity } from '../activities/requeueMessageActivity';
import { setInterval } from 'timers';

export type HeraldServerArgs = {
  path?: string;
  port?: number;
  storage: HeraldStorageProvider;
  staleThresholdSeconds?: number;
  staleCheckIntervalSeconds?: number;
};

export async function createHeraldServer(args: HeraldServerArgs) {
  const subscriptions: Array<HeraldSubscription> = [];

  const server = new Server({
    cors: { origin: '*' },
  });

  try {
    server.listen(args.port || 5000);
  } catch (err) {
    console.error(err);
    throw err;
  }

  const taskQueue = fastq.promise(
    { storage: args.storage, server, subscriptions },
    processMessageForSubscriber,
    1
  );

  setInterval(async () => {
    const stale = await args.storage.getStaleSubscriberMessages(
      args.staleThresholdSeconds
    );
    if (stale.length > 0) {
      console.warn(`Found ${stale.length} stale messages`);

      for (let i = 0; i < stale.length; i++) {
        await args.storage.updateSubscriberMessage(
          stale[i].messageId,
          stale[i].subscriberId,
          {
            state: MessageStates.ERROR,
            errorText: 'Timeout',
          }
        );
      }
    }
  }, (args.staleCheckIntervalSeconds || 60) * 1000);

  server.on('connect', async (socket) => {
    socket.use((ev, next) => {
      const context: HeraldMessageContext = {
        taskQueue,
        subscriptions,
        socket,
        server,
        storage: args.storage,
      };

      ev.push(context);
      next();
    });

    socket.on('disconnect', () => {
      subscriptions
        .filter((s) => s.socketId === socket.id)
        .map((s) => {
          s.socketId = null;
        });
    });

    socket.on(KnownCommands.Subscribe, subscribeActivity);
    socket.on(KnownCommands.Publish, publishActivity);
    socket.on(KnownCommands.Acknowledge, acknowledgeMessageActivity);
    socket.on(KnownCommands.Requeue, requeueMessageActivity);
    // socket.on(KnownCommands.Hello, helloActivity);
  });
}
