/**
 * Messaging Page
 * Displays message threads with booking context and allows sending messages
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import type { MessageThread, Message } from '../types';
import Navbar from '../components/Navbar';
import { Card, Container, Stack, Input, Button, Spinner } from '../design-system/components';

export default function MessagingPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all threads
  const { data: threads, isLoading: threadsLoading } = useQuery<MessageThread[]>({
    queryKey: ['message-threads'],
    queryFn: async () => {
      return apiClient.get<MessageThread[]>('/messages/threads', token || '');
    },
    enabled: !!token,
    refetchInterval: 10000, // Poll every 10 seconds for new messages
  });

  // Fetch selected thread with messages
  const { data: selectedThread, isLoading: threadLoading } = useQuery<MessageThread>({
    queryKey: ['message-thread', selectedThreadId],
    queryFn: async () => {
      return apiClient.get<MessageThread>(`/messages/threads/${selectedThreadId}`, token || '');
    },
    enabled: !!token && !!selectedThreadId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages in active thread
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedThreadId) throw new Error('No thread selected');
      return apiClient.post<Message>(
        `/messages/threads/${selectedThreadId}/messages`,
        { content },
        token || ''
      );
    },
    onSuccess: () => {
      setMessageContent('');
      queryClient.invalidateQueries({ queryKey: ['message-thread', selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiClient.post(`/messages/${messageId}/read`, {}, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-thread', selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });

  // Auto-select first thread if none selected
  useEffect(() => {
    if (threads && threads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThread?.messages]);

  // Mark unread messages as read when viewing thread
  useEffect(() => {
    if (selectedThread?.messages && user) {
      selectedThread.messages.forEach((message) => {
        if (message.senderId !== user.id && !message.readBy.includes(user.id)) {
          markAsReadMutation.mutate(message.id);
        }
      });
    }
  }, [selectedThread?.messages, user?.id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageContent.trim()) {
      sendMessageMutation.mutate(messageContent);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('no-NO', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('no-NO', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getUnreadCount = (thread: MessageThread) => {
    if (!thread.messages || !user) return 0;
    return thread.messages.filter(
      (msg) => msg.senderId !== user.id && !msg.readBy.includes(user.id)
    ).length;
  };

  const getOtherCompanyName = (thread: MessageThread) => {
    if (!thread.booking || !user) return 'Unknown';
    if (thread.booking.renterCompany.id === user.companyId) {
      return thread.booking.providerCompany.name;
    }
    return thread.booking.renterCompany.name;
  };

  const getLastMessage = (thread: MessageThread) => {
    if (!thread.messages || thread.messages.length === 0) return 'No messages yet';
    const lastMessage = thread.messages[thread.messages.length - 1];
    return lastMessage.content.length > 50
      ? lastMessage.content.substring(0, 50) + '...'
      : lastMessage.content;
  };

  return (
    <div className="min-h-screen ds-bg-page">
      <Navbar />

      <Container>
        <Stack spacing={6}>
          <div>
            <h1 className="text-3xl font-bold ds-text-gray-900">Messages</h1>
            <p className="mt-1 text-sm ds-text-gray-500">
              Communicate with other companies about your bookings
            </p>
          </div>

          <Card padding="sm">
            <div style={{ height: '600px' }}>
              <div className="flex h-full">
            {/* Thread List */}
            <div className="w-1/3 border-r ds-border-gray-200 overflow-y-auto">
              {threadsLoading && (
                <div className="p-4 text-center">
                  <Spinner size="md" />
                </div>
              )}

              {!threadsLoading && threads && threads.length === 0 && (
                <div className="p-4 text-center ds-text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12 ds-text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="mt-2 text-sm">No messages yet</p>
                  <p className="mt-1 text-xs">Messages will appear here when you create a booking</p>
                </div>
              )}

              {!threadsLoading && threads && threads.length > 0 && (
                <ul className="divide-y divide-gray-200">
                  {threads.map((thread) => {
                    const unreadCount = getUnreadCount(thread);
                    return (
                      <li
                        key={thread.id}
                        className={`p-4 cursor-pointer ds-hover-bg-page ${
                          selectedThreadId === thread.id ? 'ds-bg-primary-50' : ''
                        }`}
                        onClick={() => setSelectedThreadId(thread.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium ds-text-gray-900 truncate">
                              {getOtherCompanyName(thread)}
                            </p>
                            <p className="text-xs ds-text-gray-500 mt-1">
                              Booking: {thread.booking?.bookingNumber}
                            </p>
                            <p className="text-sm ds-text-gray-600 mt-1 truncate">
                              {getLastMessage(thread)}
                            </p>
                          </div>
                          {unreadCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white ds-bg-primary-600 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Message View */}
            <div className="flex-1 flex flex-col">
              {!selectedThreadId && (
                <div className="flex-1 flex items-center justify-center ds-text-gray-500">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 ds-text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <p className="mt-2 text-sm">Select a conversation to view messages</p>
                  </div>
                </div>
              )}

              {selectedThreadId && threadLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <Spinner size="lg" />
                </div>
              )}

              {selectedThreadId && !threadLoading && selectedThread && (
                <>
                  {/* Thread Header */}
                  <div className="px-6 py-4 border-b ds-border-gray-200 bg-white">
                    <h2 className="text-lg font-medium ds-text-gray-900">
                      {getOtherCompanyName(selectedThread)}
                    </h2>
                    <p className="text-sm ds-text-gray-500">
                      Booking: {selectedThread.booking?.bookingNumber} •{' '}
                      <span className="capitalize">{selectedThread.booking?.status.toLowerCase()}</span>
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {selectedThread.messages && selectedThread.messages.length === 0 && (
                      <div className="text-center ds-text-gray-500 py-8">
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation by sending a message</p>
                      </div>
                    )}

                    {selectedThread.messages &&
                      selectedThread.messages.map((message) => {
                        const isOwnMessage = message.senderId === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                isOwnMessage
                                  ? 'ds-bg-primary-600 text-white'
                                  : 'ds-bg-gray-200 ds-text-gray-900'
                              }`}
                            >
                              {!isOwnMessage && message.sender && (
                                <p className="text-xs font-medium mb-1">
                                  {message.sender.firstName} {message.sender.lastName}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isOwnMessage ? 'text-indigo-200' : 'ds-text-gray-500'
                                }`}
                              >
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="px-6 py-4 border-t ds-border-gray-200 bg-white">
                    <form onSubmit={handleSendMessage} className="flex space-x-4">
                      <Input
                        type="text"
                        value={messageContent}
                        onChange={setMessageContent}
                        placeholder="Type your message..."
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!messageContent.trim() || sendMessageMutation.isPending}
                        loading={sendMessageMutation.isPending}
                        rightIcon={
                          !sendMessageMutation.isPending ? (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              />
                            </svg>
                          ) : undefined
                        }
                      >
                        Send
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
            </div>
          </Card>
        </Stack>
      </Container>
    </div>
  );
}
