'use client';

/**
 * InCallChat Component
 *
 * In-class chat interface for participants
 * Task: T121 [P] Create InCallChat component
 */

import React, { useState, useEffect, useRef } from 'react';
import type { InCallChatProps } from '@/types/cometchat.types';
import { Send, MessageCircle, Minimize2, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  text: string;
  sender: {
    uid: string;
    name: string;
    avatar?: string;
  };
  sentAt: number;
}

export default function InCallChat({
  groupId,
  currentUserId,
  isMinimized = false,
  onToggleMinimize,
}: InCallChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    // Load previous messages
    loadMessages();

    // Set up real-time message listener
    // TODO: Implement CometChat message listener
  }, [groupId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  // ============================================================================
  // Message Management
  // ============================================================================

  const loadMessages = async () => {
    try {
      // TODO: Fetch messages from CometChat
      // const msgs = await CometChatService.fetchMessages(groupId);
      // setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);

      // TODO: Send message via CometChat
      // await CometChatService.sendMessage(groupId, newMessage);

      // Optimistically add message to list
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        text: newMessage,
        sender: {
          uid: currentUserId,
          name: 'You',
        },
        sentAt: Date.now(),
      };

      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isMinimized) {
    return (
      <button
        onClick={onToggleMinimize}
        className="flex w-full items-center justify-between bg-gray-900 p-4 hover:bg-gray-800"
      >
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-white">Chat</span>
          {messages.length > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
              {messages.length}
            </span>
          )}
        </div>
        <Maximize2 className="h-4 w-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 p-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-white">Chat</h3>
          {messages.length > 0 && (
            <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
              {messages.length}
            </span>
          )}
        </div>
        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="text-gray-400 hover:text-white"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-gray-500">
            <div>
              <MessageCircle className="mx-auto h-12 w-12 text-gray-600" />
              <p className="mt-2 text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender.uid === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="mb-1 text-xs font-medium text-gray-400">
                      {message.sender.name}
                    </p>
                  )}
                  <p className="text-sm">{message.text}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                    }`}
                  >
                    {formatDistanceToNow(message.sentAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-gray-800 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
