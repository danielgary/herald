export type HeraldMessage<TBody = object> = {
  type: string;
  sender: string;
  body: TBody;
};
