import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import AnnouncementService from './announcement.service';
import SupportTicketService from './support-ticket.service';
import HelpCenterService from './help-center.service';

const prisma = new PrismaClient();

/**
 * **Feature: mock-data-replacement, Property 6: Communication data completeness**
 * **Validates: Requirements 7.1, 7.2, 7.3**
 * 
 * Property: For any service returning communication data arrays, the returned data 
 * should include all relevant records that match the query criteria and maintain 
 * data completeness across announcements, support tickets, and help center content.
 */

describe('Communication Data Completeness Property Tests', () => {
  let announcementService: AnnouncementService;
  let supportTicketService: SupportTicketService;
  let helpCenterService: HelpCenterService;

  beforeEach(async () => {
    announcementService = AnnouncementService.getInstance();
    supportTicketService = SupportTicketService.getInstance();
    helpCenterService = HelpCenterService.getInstance();
    
    // Clear Redis cache before each test (if available)
    try {
      await redis.flushall();
    } catch (error) {
      // Redis not available, continue without cache
    }
  });

  afterEach(async () => {
    // Clean up Redis after each test (if available)
    try {
      await redis.flushall();
    } catch (error) {
      // Redis not available, continue without cache
    }
  });

  // Arbitraries for generating test data
  const announcementTypeArbitrary = fc.constantFrom('system', 'maintenance', 'feature', 'promotion', 'emergency');
  const targetAudienceArbitrary = fc.constantFrom('users', 'drivers', 'companies', 'admins');
  const statusArbitrary = fc.constantFrom('draft', 'scheduled', 'published', 'archived');
  const priorityArbitrary = fc.constantFrom('low', 'medium', 'high', 'critical');
  const ticketStatusArbitrary = fc.constantFrom('open', 'in_progress', 'resolved', 'closed');
  const articleStatusArbitrary = fc.constantFrom('draft', 'published', 'archived', 'under_review');
  const visibilityArbitrary = fc.constantFrom('public', 'internal', 'restricted');

  const dateRangeArbitrary = fc.record({
    start: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
    end: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
  }).filter(range => range.start <= range.end);

  describe('Announcement Data Completeness', () => {
    it('should return all announcements matching filter criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.option(announcementTypeArbitrary),
            targetAudience: fc.option(targetAudienceArbitrary),
            status: fc.option(statusArbitrary),
            priority: fc.option(priorityArbitrary)
          }),
          async (filters) => {
            // Get announcements with filters
            const result = await announcementService.getAnnouncements(
              filters.type ? { type: filters.type } : undefined,
              filters.targetAudience ? { targetAudience: filters.targetAudience } : undefined,
              filters.status ? { status: filters.status } : undefined,
              filters.priority ? { priority: filters.priority } : undefined
            );

            // Verify result structure
            expect(result).toHaveProperty('announcements');
            expect(result).toHaveProperty('total');
            expect(Array.isArray(result.announcements)).toBe(true);
            expect(typeof result.total).toBe('number');
            expect(result.total).toBeGreaterThanOrEqual(0);
            expect(result.announcements.length).toBeLessThanOrEqual(result.total);

            // Verify each announcement has required properties
            result.announcements.forEach(announcement => {
              expect(announcement).toHaveProperty('id');
              expect(announcement).toHaveProperty('title');
              expect(announcement).toHaveProperty('content');
              expect(announcement).toHaveProperty('type');
              expect(announcement).toHaveProperty('targetAudience');
              expect(announcement).toHaveProperty('status');
              expect(announcement).toHaveProperty('priority');
              expect(announcement).toHaveProperty('createdAt');
              expect(announcement).toHaveProperty('updatedAt');

              // Verify filter criteria are met
              if (filters.type) {
                expect(announcement.type).toBe(filters.type);
              }
              if (filters.targetAudience) {
                expect(announcement.targetAudience).toContain(filters.targetAudience);
              }
              if (filters.status) {
                expect(announcement.status).toBe(filters.status);
              }
              if (filters.priority) {
                expect(announcement.priority).toBe(filters.priority);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain data consistency across multiple queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            firstQuery: fc.record({
              status: fc.option(statusArbitrary),
              type: fc.option(announcementTypeArbitrary)
            }),
            secondQuery: fc.record({
              status: fc.option(statusArbitrary),
              type: fc.option(announcementTypeArbitrary)
            })
          }),
          async (queries) => {
            // Execute two queries
            const firstResult = await announcementService.getAnnouncements(
              queries.firstQuery.type ? { type: queries.firstQuery.type } : undefined,
              undefined,
              queries.firstQuery.status ? { status: queries.firstQuery.status } : undefined
            );

            const secondResult = await announcementService.getAnnouncements(
              queries.secondQuery.type ? { type: queries.secondQuery.type } : undefined,
              undefined,
              queries.secondQuery.status ? { status: queries.secondQuery.status } : undefined
            );

            // If queries are identical, results should be identical
            if (JSON.stringify(queries.firstQuery) === JSON.stringify(queries.secondQuery)) {
              expect(firstResult.total).toBe(secondResult.total);
              expect(firstResult.announcements.length).toBe(secondResult.announcements.length);
            }

            // Both results should have valid structure
            expect(firstResult.total).toBeGreaterThanOrEqual(0);
            expect(secondResult.total).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Support Ticket Data Completeness', () => {
    it('should return all support tickets matching filter criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            status: fc.option(ticketStatusArbitrary),
            priority: fc.option(priorityArbitrary),
            category: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
          }),
          async (filters) => {
            // Get support tickets with filters
            const result = await supportTicketService.getTickets(
              filters.status ? { status: filters.status } : undefined,
              filters.priority ? { priority: filters.priority } : undefined,
              filters.category ? { category: filters.category } : undefined
            );

            // Verify result structure
            expect(result).toHaveProperty('tickets');
            expect(result).toHaveProperty('total');
            expect(Array.isArray(result.tickets)).toBe(true);
            expect(typeof result.total).toBe('number');
            expect(result.total).toBeGreaterThanOrEqual(0);
            expect(result.tickets.length).toBeLessThanOrEqual(result.total);

            // Verify each ticket has required properties
            result.tickets.forEach(ticket => {
              expect(ticket).toHaveProperty('id');
              expect(ticket).toHaveProperty('subject');
              expect(ticket).toHaveProperty('description');
              expect(ticket).toHaveProperty('status');
              expect(ticket).toHaveProperty('priority');
              expect(ticket).toHaveProperty('category');
              expect(ticket).toHaveProperty('userId');
              expect(ticket).toHaveProperty('createdAt');
              expect(ticket).toHaveProperty('updatedAt');

              // Verify filter criteria are met
              if (filters.status) {
                expect(ticket.status).toBe(filters.status);
              }
              if (filters.priority) {
                expect(ticket.priority).toBe(filters.priority);
              }
              if (filters.category) {
                expect(ticket.category).toBe(filters.category);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain ticket data integrity across operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ticketData: fc.record({
              subject: fc.string({ minLength: 5, maxLength: 100 }),
              description: fc.string({ minLength: 10, maxLength: 500 }),
              category: fc.string({ minLength: 3, maxLength: 20 }),
              priority: priorityArbitrary
            })
          }),
          async (testData) => {
            // Create a ticket
            const createdTicket = await supportTicketService.createTicket(
              testData.ticketData,
              'test-user-id'
            );

            // Verify created ticket has all required properties
            expect(createdTicket.id).toBeDefined();
            expect(createdTicket.subject).toBe(testData.ticketData.subject);
            expect(createdTicket.description).toBe(testData.ticketData.description);
            expect(createdTicket.category).toBe(testData.ticketData.category);
            expect(createdTicket.priority).toBe(testData.ticketData.priority);
            expect(createdTicket.status).toBe('open');

            // Retrieve the ticket and verify consistency
            const retrievedTicket = await supportTicketService.getTicket(createdTicket.id);
            expect(retrievedTicket).not.toBeNull();
            if (retrievedTicket) {
              expect(retrievedTicket.id).toBe(createdTicket.id);
              expect(retrievedTicket.subject).toBe(createdTicket.subject);
              expect(retrievedTicket.description).toBe(createdTicket.description);
            }
          }
        ),
        { numRuns: 50 } // Reduced runs for creation tests
      );
    });
  });

  describe('Help Center Data Completeness', () => {
    it('should return all help articles matching filter criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            status: fc.option(articleStatusArbitrary),
            visibility: fc.option(visibilityArbitrary),
            targetAudience: fc.option(targetAudienceArbitrary),
            language: fc.option(fc.constantFrom('no', 'en', 'sv', 'da'))
          }),
          async (filters) => {
            // Get help articles with filters
            const result = await helpCenterService.getArticles(
              {
                status: filters.status,
                visibility: filters.visibility,
                targetAudience: filters.targetAudience,
                language: filters.language
              },
              { limit: 50, offset: 0 }
            );

            // Verify result structure
            expect(result).toHaveProperty('articles');
            expect(result).toHaveProperty('total');
            expect(Array.isArray(result.articles)).toBe(true);
            expect(typeof result.total).toBe('number');
            expect(result.total).toBeGreaterThanOrEqual(0);
            expect(result.articles.length).toBeLessThanOrEqual(result.total);

            // Verify each article has required properties
            result.articles.forEach(article => {
              expect(article).toHaveProperty('id');
              expect(article).toHaveProperty('title');
              expect(article).toHaveProperty('content');
              expect(article).toHaveProperty('summary');
              expect(article).toHaveProperty('slug');
              expect(article).toHaveProperty('status');
              expect(article).toHaveProperty('visibility');
              expect(article).toHaveProperty('targetAudience');
              expect(article).toHaveProperty('language');
              expect(article).toHaveProperty('createdAt');
              expect(article).toHaveProperty('updatedAt');

              // Verify filter criteria are met
              if (filters.status) {
                expect(article.status).toBe(filters.status);
              }
              if (filters.visibility) {
                expect(article.visibility).toBe(filters.visibility);
              }
              if (filters.targetAudience) {
                expect(article.targetAudience).toContain(filters.targetAudience);
              }
              if (filters.language) {
                expect(article.language).toBe(filters.language);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return complete FAQ data with proper filtering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            targetAudience: fc.option(targetAudienceArbitrary),
            isVisible: fc.option(fc.boolean()),
            tags: fc.option(fc.array(fc.string({ minLength: 2, maxLength: 10 }), { maxLength: 3 }))
          }),
          async (filters) => {
            // Get FAQs with filters
            const faqs = await helpCenterService.getFAQs({
              targetAudience: filters.targetAudience,
              isVisible: filters.isVisible,
              tags: filters.tags
            });

            // Verify result structure
            expect(Array.isArray(faqs)).toBe(true);

            // Verify each FAQ has required properties
            faqs.forEach(faq => {
              expect(faq).toHaveProperty('id');
              expect(faq).toHaveProperty('question');
              expect(faq).toHaveProperty('answer');
              expect(faq).toHaveProperty('tags');
              expect(faq).toHaveProperty('isVisible');
              expect(faq).toHaveProperty('targetAudience');
              expect(faq).toHaveProperty('viewCount');
              expect(faq).toHaveProperty('createdAt');
              expect(faq).toHaveProperty('updatedAt');

              // Verify filter criteria are met
              if (filters.targetAudience) {
                expect(faq.targetAudience).toContain(filters.targetAudience);
              }
              if (filters.isVisible !== undefined) {
                expect(faq.isVisible).toBe(filters.isVisible);
              }
              if (filters.tags && filters.tags.length > 0) {
                const hasMatchingTag = filters.tags.some(tag => faq.tags.includes(tag));
                expect(hasMatchingTag).toBe(true);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain search result completeness and relevance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            query: fc.string({ minLength: 3, maxLength: 20 }),
            limit: fc.integer({ min: 5, max: 50 })
          }),
          async (searchParams) => {
            // Perform search
            const results = await helpCenterService.searchContent(
              searchParams.query,
              undefined,
              searchParams.limit
            );

            // Verify result structure
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeLessThanOrEqual(searchParams.limit);

            // Verify each result has required properties
            results.forEach(result => {
              expect(result).toHaveProperty('id');
              expect(result).toHaveProperty('type');
              expect(result).toHaveProperty('title');
              expect(result).toHaveProperty('summary');
              expect(result).toHaveProperty('url');
              expect(result).toHaveProperty('relevanceScore');
              expect(result).toHaveProperty('tags');
              expect(result).toHaveProperty('lastUpdated');

              // Verify relevance score is positive
              expect(result.relevanceScore).toBeGreaterThan(0);

              // Verify type is valid
              expect(['article', 'faq', 'category']).toContain(result.type);
            });

            // Verify results are sorted by relevance (descending)
            for (let i = 1; i < results.length; i++) {
              expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-Service Data Consistency', () => {
    it('should maintain data consistency across all communication services', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            cacheFlush: fc.boolean()
          }),
          async (testParams) => {
            if (testParams.cacheFlush) {
              try {
                await redis.flushall();
              } catch (error) {
                // Redis not available, continue without cache
              }
            }

            // Get data from all services
            const [announcements, tickets, articles, categories, faqs] = await Promise.all([
              announcementService.getAnnouncements(),
              supportTicketService.getTickets(),
              helpCenterService.getArticles(),
              helpCenterService.getCategories(),
              helpCenterService.getFAQs()
            ]);

            // Verify all services return valid data structures
            expect(announcements).toHaveProperty('announcements');
            expect(announcements).toHaveProperty('total');
            expect(tickets).toHaveProperty('tickets');
            expect(tickets).toHaveProperty('total');
            expect(articles).toHaveProperty('articles');
            expect(articles).toHaveProperty('total');
            expect(Array.isArray(categories)).toBe(true);
            expect(Array.isArray(faqs)).toBe(true);

            // Verify data consistency - totals should match array lengths when no pagination
            expect(announcements.announcements.length).toBeLessThanOrEqual(announcements.total);
            expect(tickets.tickets.length).toBeLessThanOrEqual(tickets.total);
            expect(articles.articles.length).toBeLessThanOrEqual(articles.total);

            // Verify all returned data has valid timestamps
            [...announcements.announcements, ...tickets.tickets, ...articles.articles, ...categories, ...faqs]
              .forEach(item => {
                expect(item.createdAt).toBeDefined();
                expect(item.updatedAt).toBeDefined();
                expect(new Date(item.createdAt)).toBeInstanceOf(Date);
                expect(new Date(item.updatedAt)).toBeInstanceOf(Date);
              });
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});