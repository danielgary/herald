import { MessageStates, RequeueCommandArgs } from 'common';
import { HeraldMessageContext } from '../types/heraldMessageContext';

export async function requeueMessageActivity(
  args: RequeueCommandArgs,
  context: HeraldMessageContext
) {
  const subscriberMessage = await context.storage.getSubscriberMessage(
    args.subscriberId,
    args.messageId
  );

  const errorCount = subscriberMessage.errors + 1;

  await context.storage.updateSubscriberMessage(
    args.messageId,
    args.subscriberId,
    { state: MessageStates.ERROR, errorText: args.errorText }
  );

  if (errorCount < 3) {
    context.taskQueue.push(args);
  }
}
