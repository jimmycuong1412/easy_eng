'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CometChat } from '@/lib/cometchat/client';
import { logger } from '@/lib/cometchat/logger';

interface Message {
  id: string | number;
  text: string;
  sender: {
    uid: string;
    name: string;
  };
  timestamp: Date;
  isOwn: boolean;
  status: 'sent' | 'failed' | 'pending';
}

const MESSAGE_LIMIT = 50;

interface UseCometChatMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: Error | null;
  typingIndicator: string | null;
  sendMessage: (text: string) => Promise<void>;
  sendTypingIndicator: () => Promise<void>;
  clearMessages: () => void;
}

export function useCometChatMessages(userId: string): UseCometChatMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [typingIndicator, setTypingIndicator] = useState<string | null>(null);
  const messageListenerRef = useRef<string | null>(null);

  // Load initial message history
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const currentUser = await CometChat.getLoggedinUser();
        if (!currentUser) {
          throw new Error('User not logged in');
        }

        // Get message history
        const messagesRequest = new CometChat.MessagesRequestBuilder()
          .setUID(userId)
          .setLimit(MESSAGE_LIMIT)
          .build();

        const fetchedMessages = await messagesRequest.fetchPrevious();

        const formattedMessages: Message[] = fetchedMessages.map((msg: any) => ({
          id: msg.getId(),
          text: msg.getText(),
          sender: {
            uid: msg.getSender().getUid(),
            name: msg.getSender().getName(),
          },
          timestamp: new Date(msg.getSentAt() * 1000),
          isOwn: msg.getSender().getUid() === currentUser.getUid(),
          status: 'sent',
        }));

        setMessages(formattedMessages.reverse());

        logger.info('Messages loaded', { userId, count: fetchedMessages.length });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load messages');
        setError(error);
        logger.logError('useCometChatMessages loadMessages', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Setup message listener
    const messageListenerId = 'message_listener_' + Math.random();
    messageListenerRef.current = messageListenerId;

    CometChat.addMessageListener(
      messageListenerId,
      new CometChat.MessageListener({
        onTextMessageReceived: (message: CometChat.TextMessage) => {
          if (message.getSender().getUid() === userId) {
            const newMessage: Message = {
              id: message.getId(),
              text: message.getText(),
              sender: {
                uid: message.getSender().getUid(),
                name: message.getSender().getName(),
              },
              timestamp: new Date(message.getSentAt() * 1000),
              isOwn: false,
              status: 'sent',
            };

            setMessages((prev) => [...prev, newMessage]);

            // Mark as read
            CometChat.markAsRead(message);

            logger.logMessageEvent({
              type: 'message_received',
              userId: message.getSender().getUid(),
              messageType: 'text',
              timestamp: new Date().toISOString(),
            });
          }
        },
        onTypingStarted: (typingIndicator: CometChat.TypingIndicator) => {
          if (typingIndicator.getSender().getUid() === userId) {
            setTypingIndicator(typingIndicator.getSender().getName());
          }
        },
        onTypingEnded: (typingIndicator: CometChat.TypingIndicator) => {
          if (typingIndicator.getSender().getUid() === userId) {
            setTypingIndicator(null);
          }
        },
      })
    );

    return () => {
      if (messageListenerRef.current) {
        CometChat.removeMessageListener(messageListenerRef.current);
      }
    };
  }, [userId]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return;

      try {
        setIsSending(true);
        setError(null);

        const currentUser = await CometChat.getLoggedinUser();
        if (!currentUser) {
          throw new Error('User not logged in');
        }

        // Create optimistic message
        const optimisticMessage: Message = {
          id: 'temp_' + Date.now(),
          text,
          sender: {
            uid: currentUser.getUid(),
            name: currentUser.getName(),
          },
          timestamp: new Date(),
          isOwn: true,
          status: 'pending',
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        // Send message
        const textMessage = new CometChat.TextMessage(
          userId,
          text,
          CometChat.RECEIVER_TYPE.USER
        );

        const sentMessage = await CometChat.sendMessage(textMessage);

        // Update optimistic message with sent message ID
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id
              ? {
                  ...msg,
                  id: sentMessage.getId(),
                  status: 'sent' as const,
                }
              : msg
          )
        );

        logger.logMessageEvent({
          type: 'message_sent',
          userId,
          messageType: 'text',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send message');
        setError(error);

        // Mark last optimistic message as failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.status === 'pending' ? { ...msg, status: 'failed' as const } : msg
          )
        );

        logger.logError('useCometChatMessages sendMessage', error);
      } finally {
        setIsSending(false);
      }
    },
    [userId]
  );

  const sendTypingIndicator = useCallback(async (): Promise<void> => {
    try {
      const typingIndicator = new CometChat.TypingIndicator(
        userId,
        CometChat.RECEIVER_TYPE.USER
      );

      await (CometChat as any).sendTypingIndicator(typingIndicator);
    } catch (err) {
      logger.logError('useCometChatMessages sendTypingIndicator', err as Error);
    }
  }, [userId]);

  const clearMessages = useCallback((): void => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages: messages as unknown as any[],
    isLoading,
    isSending,
    error,
    typingIndicator,
    sendMessage,
    sendTypingIndicator,
    clearMessages,
  };
}
