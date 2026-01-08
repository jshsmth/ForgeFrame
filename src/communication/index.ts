export { Messenger, type MessageHandler } from './messenger';
export {
  FunctionBridge,
  serializeFunctions,
  deserializeFunctions,
} from './bridge';
export {
  PROTOCOL_PREFIX,
  serializeMessage,
  deserializeMessage,
  createRequestMessage,
  createResponseMessage,
  createAckMessage,
} from './protocol';
