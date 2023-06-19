import { HeraldMessage } from '../types/message';

export function doesMessageMatchSubscription(
  filter: { sender?: string; type?: string },
  message: HeraldMessage
) {
  if (!filter.sender && !filter.type) {
    return true;
  } else if (!filter.sender) {
    return filter.type.toLowerCase() === message.type.toLowerCase();
  } else if (!filter.type) {
    return filter.sender.toLowerCase() === message.sender.toLowerCase();
  }

  return (
    filter.sender?.toLowerCase() === message.sender?.toLowerCase() &&
    filter.type?.toLowerCase() === message.type?.toLowerCase()
  );
}
