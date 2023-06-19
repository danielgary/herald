export type Command<TArgs> = {
  command: 'SUBSCRIBE' | 'PUBLISH' | 'ACKNOWLEDGE' | 'REQUEUE' | 'PROGRESS';
  args: TArgs;
};

export type SubscribeCommand = Command<SubscribeCommandArgs> & {
  command: 'SUBSCRIBE';
};

export type PublishCommand<TBody> = Command<PublishCommandArgs<TBody>> & {
  command: 'PUBLISH';
};

export type AcknowledgeCommand = Command<AcknowledgeCommandArgs> & {
  command: 'ACKNOWLEDGE';
};

export type RequeueCommand = Command<RequeueCommandArgs> & {
  command: 'REQUEUE';
};

export type ProgressCommand = Command<ProgressCommandArgs> & {
  command: 'PROGRESS';
};

export type SubscribeCommandArgs = {
  subscription: { type?: string; sender?: string };
  subscriberId: string;
};

export type AcknowledgeCommandArgs = {
  messageId: string;
  subscriberId: string;
};

export type RequeueCommandArgs = AcknowledgeCommandArgs;

export type ProgressCommandArgs = {
  messageId: string;
  subscriberId: string;
  progress: number;
  text?: string;
};

export type PublishCommandArgs<TBody> = {
  type: string;
  sender: string;
  body: TBody;
};

export type HelloCommandArgs = {
  subscriberId: string;
};
