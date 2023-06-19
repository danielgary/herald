import { HelloCommandArgs } from 'common';
import { HeraldMessageContext } from '../types/heraldMessageContext';

export async function helloActivity(
  args: HelloCommandArgs,
  context: HeraldMessageContext
) {
  /**
   * 1. Update socket ids for subscription
   * 2. Queue up pending messages from storage for the subscriber
   */

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
}
