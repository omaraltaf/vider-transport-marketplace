import { PrismaClient, Message, MessageThread } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface MessageData {
  content: string;
}

export interface MessageThreadWithMessages extends MessageThread {
  messages: Message[];
}

export class MessagingService {
  /**
   * Create a message thread for a booking
   * Automatically called when a booking is created
   */
  async createThread(
    bookingId: string,
    participants: string[]
  ): Promise<MessageThread> {
    // Validate participants
    if (!participants || participants.length === 0) {
      throw new Error('PARTICIPANTS_REQUIRED');
    }

    // Check if thread already exists for this booking
    const existingThread = await prisma.messageThread.findUnique({
      where: { bookingId },
    });

    if (existingThread) {
      throw new Error('THREAD_ALREADY_EXISTS');
    }

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // Create thread
    const thread = await prisma.messageThread.create({
      data: {
        bookingId,
        participants,
      },
    });

    logger.info('Message thread created', {
      threadId: thread.id,
      bookingId,
      participantCount: participants.length,
    });

    return thread;
  }

  /**
   * Send a message in a thread
   * Delivers to all participants and sends email notifications
   */
  async sendMessage(
    threadId: string,
    senderId: string,
    content: string
  ): Promise<Message> {
    // Validate content
    if (!content || content.trim() === '') {
      throw new Error('MESSAGE_CONTENT_REQUIRED');
    }

    // Get thread
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new Error('THREAD_NOT_FOUND');
    }

    // Verify sender is a participant
    if (!thread.participants.includes(senderId)) {
      throw new Error('SENDER_NOT_PARTICIPANT');
    }

    // Create message with sender marked as having read it
    const message = await prisma.message.create({
      data: {
        threadId,
        senderId,
        content: content.trim(),
        readBy: [senderId], // Sender has read their own message
      },
    });

    // Update thread's updatedAt timestamp
    await prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    logger.info('Message sent', {
      messageId: message.id,
      threadId,
      senderId,
    });

    // TODO: Send email notifications to other participants
    // This would integrate with the notification service

    return message;
  }

  /**
   * Get all messages in a thread
   */
  async getThreadMessages(threadId: string): Promise<Message[]> {
    // Verify thread exists
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new Error('THREAD_NOT_FOUND');
    }

    return prisma.message.findMany({
      where: { threadId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Mark a message as read by a user
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        thread: true,
      },
    });

    if (!message) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    // Verify user is a participant
    if (!message.thread.participants.includes(userId)) {
      throw new Error('USER_NOT_PARTICIPANT');
    }

    // Check if already read
    if (message.readBy.includes(userId)) {
      return; // Already marked as read
    }

    // Add user to readBy array
    await prisma.message.update({
      where: { id: messageId },
      data: {
        readBy: {
          push: userId,
        },
      },
    });

    logger.info('Message marked as read', { messageId, userId });
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    // Get all threads where user is a participant
    const threads = await prisma.messageThread.findMany({
      where: {
        participants: {
          has: userId,
        },
      },
      select: { id: true },
    });

    const threadIds = threads.map((t) => t.id);

    if (threadIds.length === 0) {
      return 0;
    }

    // Get all messages in these threads where user hasn't read them
    const messages = await prisma.message.findMany({
      where: {
        threadId: { in: threadIds },
        senderId: { not: userId }, // Don't count own messages
      },
      select: { id: true, readBy: true },
    });

    // Filter messages where user hasn't read them
    const unreadMessages = messages.filter((m) => !m.readBy.includes(userId));

    return unreadMessages.length;
  }

  /**
   * Get all message threads for a user
   */
  async getUserThreads(userId: string): Promise<MessageThreadWithMessages[]> {
    const threads = await prisma.messageThread.findMany({
      where: {
        participants: {
          has: userId,
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            renterCompany: {
              select: {
                id: true,
                name: true,
              },
            },
            providerCompany: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get last message for preview
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return threads;
  }

  /**
   * Get a specific thread by ID
   */
  async getThreadById(threadId: string): Promise<MessageThreadWithMessages | null> {
    return prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            renterCompany: {
              select: {
                id: true,
                name: true,
              },
            },
            providerCompany: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get thread by booking ID
   */
  async getThreadByBookingId(bookingId: string): Promise<MessageThread | null> {
    return prisma.messageThread.findUnique({
      where: { bookingId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }
}

export const messagingService = new MessagingService();
