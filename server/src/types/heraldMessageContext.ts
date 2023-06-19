import type { Socket, Server } from 'socket.io';
import type { HeraldStorageProvider } from './heraldStorageProvider';
import type { HeraldSubscription } from './heraldSubscription';
import { queueAsPromised } from 'fastq';

export type HeraldMessageContext = {
  storage: HeraldStorageProvider;
  socket: Socket;
  server: Server;
  subscriptions: Array<HeraldSubscription>;
  taskQueue: queueAsPromised<{ messageId: string; subscriberId }>;
};
