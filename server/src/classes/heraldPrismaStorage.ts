import { HeraldMessage, MessageStates } from 'common';
import {
  HeraldStorageProvider,
  UpdateSubscriberMessageArgs,
} from '../types/heraldStorageProvider';
import { uniq } from 'lodash';
import { PrismaClient } from '@prisma/client';

export class HeraldPrismaStorageProvider implements HeraldStorageProvider {
  public prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.verify();
  }
  public async dequeueMessageForSubscriber(
    messageId: string,
    subscriberId: string
  ): Promise<HeraldMessage> {
    const { message } = await this.prisma.subscriberMessage.update({
      where: {
        subscriberId_messageId: { messageId, subscriberId },
      },
      data: {
        state: MessageStates.PROCESSING,
        updatedAt: new Date(),
      },
      select: {
        message: true,
      },
    });

    return {
      body: JSON.parse(message.body),
      sender: message.source,
      type: message.type,
    };
  }

  private async verify() {
    await this.prisma.message.count();
  }

  public async saveMessage(message: HeraldMessage): Promise<string> {
    const { id } = await this.prisma.message.create({
      data: {
        body: JSON.stringify(message.body),
        source: message.sender,
        type: message.type,
        created: new Date(),
      },
      select: { id: true },
    });

    return id;
  }
  public async createSubscriberMessages(
    messageId: string,
    subscriberIds: string[]
  ): Promise<void> {
    for (const s of uniq(subscriberIds)) {
      try {
        await this.prisma.subscriberMessage.create({
          data: {
            messageId,
            subscriberId: s,
            state: MessageStates.QUEUED,
            updatedAt: new Date(),
          },
        });
      } catch (err) {
        console.error(
          'Tried to create a subscriber message that already exists'
        );
      }
    }
  }

  public async saveSubscription(
    subscriberId: string,
    subscription: { sender?: string; type?: string }
  ): Promise<void> {
    const filter = `${subscription.sender || '*'}:${subscription.type || '*'}`;
    await this.prisma.subscription.upsert({
      where: { subscriberId_filter: { filter, subscriberId } },
      create: { filter, subscriberId },
      update: { filter, subscriberId },
    });
  }

  public async updateSubscriberMessage(
    messageId: string,
    subscriberId: string,
    args: UpdateSubscriberMessageArgs
  ): Promise<void> {
    const { errors } = await this.prisma.subscriberMessage.update({
      where: { subscriberId_messageId: { messageId, subscriberId } },
      data: {
        errorText: args.errorText,
        progress: args.progress,
        progressText: args.progressText,
        state: args.state,
        updatedAt: new Date(),
        errors:
          args.state === MessageStates.ERROR ? { increment: 1 } : undefined,
      },
      select: { errors: true },
    });
    if (errors <= 3 && args.state === MessageStates.ERROR) {
      await this.prisma.subscriberMessage.update({
        where: { subscriberId_messageId: { messageId, subscriberId } },
        data: { state: MessageStates.QUEUED },
      });
    }
  }

  public async getAllQueuedMessagesForSubscriber(
    subscriberId: string
  ): Promise<Array<{ messageId: string; message: HeraldMessage }>> {
    const results = await this.prisma.subscriberMessage.findMany({
      where: { subscriberId, state: MessageStates.QUEUED },
      select: { messageId: true, message: true },
      orderBy: { message: { created: 'asc' } },
    });

    return results.map((r) => ({
      messageId: r.messageId,
      message: {
        body: JSON.parse(r.message.body),
        sender: r.message.source,
        type: r.message.type,
      },
    }));
  }

  public async dequeueNextSubscriberMessage(
    subscriberId: string
  ): Promise<HeraldMessage> {
    const nextMessage = await this.prisma.subscriberMessage.findFirst({
      where: { subscriberId, state: MessageStates.QUEUED },
      include: {
        message: true,
      },
    });
    if (nextMessage) {
      await this.prisma.subscriberMessage.update({
        where: {
          subscriberId_messageId: {
            subscriberId,
            messageId: nextMessage.messageId,
          },
        },
        data: {
          state: MessageStates.PROCESSING,
          updatedAt: new Date(),
        },
      });

      return {
        body: JSON.parse(nextMessage.message.body),
        sender: nextMessage.message.source,
        type: nextMessage.message.type,
      };
    }
  }

  public async __dangerous__flushAllData(): Promise<void> {
    await this.prisma.subscriberMessage.deleteMany();
    await this.prisma.subscription.deleteMany();
    await this.prisma.message.deleteMany();
  }
}
