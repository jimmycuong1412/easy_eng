/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@cometchat/chat-sdk-javascript' {
  export namespace CometChat {
    class AppSettingsBuilder {
      subscribePresenceForAllUsers(): AppSettingsBuilder;
      setRegion(region: string): AppSettingsBuilder;
      autoEstablishSocketConnection(value: boolean): AppSettingsBuilder;
      build(): any;
    }

    class User {
      getUid(): string;
      getName(): string;
      getAvatar(): string;
    }

    class TextMessage extends BaseMessage {
      constructor(receiverId: string, text: string, receiverType: string);
      getText(): string;
    }

    class BaseMessage {
      getId(): number;
      getText(): string;
      getSender(): User;
      getReceiverType(): string;
      getCategory(): string;
      getType(): string;
      getSentAt(): number;
      getReadAt(): number;
      getDeliveredAt(): number;
      [key: string]: any;
    }

    class TypingIndicator {
      constructor(receiverId: string, receiverType: string);
      getSender(): User;
    }

    class MessageListener {
      constructor(callbacks: {
        onTextMessageReceived?: (message: TextMessage) => void;
        onTypingStarted?: (indicator: TypingIndicator) => void;
        onTypingEnded?: (indicator: TypingIndicator) => void;
        [key: string]: any;
      });
    }

    class Call {
      constructor(receiverId: string, callType: string, receiverType: string);
      getSessionId(): string;
      getType(): string;
      getSender(): User;
      getReceiver(): User;
      getStatus(): string;
      getCallInitiator(): User;
      getCallReceiver(): User;
      [key: string]: any;
    }

    class CallListener {
      constructor(callbacks: {
        onCallReceived?: (call: Call) => void;
        onCallRejected?: (call: Call) => void;
        onCallEnded?: (call: Call) => void;
        [key: string]: any;
      });
    }

    class MessagesRequestBuilder {
      setGUID(guid: string): MessagesRequestBuilder;
      setUID(uid: string): MessagesRequestBuilder;
      setLimit(limit: number): MessagesRequestBuilder;
      build(): MessagesRequest;
    }

    class MessagesRequest {
      fetchPrevious(): Promise<BaseMessage[]>;
    }

    function init(appId: string, appSettings: any): Promise<boolean>;
    function login(uid: string, authKey: string): Promise<User>;
    function logout(): Promise<void>;
    function getLoggedinUser(): Promise<User | null>;
    function sendMessage(message: TextMessage): Promise<TextMessage>;
    function sendTypingIndicator(indicator: TypingIndicator): Promise<void>;
    function endTypingIndicator(indicator: TypingIndicator): Promise<void>;
    function markAsRead(message: BaseMessage): Promise<void>;
    function addMessageListener(listenerId: string, listener: MessageListener): void;
    function removeMessageListener(listenerId: string): void;
    function addCallListener(listenerId: string, listener: CallListener): void;
    function removeCallListener(listenerId: string): void;
    function initiateCall(call: Call): Promise<Call>;
    function acceptCall(call: Call): Promise<Call>;
    function rejectCall(call: Call): Promise<void>;
    function endCall(call: Call): Promise<void>;
    function getCall(callId: string): Promise<Call>;
    function startAudio(call: Call): Promise<void>;
    function stopAudio(call: Call): Promise<void>;
    function startVideo(call: Call): Promise<void>;
    function stopVideo(call: Call): Promise<void>;
    function startScreenShare(call: Call): Promise<void>;
    function stopScreenShare(call: Call): Promise<void>;

    const RECEIVER_TYPE: {
      USER: string;
      GROUP: string;
    };

    const MESSAGE_TYPE: {
      TEXT: string;
      MEDIA: string;
      IMAGE: string;
      VIDEO: string;
      AUDIO: string;
      FILE: string;
      CUSTOM: string;
    };

    const CALL_TYPE: {
      VIDEO: string;
      AUDIO: string;
    };

    const CATEGORY_MESSAGE: string;
  }
}
