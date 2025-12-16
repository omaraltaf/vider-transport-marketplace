import { Router } from 'express';
import { AnnouncementService } from '../services/announcement.service';
import { SupportTicketService } from '../services/support-ticket.service';
import { HelpCenterService } from '../services/help-center.service';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware';

const router = Router();
const announcementService = AnnouncementService.getInstance();
const supportTicketService = SupportTicketService.getInstance();
const helpCenterService = HelpCenterService.getInstance();

// Apply authentication and platform admin middleware to all routes
router.use(authenticate);
router.use(requirePlatformAdmin);

// ============================================================================
// ANNOUNCEMENT AND BROADCAST ENDPOINTS
// ============================================================================

// Create announcement
router.post('/announcements', async (req, res) => {
  try {
    const announcementData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const announcement = await announcementService.createAnnouncement(
      announcementData,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully'
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get announcements
router.get('/announcements', async (req, res) => {
  try {
    const {
      status,
      type,
      priority,
      targetAudience,
      isEmergency,
      createdBy,
      limit = 50
    } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (priority) filters.priority = priority;
    if (targetAudience) filters.targetAudience = targetAudience;
    if (isEmergency !== undefined) filters.isEmergency = isEmergency === 'true';
    if (createdBy) filters.createdBy = createdBy;

    const announcements = await announcementService.getAnnouncements(
      filters,
      Number(limit)
    );

    res.json({
      success: true,
      data: announcements,
      total: announcements.length
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch announcements'
    });
  }
});

// Get single announcement
router.get('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await announcementService.getAnnouncement(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch announcement'
    });
  }
});

// Update announcement
router.put('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedBy = req.user?.id || 'unknown';

    const announcement = await announcementService.updateAnnouncement(
      id,
      updates,
      updatedBy
    );

    res.json({
      success: true,
      data: announcement,
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Publish announcement
router.post('/announcements/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const publishedBy = req.user?.id || 'unknown';

    await announcementService.publishAnnouncement(id, publishedBy);

    res.json({
      success: true,
      message: 'Announcement published successfully'
    });
  } catch (error) {
    console.error('Error publishing announcement:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel announcement
router.post('/announcements/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const cancelledBy = req.user?.id || 'unknown';

    await announcementService.cancelAnnouncement(id, cancelledBy);

    res.json({
      success: true,
      message: 'Announcement cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling announcement:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Create emergency broadcast
router.post('/broadcast/emergency', async (req, res) => {
  try {
    const { title, content, targetAudience, channels } = req.body;
    const createdBy = req.user?.id || 'unknown';

    if (!title || !content || !targetAudience || !channels) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, target audience, and channels are required for emergency broadcast'
      });
    }

    const announcement = await announcementService.createEmergencyBroadcast(
      title,
      content,
      targetAudience,
      channels,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Emergency broadcast sent successfully'
    });
  } catch (error) {
    console.error('Error creating emergency broadcast:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get delivery status
router.get('/announcements/:id/delivery-status', async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryStatus = await announcementService.getDeliveryStatus(id);

    res.json({
      success: true,
      data: deliveryStatus
    });
  } catch (error) {
    console.error('Error fetching delivery status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery status'
    });
  }
});

// Get announcement analytics
router.get('/announcements/analytics', async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end dates are required'
      });
    }

    const timeRange = {
      start: new Date(start as string),
      end: new Date(end as string)
    };

    const analytics = await announcementService.getAnnouncementAnalytics(timeRange);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching announcement analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch announcement analytics'
    });
  }
});

// Message Templates
router.post('/templates', async (req, res) => {
  try {
    const templateData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const template = await announcementService.createMessageTemplate(
      templateData,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: template,
      message: 'Message template created successfully'
    });
  } catch (error) {
    console.error('Error creating message template:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const { type } = req.query;
    const templates = await announcementService.getMessageTemplates(type as any);

    res.json({
      success: true,
      data: templates,
      total: templates.length
    });
  } catch (error) {
    console.error('Error fetching message templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message templates'
    });
  }
});

// User Segments
router.post('/segments', async (req, res) => {
  try {
    const segmentData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const segment = await announcementService.createUserSegment(
      segmentData,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: segment,
      message: 'User segment created successfully'
    });
  } catch (error) {
    console.error('Error creating user segment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/segments', async (req, res) => {
  try {
    const segments = await announcementService.getUserSegments();

    res.json({
      success: true,
      data: segments,
      total: segments.length
    });
  } catch (error) {
    console.error('Error fetching user segments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user segments'
    });
  }
});

// ============================================================================
// SUPPORT TICKET MANAGEMENT ENDPOINTS
// ============================================================================

// Create support ticket
router.post('/tickets', async (req, res) => {
  try {
    const ticketData = req.body;
    const createdBy = req.user?.id;

    const ticket = await supportTicketService.createTicket(ticketData, createdBy);

    res.status(201).json({
      success: true,
      data: ticket,
      message: 'Support ticket created successfully'
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get support tickets
router.get('/tickets', async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      assignedTo,
      userId,
      tags,
      createdAfter,
      createdBefore,
      limit = 50,
      offset = 0
    } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (category) filters.category = category;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (userId) filters.userId = userId;
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
    if (createdAfter) filters.createdAfter = new Date(createdAfter as string);
    if (createdBefore) filters.createdBefore = new Date(createdBefore as string);

    const pagination = {
      limit: Number(limit),
      offset: Number(offset)
    };

    const result = await supportTicketService.getTickets(filters, pagination);

    res.json({
      success: true,
      data: result.tickets,
      total: result.total,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + result.tickets.length < result.total
      }
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support tickets'
    });
  }
});

// Get single support ticket
router.get('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await supportTicketService.getTicket(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Get ticket responses
    const responses = await supportTicketService.getTicketResponses(id);

    res.json({
      success: true,
      data: {
        ticket,
        responses
      }
    });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support ticket'
    });
  }
});

// Update support ticket
router.put('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedBy = req.user?.id || 'unknown';

    const ticket = await supportTicketService.updateTicket(id, updates, updatedBy);

    res.json({
      success: true,
      data: ticket,
      message: 'Support ticket updated successfully'
    });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Assign ticket to agent
router.put('/tickets/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const assignedBy = req.user?.id || 'unknown';

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
    }

    const ticket = await supportTicketService.assignTicket(id, agentId, assignedBy);

    res.json({
      success: true,
      data: ticket,
      message: 'Ticket assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Add response to ticket
router.post('/tickets/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const responseData = req.body;
    const authorId = req.user?.id || 'unknown';

    const response = await supportTicketService.addResponse(
      id,
      responseData,
      authorId
    );

    res.status(201).json({
      success: true,
      data: response,
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Error adding ticket response:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get ticket metrics
router.get('/tickets/metrics', async (req, res) => {
  try {
    const { start, end, category, priority, assignedTo } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end dates are required'
      });
    }

    const timeRange = {
      start: new Date(start as string),
      end: new Date(end as string)
    };

    const filters: any = {};
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (assignedTo) filters.assignedTo = assignedTo;

    const metrics = await supportTicketService.getTicketMetrics(timeRange, filters);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching ticket metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket metrics'
    });
  }
});

// SLA Policies
router.post('/sla-policies', async (req, res) => {
  try {
    const policyData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const policy = await supportTicketService.createSLAPolicy(policyData, createdBy);

    res.status(201).json({
      success: true,
      data: policy,
      message: 'SLA policy created successfully'
    });
  } catch (error) {
    console.error('Error creating SLA policy:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/sla-policies', async (req, res) => {
  try {
    const policies = await supportTicketService.getSLAPolicies();

    res.json({
      success: true,
      data: policies,
      total: policies.length
    });
  } catch (error) {
    console.error('Error fetching SLA policies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SLA policies'
    });
  }
});

// Automation Rules
router.post('/automation-rules', async (req, res) => {
  try {
    const ruleData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const rule = await supportTicketService.createAutomationRule(ruleData, createdBy);

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Automation rule created successfully'
    });
  } catch (error) {
    console.error('Error creating automation rule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/automation-rules', async (req, res) => {
  try {
    const rules = await supportTicketService.getAutomationRules();

    res.json({
      success: true,
      data: rules,
      total: rules.length
    });
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch automation rules'
    });
  }
});

// ============================================================================
// HELP CENTER ENDPOINTS
// ============================================================================

// Create help article
router.post('/help-center/articles', async (req, res) => {
  try {
    const articleData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const article = await helpCenterService.createArticle(articleData, createdBy);

    res.status(201).json({
      success: true,
      data: article,
      message: 'Help article created successfully'
    });
  } catch (error) {
    console.error('Error creating help article:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get help articles
router.get('/help-center/articles', async (req, res) => {
  try {
    const {
      categoryId,
      status,
      visibility,
      targetAudience,
      language,
      tags,
      limit = 50,
      offset = 0
    } = req.query;

    const filters: any = {};
    if (categoryId) filters.categoryId = categoryId;
    if (status) filters.status = status;
    if (visibility) filters.visibility = visibility;
    if (targetAudience) filters.targetAudience = targetAudience;
    if (language) filters.language = language;
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

    const pagination = {
      limit: Number(limit),
      offset: Number(offset)
    };

    const result = await helpCenterService.getArticles(filters, pagination);

    res.json({
      success: true,
      data: result.articles,
      total: result.total,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + result.articles.length < result.total
      }
    });
  } catch (error) {
    console.error('Error fetching help articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help articles'
    });
  }
});

// Get single help article
router.get('/help-center/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const article = await helpCenterService.getArticle(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Help article not found'
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error fetching help article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help article'
    });
  }
});

// Update help article
router.put('/help-center/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { changeLog, ...updates } = req.body;
    const updatedBy = req.user?.id || 'unknown';

    const article = await helpCenterService.updateArticle(
      id,
      updates,
      changeLog || 'Article updated',
      updatedBy
    );

    res.json({
      success: true,
      data: article,
      message: 'Help article updated successfully'
    });
  } catch (error) {
    console.error('Error updating help article:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete help article
router.delete('/help-center/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id || 'unknown';

    await helpCenterService.deleteArticle(id, deletedBy);

    res.json({
      success: true,
      message: 'Help article deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting help article:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Vote on article helpfulness
router.post('/help-center/articles/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;
    const userId = req.user?.id;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Helpful field must be a boolean'
      });
    }

    await helpCenterService.recordArticleVote(id, helpful, userId);

    res.json({
      success: true,
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    console.error('Error recording article vote:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get article versions
router.get('/help-center/articles/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const versions = await helpCenterService.getArticleVersions(id);

    res.json({
      success: true,
      data: versions,
      total: versions.length
    });
  } catch (error) {
    console.error('Error fetching article versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article versions'
    });
  }
});

// Restore article version
router.post('/help-center/articles/:id/versions/:versionId/restore', async (req, res) => {
  try {
    const { id, versionId } = req.params;
    const restoredBy = req.user?.id || 'unknown';

    const article = await helpCenterService.restoreArticleVersion(
      id,
      versionId,
      restoredBy
    );

    res.json({
      success: true,
      data: article,
      message: 'Article version restored successfully'
    });
  } catch (error) {
    console.error('Error restoring article version:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Help Categories
router.post('/help-center/categories', async (req, res) => {
  try {
    const categoryData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const category = await helpCenterService.createCategory(categoryData, createdBy);

    res.status(201).json({
      success: true,
      data: category,
      message: 'Help category created successfully'
    });
  } catch (error) {
    console.error('Error creating help category:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/help-center/categories', async (req, res) => {
  try {
    const { parentId, targetAudience, isVisible } = req.query;

    const filters: any = {};
    if (parentId !== undefined) filters.parentId = parentId === 'null' ? null : parentId;
    if (targetAudience) filters.targetAudience = targetAudience;
    if (isVisible !== undefined) filters.isVisible = isVisible === 'true';

    const categories = await helpCenterService.getCategories(filters);

    res.json({
      success: true,
      data: categories,
      total: categories.length
    });
  } catch (error) {
    console.error('Error fetching help categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help categories'
    });
  }
});

router.put('/help-center/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedBy = req.user?.id || 'unknown';

    const category = await helpCenterService.updateCategory(id, updates, updatedBy);

    res.json({
      success: true,
      data: category,
      message: 'Help category updated successfully'
    });
  } catch (error) {
    console.error('Error updating help category:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// FAQs
router.post('/help-center/faqs', async (req, res) => {
  try {
    const faqData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const faq = await helpCenterService.createFAQ(faqData, createdBy);

    res.status(201).json({
      success: true,
      data: faq,
      message: 'FAQ created successfully'
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/help-center/faqs', async (req, res) => {
  try {
    const { categoryId, targetAudience, isVisible, tags } = req.query;

    const filters: any = {};
    if (categoryId) filters.categoryId = categoryId;
    if (targetAudience) filters.targetAudience = targetAudience;
    if (isVisible !== undefined) filters.isVisible = isVisible === 'true';
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

    const faqs = await helpCenterService.getFAQs(filters);

    res.json({
      success: true,
      data: faqs,
      total: faqs.length
    });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQs'
    });
  }
});

// Search help content
router.get('/help-center/search', async (req, res) => {
  try {
    const { q, type, targetAudience, categoryId, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const filters: any = {};
    if (type) filters.type = Array.isArray(type) ? type : [type];
    if (targetAudience) filters.targetAudience = targetAudience;
    if (categoryId) filters.categoryId = categoryId;

    const results = await helpCenterService.searchContent(
      q as string,
      filters,
      Number(limit)
    );

    res.json({
      success: true,
      data: results,
      total: results.length,
      query: q
    });
  } catch (error) {
    console.error('Error searching help content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search help content'
    });
  }
});

// Get content analytics
router.get('/help-center/analytics', async (req, res) => {
  try {
    const { articleId, start, end } = req.query;

    let timeRange;
    if (start && end) {
      timeRange = {
        start: new Date(start as string),
        end: new Date(end as string)
      };
    }

    const analytics = await helpCenterService.getContentAnalytics(
      articleId as string,
      timeRange
    );

    res.json({
      success: true,
      data: analytics,
      total: analytics.length
    });
  } catch (error) {
    console.error('Error fetching content analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content analytics'
    });
  }
});

// Get engagement metrics
router.get('/engagement-metrics', async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end dates are required'
      });
    }

    // Combine metrics from all communication services
    const [
      announcementAnalytics,
      ticketMetrics,
      contentAnalytics
    ] = await Promise.all([
      announcementService.getAnnouncementAnalytics({
        start: new Date(start as string),
        end: new Date(end as string)
      }),
      supportTicketService.getTicketMetrics({
        start: new Date(start as string),
        end: new Date(end as string)
      }),
      helpCenterService.getContentAnalytics()
    ]);

    const engagementMetrics = {
      announcements: {
        total: announcementAnalytics.totalAnnouncements,
        emergencyBroadcasts: announcementAnalytics.emergencyBroadcasts,
        averageDeliveryRate: announcementAnalytics.averageDeliveryRate,
        averageReadRate: announcementAnalytics.averageReadRate,
        channelPerformance: announcementAnalytics.channelPerformance
      },
      support: {
        totalTickets: ticketMetrics.totalTickets,
        resolvedTickets: ticketMetrics.resolvedTickets,
        averageResolutionTime: ticketMetrics.averageResolutionTime,
        slaCompliance: ticketMetrics.slaCompliance,
        satisfactionScore: ticketMetrics.satisfactionScore
      },
      helpCenter: {
        totalArticles: contentAnalytics.length,
        totalViews: contentAnalytics.reduce((sum, a) => sum + a.views, 0),
        averageHelpfulness: contentAnalytics.length > 0 
          ? contentAnalytics.reduce((sum, a) => sum + a.helpfulnessRatio, 0) / contentAnalytics.length 
          : 0,
        topArticles: contentAnalytics.slice(0, 5).map(a => ({
          title: a.title,
          views: a.views,
          helpfulnessRatio: a.helpfulnessRatio
        }))
      }
    };

    res.json({
      success: true,
      data: engagementMetrics,
      timeRange: { start, end }
    });
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engagement metrics'
    });
  }
});

export default router;