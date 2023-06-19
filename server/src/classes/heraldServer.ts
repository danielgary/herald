// import { Server } from 'socket.io';
// import { HeraldSubscription } from '../types/subscription';
// import {
//   AcknowledgeCommandArgs,
//   HeraldMessage,
//   KnownCommands,
//   MessageStates,
//   ProgressCommandArgs,
//   doesMessageMatchSubscription,
// } from 'common';
// import { HeraldStorageProvider } from '../types/heraldStorageProvider';
// import { HeraldPrismaStorageProvider } from './heraldPrismaStorage';
// import * as fastq from 'fastq';
// import type { queueAsPromised } from 'fastq';

// export type HeraldServerArgs = {
//   path?: string;
//   port?: number;
//   storage: HeraldStorageProvider;
// };

// export class HeraldServer {
//   private server: Server;
//   private subscriptions: Array<HeraldSubscription> = [];
//   public storage: HeraldStorageProvider;
//   private taskQueue: queueAsPromised<{
//     messageId: string;
//     subscriberId: string;
//   }>;

//   constructor(
//     args: HeraldServerArgs = { storage: new HeraldPrismaStorageProvider() }
//   ) {
//     this.server = new Server({
//       cors: { origin: '*' },
//     });

//     this.taskQueue = fastq.promise(this, this.sendSubscriberMessage, 1);

//     console.log(`Opening server on port ${args.port || 5000}`);
//     try {
//       this.server.listen(args.port || 5000);
//     } catch (err) {
//       console.error(err);
//     }

//     try {
//       this.storage = new HeraldPrismaStorageProvider();
//       this.storage.dequeueNextSubscriberMessage('test1');
//     } catch (err) {
//       console.error(err);
//     }
//     this.server.on('error', (args) => {
//       console.error(args);
//     });
//     this.server.on('connection', (socket) => {
//       socket.on(
//         KnownCommands.Subscribe,
//         async (args: {
//           subscriberId: string;
//           subscriptions: { sender?: string; type?: string };
//         }) => {
//           // console.log('SUBSCRIBE');
//           const thisSubscription = new HeraldSubscription({
//             socketId: socket.id,
//             subscriptions: args.subscriptions,
//             subscriberId: args.subscriberId,
//           });

//           this.subscriptions.push(thisSubscription);

//           await this.storage.saveSubscriptions(
//             args.subscriberId,
//             args.subscriptions
//           );

//           // Get all queued messages for each of these subscriptions
//           const queuedMessages =
//             await this.storage.getAllQueuedMessagesForSubscriber(
//               args.subscriberId
//             );

//           console.log(
//             `Queuing ${queuedMessages.length} messages for ${args.subscriberId}`
//           );
//           queuedMessages.forEach((q) => {
//             if (thisSubscription.shouldEmitMessage(q.message)) {
//               this.taskQueue.push({
//                 messageId: q.messageId,
//                 subscriberId: args.subscriberId,
//               });
//             }
//           });
//         }
//       );
//       socket.on('disconnect', async () => {
//         this.subscriptions = this.subscriptions.filter(
//           (s) => s.socketId !== socket.id
//         );
//       });

//       socket.on(
//         KnownCommands.Acknowledge,
//         async (args: AcknowledgeCommandArgs) => {
//           await this.storage.updateSubscriberMessage(
//             args.messageId,
//             args.subscriberId,
//             {
//               state: MessageStates.PROCESSED,
//             }
//           );
//         }
//       );

//       socket.on(KnownCommands.Progress, async (args: ProgressCommandArgs) => {
//         await this.storage.updateSubscriberMessage(
//           args.messageId,
//           args.subscriberId,
//           {
//             state: MessageStates.PROCESSING,
//             progress: args.progress,
//             progressText: args.text,
//           }
//         );
//       });

//       socket.on(KnownCommands.Publish, async (args: HeraldMessage) => {
//         const targets = this.subscriptions.filter((s) =>
//           s.shouldEmitMessage(args)
//         );

//         // Write message to storage
//         // Write SubscriberMessages to storage
//         const messageId = await this.storage.saveMessage(args);
//         await this.storage.createSubscriberMessages(
//           messageId,
//           targets.map((t) => t.subscriberId)
//         );

//         targets.forEach((t) => {
//           this.taskQueue.push({ messageId, subscriberId: t.subscriberId });
//         });
//       });
//     });
//   }

//   private async sendSubscriberMessage({
//     messageId,
//     subscriberId,
//   }: {
//     messageId: string;
//     subscriberId: string;
//   }) {
//     try {
//       const message = await this.storage.dequeueMessageForSubscriber(
//         messageId,
//         subscriberId
//       );
//       if (!message) {
//         throw new Error(
//           `Message ${messageId} not found for subscriber ${subscriberId}`
//         );
//       }

//       const subscription = this.subscriptions.find(
//         (x) => x.subscriberId === subscriberId
//       );

//       if (!subscription) {
//         throw new Error(`No subscription found matching ${subscriberId}`);
//       }

//       if (subscription) {
//         await this.server
//           .to(subscription.socketId)
//           .emit(message.type, { body: message.body, sender: message.sender });
//       }
//     } catch (err) {
//       console.error(err);
//       await this.storage.updateSubscriberMessage(messageId, subscriberId, {
//         errorText: err.message,
//         state: MessageStates.ERROR,
//       });
//     }
//   }
// }
