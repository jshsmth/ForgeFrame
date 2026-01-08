import type { Message } from '../types';
import { MESSAGE_TYPE } from '../constants';

/**
 * Protocol prefix to identify ForgeFrame messages
 */
export const PROTOCOL_PREFIX = 'forgeframe:';

/**
 * Serialize a message for postMessage
 */
export function serializeMessage(message: Message): string {
  return PROTOCOL_PREFIX + JSON.stringify(message);
}

/**
 * Deserialize a message from postMessage
 * Returns null if not a ForgeFrame message
 */
export function deserializeMessage(data: unknown): Message | null {
  if (typeof data !== 'string') return null;
  if (!data.startsWith(PROTOCOL_PREFIX)) return null;

  try {
    const json = data.slice(PROTOCOL_PREFIX.length);
    const message = JSON.parse(json) as Message;

    // Validate message structure
    if (!message.id || !message.type || !message.name || !message.source) {
      return null;
    }

    return message;
  } catch {
    return null;
  }
}

/**
 * Create a request message
 */
export function createRequestMessage(
  id: string,
  name: string,
  data: unknown,
  source: { uid: string; domain: string }
): Message {
  return {
    id,
    type: MESSAGE_TYPE.REQUEST,
    name,
    data,
    source,
  };
}

/**
 * Create a response message
 */
export function createResponseMessage(
  requestId: string,
  data: unknown,
  source: { uid: string; domain: string },
  error?: Error
): Message {
  return {
    id: requestId,
    type: MESSAGE_TYPE.RESPONSE,
    name: 'response',
    data,
    source,
    error: error
      ? {
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };
}

/**
 * Create an acknowledgement message
 */
export function createAckMessage(
  requestId: string,
  source: { uid: string; domain: string }
): Message {
  return {
    id: requestId,
    type: MESSAGE_TYPE.ACK,
    name: 'ack',
    source,
  };
}
