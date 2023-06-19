import { HeraldStorageProvider } from '../types/heraldStorageProvider';
import { Server } from 'socket.io';
import { MessageStates } from 'common';
import { HeraldSubscription } from '../types/heraldSubscription';

export async function processMessageForSubscriber({
  messageId,
  subscriberId,
}: {
  messageId: string;
  subscriberId: string;
}) {
  const { storage, server, subscriptions } = this as {
    storage: HeraldStorageProvider;
    subscriptions: Array<HeraldSubscription>;
    server: Server;
  };
  try {
    // console.log('in process message');

    const subscription = subscriptions.find(
      (x) => x.subscriberId === subscriberId
    );
    // const connectedSockets = await server.fetchSockets();
    // console.log(`looking for ${subscriberId}:${subscription.socketId}`);
    // if (!connectedSockets.find((x) => x.id === subscription.socketId)) {
    //   throw new Error('Recipient is offline');
    // }

    const message = await storage.dequeueMessageForSubscriber(
      messageId,
      subscriberId
    );
    if (!message) {
      throw new Error(
        `Message ${messageId} not found for subscriber ${subscriberId}`
      );
    }

    await server
      .to(subscription.socketId)
      .emit(message.type, {
        body: message.body,
        sender: message.sender,
        messageId,
      });
  } catch (err) {
    console.error(err);
    await storage.updateSubscriberMessage(messageId, subscriberId, {
      errorText: err.message,
      state: MessageStates.ERROR,
    });
  }
}
