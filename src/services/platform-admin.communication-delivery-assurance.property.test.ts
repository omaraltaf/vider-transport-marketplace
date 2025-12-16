import fc from 'fast-check';
import { AnnouncementService, Announcement } from './announcement.service';
import { SupportTicketService, SupportTicket } from './support-ticket.service';
import { HelpCenterService, HelpArticle } from './help-center.service';

/**
 * Property-Based Tests for Platform Admin Dashboard
 * Feature: platform-admin-dashboard, Property 8: Communication Delivery Assurance
 * 
 * Tests the reliability and consistency of communication delivery operations,
 * including announcements, support tickets, and help center content.
 */

describe('Platform Admin Communication Delivery Assurance Properties', () => {
  let announcementService: AnnouncementService;
  let supportTicketService: SupportTicketService;
  let helpCenterService: HelpCenterService;

  beforeEach(() => {
    // Use singleton instances with fresh state for each test
    announcementService = AnnouncementService.getInstance();
    supportTicketService = SupportTicketService.getInstance();
    helpCenterService = HelpCenterService.getInstance();
  });

  /**
   * Property 8.1: Announcement Delivery Consistency
   * For any announcement creation and publishing, the announcement should be
   * delivered to the intended recipients and properly tracked.
   */
  test('announcement delivery maintains consistency and proper tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 5, maxLength: 100 }),
          content: fc.string({ minLength: 20, maxLength: 500 }),
          type: fc.constantFrom('info', 'warning', 'success', 'error', 'maintenance'),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          targetAudience: fc.constantFrom('all', 'users', 'drivers', 'companies', 'admins'),
          channels: fc.array(
            fc.constantFrom('in_app', 'email', 'sms', 'push'),
            { minLength: 1, maxLength: 4 }
          ).map(arr => Array.from(new Set(arr))), // Remove duplicates
          isEmergency: fc.boolean(),
          requiresAcknowledgment: fc.boolean()
        }),
        fc.string({ minLength: 5, maxLength: 20 }), // createdBy
        async (announcementData, createdBy) => {
          // Create announcement
          const announcement = await announcementService.createAnnouncement(
            {
              ...announcementData,
              metadata: {
                tags: ['test']
              }
            },
            createdBy
          );

          // Verify announcement creation
          expect(announcement).toBeDefined();
          expect(announcement.id).toBeDefined();
          expect(announcement.title).toBe(announcementData.title);
          expect(announcement.content).toBe(announcementData.content);
          expect(announcement.type).toBe(announcementData.type);
          expect(announcement.priority).toBe(announcementData.priority);
          expect(announcement.targetAudience).toBe(announcementData.targetAudience);
          expect(announcement.channels).toEqual(announcementData.channels);
          expect(announcement.isEmergency).toBe(announcementData.isEmergency);
          expect(announcement.createdBy).toBe(createdBy);

          // Emergency announcements should be published immediately
          if (announcementData.isEmergency) {
            expect(announcement.status).toBe('published');
            expect(announcement.publishedAt).toBeDefined();
          } else {
            expect(announcement.status).toBe('draft');
          }

          // Publish non-emergency announcements
          if (!announcementData.isEmergency) {
            await announcementService.publishAnnouncement(announcement.id, createdBy);
            
            const publishedAnnouncement = await announcementService.getAnnouncement(announcement.id);
            expect(publishedAnnouncement?.status).toBe('published');
            expect(publishedAnnouncement?.publishedAt).toBeDefined();
          }

          // Wait for delivery processing
          await new Promise(resolve => setTimeout(resolve, 100));

          // Check delivery status
          const deliveryStatus = await announcementService.getDeliveryStatus(announcement.id);
          
          expect(deliveryStatus).toBeDefined();
          expect(deliveryStatus.total).toBeGreaterThan(0);
          expect(deliveryStatus.byChannel).toBeDefined();
          
          // Verify all channels are represented
          announcementData.channels.forEach(channel => {
            expect(deliveryStatus.byChannel).toHaveProperty(channel);
            expect(deliveryStatus.byChannel[channel]).toBeGreaterThanOrEqual(0);
          });

          // Verify delivery metrics consistency
          expect(deliveryStatus.sent).toBeLessThanOrEqual(deliveryStatus.total);
          expect(deliveryStatus.delivered).toBeLessThanOrEqual(deliveryStatus.sent);
          expect(deliveryStatus.read).toBeLessThanOrEqual(deliveryStatus.delivered);
          expect(deliveryStatus.acknowledged).toBeLessThanOrEqual(deliveryStatus.read);
          expect(deliveryStatus.failed).toBeLessThanOrEqual(deliveryStatus.total);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: Support Ticket Lifecycle Integrity
   * For any support ticket creation and management, the ticket should maintain
   * proper state transitions and response tracking.
   */
  test('support ticket lifecycle maintains integrity and proper state transitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          subject: fc.string({ minLength: 10, maxLength: 100 }),
          description: fc.string({ minLength: 20, maxLength: 500 }),
          category: fc.constantFrom('technical', 'billing', 'account', 'feature_request', 'bug_report', 'general'),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent', 'critical'),
          source: fc.constantFrom('web', 'email', 'phone', 'chat', 'api', 'internal'),
          userEmail: fc.emailAddress(),
          userName: fc.string({ minLength: 3, maxLength: 50 }),
          tags: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 5 })
        }),
        fc.string({ minLength: 5, maxLength: 20 }), // agentId
        async (ticketData, agentId) => {
          // Create support ticket
          const ticket = await supportTicketService.createTicket({
            ...ticketData,
            customFields: {}
          });

          // Verify ticket creation
          expect(ticket).toBeDefined();
          expect(ticket.id).toBeDefined();
          expect(ticket.ticketNumber).toMatch(/^TKT-\d{6}$/);
          expect(ticket.subject).toBe(ticketData.subject);
          expect(ticket.description).toBe(ticketData.description);
          expect(ticket.category).toBe(ticketData.category);
          expect(ticket.priority).toBe(ticketData.priority);
          expect(ticket.status).toBe('open');
          expect(ticket.userEmail).toBe(ticketData.userEmail);
          expect(ticket.userName).toBe(ticketData.userName);

          // Assign ticket to agent
          const assignedTicket = await supportTicketService.assignTicket(
            ticket.id,
            agentId,
            'system'
          );

          expect(assignedTicket.assignedTo).toBe(agentId);
          expect(assignedTicket.assignedAt).toBeDefined();
          expect(assignedTicket.status).toBe('in_progress');

          // Add agent response
          const agentResponse = await supportTicketService.addResponse(
            ticket.id,
            {
              content: 'Thank you for contacting support. We are looking into your issue.',
              type: 'agent',
              authorId: agentId,
              authorName: `Agent ${agentId}`,
              authorEmail: `${agentId}@company.com`,
              isPublic: true,
              attachments: [],
              metadata: {}
            },
            agentId
          );

          expect(agentResponse).toBeDefined();
          expect(agentResponse.content).toContain('Thank you for contacting support');
          expect(agentResponse.type).toBe('agent');
          expect(agentResponse.authorId).toBe(agentId);

          // Verify first response time is set
          const updatedTicket = await supportTicketService.getTicket(ticket.id);
          expect(updatedTicket?.firstResponseAt).toBeDefined();

          // Add customer response
          const customerResponse = await supportTicketService.addResponse(
            ticket.id,
            {
              content: 'Thank you for the quick response. Here are more details...',
              type: 'customer',
              authorId: ticket.userEmail,
              authorName: ticket.userName,
              authorEmail: ticket.userEmail,
              isPublic: true,
              attachments: [],
              metadata: {}
            },
            ticket.userEmail
          );

          expect(customerResponse).toBeDefined();
          expect(customerResponse.type).toBe('customer');

          // Resolve ticket
          const resolvedTicket = await supportTicketService.updateTicket(
            ticket.id,
            { status: 'resolved' },
            agentId
          );

          expect(resolvedTicket.status).toBe('resolved');
          expect(resolvedTicket.resolvedAt).toBeDefined();

          // Verify ticket responses
          const responses = await supportTicketService.getTicketResponses(ticket.id);
          expect(responses).toHaveLength(2);
          expect(responses[0].type).toBe('agent');
          expect(responses[1].type).toBe('customer');

          // Verify response ordering (chronological)
          expect(responses[0].createdAt.getTime()).toBeLessThanOrEqual(responses[1].createdAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: Help Center Content Consistency
   * For any help center content creation and management, the content should
   * maintain proper versioning and search functionality.
   */
  test('help center content maintains consistency and proper versioning', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 10, maxLength: 100 }),
          content: fc.string({ minLength: 50, maxLength: 1000 }),
          summary: fc.string({ minLength: 20, maxLength: 200 }),
          categoryId: fc.string({ minLength: 5, maxLength: 20 }),
          tags: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          status: fc.constantFrom('draft', 'published', 'under_review'),
          visibility: fc.constantFrom('public', 'internal', 'restricted'),
          targetAudience: fc.array(
            fc.constantFrom('users', 'drivers', 'companies', 'admins'),
            { minLength: 1, maxLength: 4 }
          ).map(arr => Array.from(new Set(arr))),
          language: fc.constantFrom('en', 'es', 'fr', 'de')
        }),
        fc.string({ minLength: 5, maxLength: 20 }), // createdBy
        async (articleData, createdBy) => {
          // Create help article
          const article = await helpCenterService.createArticle(
            {
              ...articleData,
              metadata: {
                difficulty: 'beginner',
                estimatedReadTime: 5
              }
            },
            createdBy
          );

          // Verify article creation
          expect(article).toBeDefined();
          expect(article.id).toBeDefined();
          expect(article.slug).toBeDefined();
          expect(article.title).toBe(articleData.title);
          expect(article.content).toBe(articleData.content);
          expect(article.summary).toBe(articleData.summary);
          expect(article.status).toBe(articleData.status);
          expect(article.visibility).toBe(articleData.visibility);
          expect(article.targetAudience).toEqual(articleData.targetAudience);
          expect(article.language).toBe(articleData.language);
          expect(article.version).toBe(1);
          expect(article.viewCount).toBe(0);
          expect(article.createdBy).toBe(createdBy);

          // Update article content
          const updatedContent = articleData.content + '\n\nUpdated section with more information.';
          const updatedArticle = await helpCenterService.updateArticle(
            article.id,
            {
              content: updatedContent,
              summary: articleData.summary + ' (Updated)'
            },
            'Content updated with additional information',
            createdBy
          );

          // Verify version increment
          expect(updatedArticle.version).toBe(2);
          expect(updatedArticle.content).toBe(updatedContent);
          expect(updatedArticle.summary).toBe(articleData.summary + ' (Updated)');

          // Verify article versions
          const versions = await helpCenterService.getArticleVersions(article.id);
          expect(versions).toHaveLength(2);
          expect(versions[0].version).toBe(1);
          expect(versions[1].version).toBe(2);
          expect(versions[0].content).toBe(articleData.content);
          expect(versions[1].content).toBe(updatedContent);

          // Test article retrieval (should increment view count)
          const retrievedArticle = await helpCenterService.getArticle(article.id);
          expect(retrievedArticle?.viewCount).toBe(1);
          expect(retrievedArticle?.lastViewedAt).toBeDefined();

          // Test article voting
          await helpCenterService.recordArticleVote(article.id, true, 'user1');
          await helpCenterService.recordArticleVote(article.id, true, 'user2');
          await helpCenterService.recordArticleVote(article.id, false, 'user3');

          const votedArticle = await helpCenterService.getArticle(article.id);
          expect(votedArticle?.helpfulVotes).toBe(2);
          expect(votedArticle?.unhelpfulVotes).toBe(1);
          expect(votedArticle?.viewCount).toBe(2); // Incremented by getArticle call

          // Test search functionality
          const searchResults = await helpCenterService.searchContent(
            articleData.title.split(' ')[0], // Search for first word of title
            { type: ['article'] }
          );

          expect(searchResults.length).toBeGreaterThan(0);
          const foundArticle = searchResults.find(result => result.id === article.id);
          expect(foundArticle).toBeDefined();
          expect(foundArticle?.title).toBe(updatedArticle.title);
          expect(foundArticle?.relevanceScore).toBeGreaterThan(0);

          // Test version restoration
          const restoredArticle = await helpCenterService.restoreArticleVersion(
            article.id,
            versions[0].id,
            createdBy
          );

          expect(restoredArticle.version).toBe(3);
          expect(restoredArticle.content).toBe(articleData.content); // Back to original
          expect(restoredArticle.summary).toBe(articleData.summary); // Back to original
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.4: Communication Analytics Accuracy
   * For any communication analytics query, the returned metrics should
   * accurately reflect the actual communication activities and delivery status.
   */
  test('communication analytics provide accurate metrics and insights', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of announcements to create
        fc.integer({ min: 1, max: 10 }), // Number of tickets to create
        fc.integer({ min: 1, max: 5 }),  // Number of articles to create
        async (numAnnouncements, numTickets, numArticles) => {
          const createdBy = 'test_admin';
          const timeRange = {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            end: new Date()
          };

          // Create test announcements
          const announcements = [];
          for (let i = 0; i < numAnnouncements; i++) {
            const announcement = await announcementService.createAnnouncement({
              title: `Test Announcement ${i + 1}`,
              content: `This is test announcement content ${i + 1}`,
              type: 'info',
              priority: 'medium',
              targetAudience: 'all',
              isEmergency: i === 0, // Make first one emergency
              requiresAcknowledgment: false,
              channels: ['in_app', 'email'],
              metadata: { tags: ['test'] }
            }, createdBy);
            
            announcements.push(announcement);
            
            // Publish non-emergency announcements
            if (!announcement.isEmergency) {
              await announcementService.publishAnnouncement(announcement.id, createdBy);
            }
          }

          // Create test support tickets
          const tickets = [];
          for (let i = 0; i < numTickets; i++) {
            const ticket = await supportTicketService.createTicket({
              subject: `Test Support Ticket ${i + 1}`,
              description: `This is test ticket description ${i + 1}`,
              category: 'technical',
              priority: 'medium',
              source: 'web',
              userEmail: `user${i + 1}@test.com`,
              userName: `Test User ${i + 1}`,
              tags: ['test'],
              customFields: {}
            });
            
            tickets.push(ticket);
            
            // Resolve half of the tickets
            if (i < Math.floor(numTickets / 2)) {
              await supportTicketService.updateTicket(
                ticket.id,
                { status: 'resolved' },
                createdBy
              );
            }
          }

          // Create test help articles
          const articles = [];
          for (let i = 0; i < numArticles; i++) {
            const article = await helpCenterService.createArticle({
              title: `Test Help Article ${i + 1}`,
              content: `This is test help article content ${i + 1}. It contains useful information.`,
              summary: `Summary for test article ${i + 1}`,
              categoryId: 'test_category',
              tags: ['test', 'help'],
              status: 'published',
              visibility: 'public',
              targetAudience: ['users'],
              language: 'en',
              metadata: { difficulty: 'beginner' }
            }, createdBy);
            
            articles.push(article);
            
            // Add some views and votes
            await helpCenterService.getArticle(article.id); // Increment view count
            await helpCenterService.recordArticleVote(article.id, true, `user${i + 1}`);
          }

          // Wait for processing
          await new Promise(resolve => setTimeout(resolve, 200));

          // Get announcement analytics
          const announcementAnalytics = await announcementService.getAnnouncementAnalytics(timeRange);
          
          expect(announcementAnalytics.totalAnnouncements).toBe(numAnnouncements);
          expect(announcementAnalytics.emergencyBroadcasts).toBe(1); // First one was emergency
          expect(announcementAnalytics.averageDeliveryRate).toBeGreaterThanOrEqual(0);
          expect(announcementAnalytics.averageReadRate).toBeGreaterThanOrEqual(0);
          expect(announcementAnalytics.topPerformingAnnouncements).toBeDefined();
          expect(announcementAnalytics.channelPerformance).toBeDefined();
          expect(announcementAnalytics.channelPerformance).toHaveProperty('in_app');
          expect(announcementAnalytics.channelPerformance).toHaveProperty('email');

          // Get support ticket metrics
          const ticketMetrics = await supportTicketService.getTicketMetrics(timeRange);
          
          expect(ticketMetrics.totalTickets).toBe(numTickets);
          expect(ticketMetrics.resolvedTickets).toBe(Math.floor(numTickets / 2));
          expect(ticketMetrics.openTickets).toBe(numTickets - Math.floor(numTickets / 2));
          expect(ticketMetrics.averageResolutionTime).toBeGreaterThanOrEqual(0);
          expect(ticketMetrics.ticketsByCategory).toHaveProperty('technical');
          expect(ticketMetrics.ticketsByCategory.technical).toBe(numTickets);
          expect(ticketMetrics.ticketsByPriority).toHaveProperty('medium');
          expect(ticketMetrics.ticketsByPriority.medium).toBe(numTickets);

          // Get help center analytics
          const contentAnalytics = await helpCenterService.getContentAnalytics();
          
          expect(contentAnalytics.length).toBeGreaterThanOrEqual(numArticles);
          
          const testArticleAnalytics = contentAnalytics.filter(a => 
            a.title.startsWith('Test Help Article')
          );
          
          expect(testArticleAnalytics.length).toBe(numArticles);
          
          testArticleAnalytics.forEach(analytics => {
            expect(analytics.views).toBeGreaterThanOrEqual(1); // At least one view from getArticle call
            expect(analytics.helpfulVotes).toBeGreaterThanOrEqual(1); // At least one helpful vote
            expect(analytics.unhelpfulVotes).toBe(0); // No unhelpful votes added
            expect(analytics.helpfulnessRatio).toBeGreaterThan(0);
          });

          // Verify analytics consistency
          const totalViews = testArticleAnalytics.reduce((sum, a) => sum + a.views, 0);
          const totalHelpfulVotes = testArticleAnalytics.reduce((sum, a) => sum + a.helpfulVotes, 0);
          
          expect(totalViews).toBeGreaterThanOrEqual(numArticles);
          expect(totalHelpfulVotes).toBeGreaterThanOrEqual(numArticles);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.5: Message Template and Segment Consistency
   * For any message template and user segment operations, the operations should
   * maintain consistency and proper validation.
   */
  test('message templates and user segments maintain consistency and validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          templateName: fc.string({ minLength: 5, maxLength: 50 }),
          templateDescription: fc.string({ minLength: 10, maxLength: 200 }),
          templateType: fc.constantFrom('announcement', 'notification', 'alert', 'reminder'),
          subject: fc.string({ minLength: 5, maxLength: 100 }),
          content: fc.string({ minLength: 20, maxLength: 500 }),
          variables: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
          channels: fc.array(
            fc.constantFrom('in_app', 'email', 'sms', 'push'),
            { minLength: 1, maxLength: 4 }
          ).map(arr => Array.from(new Set(arr)))
        }),
        fc.record({
          segmentName: fc.string({ minLength: 5, maxLength: 50 }),
          segmentDescription: fc.string({ minLength: 10, maxLength: 200 }),
          userTypes: fc.array(
            fc.constantFrom('user', 'driver', 'company_admin'),
            { minLength: 1, maxLength: 3 }
          ).map(arr => Array.from(new Set(arr))),
          activityLevel: fc.constantFrom('active', 'inactive', 'new'),
          countries: fc.array(fc.string({ minLength: 2, maxLength: 2 }), { minLength: 1, maxLength: 5 })
        }),
        fc.string({ minLength: 5, maxLength: 20 }), // createdBy
        async (templateData, segmentData, createdBy) => {
          // Create message template
          const template = await announcementService.createMessageTemplate({
            name: templateData.templateName,
            description: templateData.templateDescription,
            type: templateData.templateType,
            subject: templateData.subject,
            content: templateData.content,
            variables: templateData.variables,
            channels: templateData.channels,
            isActive: true
          }, createdBy);

          // Verify template creation
          expect(template).toBeDefined();
          expect(template.id).toBeDefined();
          expect(template.name).toBe(templateData.templateName);
          expect(template.description).toBe(templateData.templateDescription);
          expect(template.type).toBe(templateData.templateType);
          expect(template.subject).toBe(templateData.subject);
          expect(template.content).toBe(templateData.content);
          expect(template.variables).toEqual(templateData.variables);
          expect(template.channels).toEqual(templateData.channels);
          expect(template.isActive).toBe(true);
          expect(template.createdBy).toBe(createdBy);

          // Create user segment
          const segment = await announcementService.createUserSegment({
            name: segmentData.segmentName,
            description: segmentData.segmentDescription,
            criteria: {
              userType: segmentData.userTypes,
              activityLevel: segmentData.activityLevel,
              location: {
                countries: segmentData.countries
              }
            },
            isActive: true
          }, createdBy);

          // Verify segment creation
          expect(segment).toBeDefined();
          expect(segment.id).toBeDefined();
          expect(segment.name).toBe(segmentData.segmentName);
          expect(segment.description).toBe(segmentData.segmentDescription);
          expect(segment.criteria.userType).toEqual(segmentData.userTypes);
          expect(segment.criteria.activityLevel).toBe(segmentData.activityLevel);
          expect(segment.criteria.location?.countries).toEqual(segmentData.countries);
          expect(segment.estimatedSize).toBeGreaterThan(0);
          expect(segment.lastCalculated).toBeDefined();
          expect(segment.isActive).toBe(true);
          expect(segment.createdBy).toBe(createdBy);

          // Retrieve templates and segments
          const templates = await announcementService.getMessageTemplates(templateData.templateType);
          const segments = await announcementService.getUserSegments();

          // Verify retrieval
          const foundTemplate = templates.find(t => t.id === template.id);
          const foundSegment = segments.find(s => s.id === segment.id);

          expect(foundTemplate).toBeDefined();
          expect(foundTemplate?.name).toBe(templateData.templateName);
          expect(foundTemplate?.isActive).toBe(true);

          expect(foundSegment).toBeDefined();
          expect(foundSegment?.name).toBe(segmentData.segmentName);
          expect(foundSegment?.isActive).toBe(true);

          // Verify segment size calculation consistency
          expect(segment.estimatedSize).toBeGreaterThan(0);
          expect(segment.estimatedSize).toBeLessThanOrEqual(1000); // Mock max size
          
          // Segments with more restrictive criteria should have smaller sizes
          if (segmentData.userTypes.length === 1 && segmentData.countries.length === 1) {
            expect(segment.estimatedSize).toBeLessThan(500);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});