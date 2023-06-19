import { AcknowledgeCommandArgs, MessageStates } from 'common';
import { HeraldMessageContext } from '../types/heraldMessageContext';

export async function acknowledgeMessageActivity(
  args: AcknowledgeCommandArgs,
  context: HeraldMessageContext
) {
  await context.storage.updateSubscriberMessage(
    args.messageId,
    args.subscriberId,
    { state: MessageStates.PROCESSED }
  );
}
