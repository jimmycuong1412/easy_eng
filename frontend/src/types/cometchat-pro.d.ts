/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@cometchat-pro/chat' {
  export class CometChatUI {
    static init(appId: string, settings: any): Promise<void>;
  }

  export namespace CometChat {
    class AppSettingsBuilder {
      subscribePresenceForAllUsers(): AppSettingsBuilder;
      setRegion(region: string): AppSettingsBuilder;
      autoEstablishSocketConnection(value: boolean): AppSettingsBuilder;
      build(): any;
    }

    class User {
      constructor(uid?: string);
      getUid(): string;
      getName(): string;
      getAvatar(): string;
      setName(name: string): void;
      setAvatar(avatar: string): void;
      [key: string]: any;
    }

    class Group {
      constructor(guid: string, name: string, type: string, password?: string);
      getGuid(): string;
      getName(): string;
      [key: string]: any;
    }

    class TextMessage {
      constructor(receiverId: string, text: string, receiverType: string);
      getId(): number;
      getText(): string;
      getSender(): User;
      getSentAt(): number;
      [key: string]: any;
    }

    class BaseMessage {
      getId(): number;
      getText(): string;
      getSender(): User;
      getSentAt(): number;
      [key: string]: any;
    }

    class Call {
      constructor(receiverId: string, callType: string, receiverType: string);
      getSessionId(): string;
      getType(): string;
      getSender(): User;
      [key: string]: any;
    }

    class GroupMembersRequestBuilder {
      constructor(guid: string);
      setLimit(limit: number): GroupMembersRequestBuilder;
      build(): GroupMembersRequest;
    }

    class GroupMembersRequest {
      fetchNext(): Promise<any[]>;
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

    function init(appId: string, settings: any): Promise<void>;
    function login(uid: string, authKey?: string): Promise<User>;
    function logout(): Promise<void>;
    function getLoggedinUser(): Promise<User | null>;
    function createUser(user: User, authKey?: string): Promise<User>;
    function updateUser(user: User, authKey?: string): Promise<User>;
    function sendMessage(message: any): Promise<any>;
    function createGroup(group: Group): Promise<Group>;
    function joinGroup(guid: string, type: string, password?: string): Promise<Group>;
    function leaveGroup(guid: string): Promise<void>;
    function deleteGroup(guid: string): Promise<void>;
    function initiateCall(call: Call): Promise<Call>;
    function acceptCall(sessionId: string): Promise<Call>;
    function rejectCall(sessionId: string, status?: string): Promise<Call>;
    function endCall(sessionId: string): Promise<void>;
    function addMessageListener(listenerId: string, listener: any): void;
    function removeMessageListener(listenerId: string): void;
    function addCallListener(listenerId: string, listener: any): void;
    function removeCallListener(listenerId: string): void;

    class MessageListener {
      constructor(callbacks: {
        onTextMessageReceived?: (message: TextMessage) => void;
        onMediaMessageReceived?: (message: any) => void;
        [key: string]: any;
      });
    }

    class CallListener {
      constructor(callbacks: {
        onIncomingCallReceived?: (call: Call) => void;
        onOutgoingCallAccepted?: (call: Call) => void;
        onOutgoingCallRejected?: (call: Call) => void;
        onIncomingCallCancelled?: (call: Call) => void;
        [key: string]: any;
      });
    }

    const MESSAGE_TYPE: Record<string, string>;
    const RECEIVER_TYPE: { USER: string; GROUP: string; [key: string]: string };
    const GROUP_TYPE: { PUBLIC: string; PASSWORD: string; PRIVATE: string; [key: string]: string };
    const CALL_TYPE: { VIDEO: string; AUDIO: string; [key: string]: string };
    const CALL_STATUS: { REJECTED: string; CANCELLED: string; [key: string]: string };
  }
}
