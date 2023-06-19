import { PublishCommandArgs, doesMessageMatchSubscription } from 'common';
import { HeraldMessageContext } from '../types/heraldMessageContext';
import { uniq } from 'lodash';

export async function publishActivity(
  args: PublishCommandArgs<any>,
  context: HeraldMessageContext
) {
  /**
   * 1. Save message to database
   * 2. Create subscriber messages in database
   * 3. Add messages to queues
   */

  const messageId = await context.storage.saveMessage(args);

  const subscribers = uniq(
    context.subscriptions.filter((s) => doesMessageMatchSubscription(s, args))
  );

  const subscriberIds = subscribers.map((s) => s.subscriberId);

  await context.storage.createSubscriberMessages(messageId, subscriberIds);

  const connectedSockets = await context.server.fetchSockets();

  const activeSubscribers = subscribers.filter(
    (s) => s.socketId && connectedSockets.some((c) => c.id === s.socketId)
  );

  activeSubscribers.map((s) => {
    context.taskQueue.push({ messageId, subscriberId: s.subscriberId });
  });
}
