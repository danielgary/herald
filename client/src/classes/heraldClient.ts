import {
  HeraldMessage,
  KnownCommands,
  SubscribeCommand,
  doesMessageMatchSubscription,
} from 'common';
import { Socket, io } from 'socket.io-client';

export type HeraldClientConstructorArgs = {
  serverAddress: string;
  subscriberId: string;
  callbackTimeout?: number;
};

export type SubscribeArgs = {
  sender?: string;
  type?: string;
};

export class HeraldClient {
  public socket: Socket;
  public subscriberId: string;
  private callbackTimeout: number;
  private subscriptions: Array<{
    sender?: string;
    type?: string;
    callback: (
      body,
      meta: {
        messageId: string;
      }
    ) => Promise<void>;
  }>;

  constructor(args: HeraldClientConstructorArgs) {
    this.subscriberId = args.subscriberId;

    this.socket = io(args.serverAddress);

    this.callbackTimeout = args.callbackTimeout || 5000;

    this.subscriptions = [];

    this.socket.emit(KnownCommands.Hello, { subscriberId: args.subscriberId });

    this.socket.onAny(
      async (
        eventName,
        args: { sender: string; body: any; messageId: string }
      ) => {
        if (eventName !== 'SUBSCRIBE_ACK') {
          const callbacks = this.subscriptions.filter((s) => {
            return doesMessageMatchSubscription(s, {
              ...args,
              type: eventName,
            });
          });

          // We need to try catch and report failures
          try {
            for (const cb of callbacks) {
              await cb.callback(args.body, { messageId: args.messageId });
            }
            await this.socket.emit(KnownCommands.Acknowledge, {
              messageId: args.messageId,
              subscriberId: this.subscriberId,
            });
          } catch (err) {
            await this.socket.emit(KnownCommands.Requeue, {
              messageId: args.messageId,
              subscriberId: this.subscriberId,
            });
          }
        }
      }
    );
  }

  public async publish(eventName: string, body: any) {
    const msg: HeraldMessage = {
      sender: this.subscriberId,
      body,
      type: eventName,
    };
    await this.socket.emit('PUBLISH', msg);
  }

  public subscribe<TBody>(
    args: SubscribeArgs,
    callback: (
      body: TBody,
      meta: {
        messageId: string;
      }
    ) => Promise<void>
  ) {
    const subscribeCommand: SubscribeCommand = {
      command: 'SUBSCRIBE',
      args: {
        subscriberId: this.subscriberId,
        subscription: { type: args.type, sender: args.sender },
      },
    };

    this.subscriptions.push({ callback, sender: args.sender, type: args.type });
    this.socket.emit(subscribeCommand.command, subscribeCommand.args);

    return new Promise((resolve) => {
      this.socket.once('SUBSCRIBE_ACK', resolve);
    });
  }
}
