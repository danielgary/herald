import { SubscriberMessage } from '@prisma/client';
import { HeraldMessage, MessageStates } from 'common';

export type UpdateSubscriberMessageArgs = {
  state: MessageStates;
  errorText?: string;
  progress?: number;
  progressText?: string;
};

export interface HeraldStorageProvider {
  /**
   *
   * @param message
   * @returns messageId
   */
  saveMessage: (message: HeraldMessage) => Promise<string>;

  saveSubscription: (
    subscriberId: string,
    subscription: { sender?: string; type?: string }
  ) => Promise<void>;

  /**
   *
   * @param messageId
   * @param subscriberIds
   * @returns
   */
  createSubscriberMessages: (
    messageId: string,
    subscriberIds: Array<string>
  ) => Promise<void>;

  updateSubscriberMessage: (
    messageId: string,
    subscriberId: string,
    args: UpdateSubscriberMessageArgs
  ) => Promise<void>;

  dequeueMessageForSubscriber: (
    messageId: string,
    subscriberId: string
  ) => Promise<HeraldMessage | null>;

  dequeueNextSubscriberMessage: (
    subscriberId: string
  ) => Promise<HeraldMessage | null>;

  getAllQueuedMessagesForSubscriber: (
    subscriberId: string
  ) => Promise<Array<{ messageId: string; message: HeraldMessage }>>;

  getSubscriberMessage: (
    subscriberId: string,
    messageId: string
  ) => Promise<SubscriberMessage>;

  __dangerous__flushAllData: () => Promise<void>;
}
