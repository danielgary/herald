import { SubscribeCommandArgs } from 'common';
import { HeraldMessageContext } from '../types/heraldMessageContext';

export async function subscribeActivity(
  args: SubscribeCommandArgs,
  context: HeraldMessageContext
) {
  /**
   * 1. Update socket id in subscriptions
   * 2. Save subscription to database
   * 3.
   */

  const existing = context.subscriptions.find(
    (x) =>
      x.sender === args.subscription.sender &&
      x.type === args.subscription.type &&
      x.subscriberId === args.subscriberId
  );
  if (!existing) {
    context.subscriptions.push({
      socketId: context.socket.id,
      subscriberId: args.subscriberId,
      sender: args.subscription.sender,
      type: args.subscription.type,
    });
  } else {
    for (const s of context.subscriptions) {
      if (s.subscriberId === args.subscriberId) {
        s.socketId = context.socket.id;
      }
    }
  }

  // 1
  // context.subscriptions
  //   .filter((s) => s.subscriberId === args.subscriberId)
  //   .map((s) => {
  //     s.socketId = context.socket.id;
  //   });

  // 2
  await context.storage.saveSubscription(args.subscriberId, args.subscription);

  const pendingMessages =
    await context.storage.getAllQueuedMessagesForSubscriber(args.subscriberId);

  const currentlyQueued = context.taskQueue.getQueue();
  pendingMessages
    .filter(
      (m) =>
        !currentlyQueued.includes({
          messageId: m.messageId,
          subscriberId: args.subscriberId,
        })
    )
    .map((m) => {
      context.taskQueue.push({
        messageId: m.messageId,
        subscriberId: args.subscriberId,
      });
    });

  await context.socket.emit('SUBSCRIBE_ACK', args);
}
