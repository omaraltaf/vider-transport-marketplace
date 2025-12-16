import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Bell, 
  MessageSquare, 
  HelpCircle, 
  Calendar, 
  Users, 
  Clock,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'emergency' | 'maintenance';
  targetAudience: string[];
  scheduledAt?: Date;
  deliveredAt?: Date;
  status: 'draft' | 'scheduled' | 'delivered' | 'failed';
  deliveryStats: {
    sent: number;
    delivered: number;
    read: number;
  };
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  category: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  slaDeadline: Date;
  responses: TicketResponse[];
}

interface TicketResponse {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  isInternal: boolean;
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  status: 'draft' | 'review' | 'published' | 'archived';
  author: string;
  createdAt: Date;
  updatedAt: Date;
  views: number;
  helpful: number;
  notHelpful: number;
}

interface CommunicationStats {
  announcements: {
    total: number;
    delivered: number;
    pending: number;
    failed: number;
  };
  tickets: {
    open: number;
    inProgress: number;
    resolved: number;
    avgResponseTime: number;
    slaCompliance: number;
  };
  helpCenter: {
    articles: number;
    views: number;
    avgRating: number;
    searchQueries: number;
  };
}

interface CommunicationCenterProps {
  className?: string;
  initialSubSection?: string;
}

export const CommunicationCenter: React.FC<CommunicationCenterProps> = ({
  initialSubSection = 'announcements'
}) => {
  const [activeTab, setActiveTab] = useState('announcements');

  // Update activeTab when initialSubSection prop changes
  useEffect(() => {
    // Map external sub-section names to internal tab names
    const sectionMapping: { [key: string]: string } = {
      'announcements': 'announcements',
      'support-tickets': 'tickets',
      'help-center': 'help-center',
      'tickets': 'tickets'
    };
    
    const mappedSection = sectionMapping[initialSubSection] || 'announcements';
    setActiveTab(mappedSection);
  }, [initialSubSection]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchCommunicationData();
  }, []);

  const fetchCommunicationData = async () => {
    try {
      setLoading(true);
      
      // Set mock data for development since API endpoints may not be available
      const mockAnnouncements: Announcement[] = [
        {
          id: 'ann-1',
          title: 'Platform Maintenance Scheduled',
          content: 'We will be performing scheduled maintenance on December 20th from 2:00 AM to 4:00 AM CET.',
          type: 'maintenance',
          targetAudience: ['all-users'],
          scheduledAt: new Date('2024-12-20T02:00:00'),
          status: 'scheduled',
          deliveryStats: {
            sent: 1250,
            delivered: 1248,
            read: 892
          }
        },
        {
          id: 'ann-2',
          title: 'New Feature: Hourly Bookings',
          content: 'We are excited to announce the launch of hourly booking options for short-term rentals.',
          type: 'info',
          targetAudience: ['customers', 'companies'],
          deliveredAt: new Date('2024-12-10T10:00:00'),
          status: 'delivered',
          deliveryStats: {
            sent: 2100,
            delivered: 2095,
            read: 1567
          }
        }
      ];

      const mockTickets: SupportTicket[] = [
        {
          id: 'ticket-1',
          subject: 'Payment processing issue',
          description: 'Customer unable to complete payment for booking #12345',
          priority: 'high',
          status: 'open',
          category: 'Payment',
          createdBy: 'john.doe@example.com',
          createdAt: new Date('2024-12-14T09:30:00'),
          updatedAt: new Date('2024-12-14T09:30:00'),
          slaDeadline: new Date('2024-12-15T09:30:00'),
          responses: []
        },
        {
          id: 'ticket-2',
          subject: 'Account verification delay',
          description: 'Company registration stuck in verification process for 5 days',
          priority: 'medium',
          status: 'in-progress',
          category: 'Account',
          assignedTo: 'support-team',
          createdBy: 'company@logistics.no',
          createdAt: new Date('2024-12-12T14:15:00'),
          updatedAt: new Date('2024-12-14T11:20:00'),
          slaDeadline: new Date('2024-12-16T14:15:00'),
          responses: []
        }
      ];

      const mockArticles: HelpArticle[] = [
        {
          id: 'article-1',
          title: 'How to Create Your First Booking',
          content: 'This comprehensive guide will walk you through the process of creating your first booking on the Vider platform...',
          category: 'Getting Started',
          tags: ['booking', 'tutorial', 'beginner'],
          status: 'published',
          author: 'Support Team',
          createdAt: new Date('2024-11-15T10:00:00'),
          updatedAt: new Date('2024-12-01T15:30:00'),
          views: 1250,
          helpful: 89,
          notHelpful: 12
        },
        {
          id: 'article-2',
          title: 'Understanding Commission Rates',
          content: 'Learn about how commission rates work on the Vider platform and how they affect your earnings...',
          category: 'Financial',
          tags: ['commission', 'earnings', 'finance'],
          status: 'published',
          author: 'Finance Team',
          createdAt: new Date('2024-11-20T14:00:00'),
          updatedAt: new Date('2024-11-25T09:15:00'),
          views: 892,
          helpful: 67,
          notHelpful: 8
        }
      ];

      const mockStats: CommunicationStats = {
        announcements: {
          total: 15,
          delivered: 12,
          pending: 2,
          failed: 1
        },
        tickets: {
          open: 8,
          inProgress: 5,
          resolved: 142,
          avgResponseTime: 4.2,
          slaCompliance: 94
        },
        helpCenter: {
          articles: 45,
          views: 12450,
          avgRating: 4.3,
          searchQueries: 890
        }
      };

      // Try to fetch from API, but fall back to mock data if it fails
      try {
        const headers = {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        };

        // Fetch announcements
        const announcementsResponse = await fetch('/api/platform-admin/communication/announcements', { headers });
        if (announcementsResponse.ok) {
          const announcementsData = await announcementsResponse.json();
          setAnnouncements(announcementsData.announcements || mockAnnouncements);
        } else {
          setAnnouncements(mockAnnouncements);
        }

        // Fetch support tickets
        const ticketsResponse = await fetch('/api/platform-admin/communication/tickets', { headers });
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json();
          setTickets(ticketsData.tickets || mockTickets);
        } else {
          setTickets(mockTickets);
        }

        // Fetch help articles
        const articlesResponse = await fetch('/api/platform-admin/communication/help-center/articles', { headers });
        if (articlesResponse.ok) {
          const articlesData = await articlesResponse.json();
          setArticles(articlesData.articles || mockArticles);
        } else {
          setArticles(mockArticles);
        }

        // Fetch communication stats
        const statsResponse = await fetch('/api/platform-admin/communication/analytics', { headers });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData || mockStats);
        } else {
          setStats(mockStats);
        }

      } catch (apiError) {
        console.log('API not available, using mock data:', apiError);
        // Use mock data if API calls fail
        setAnnouncements(mockAnnouncements);
        setTickets(mockTickets);
        setArticles(mockArticles);
        setStats(mockStats);
      }

    } catch (error) {
      console.error('Error fetching communication data:', error);
      // Set empty arrays as fallback
      setAnnouncements([]);
      setTickets([]);
      setArticles([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'resolved':
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
      case 'in-progress':
      case 'review':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Communication Center</h2>
          <p className="text-gray-600">Manage announcements, support tickets, and help center content</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Announcements</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.announcements.total || 0}</p>
              <p className="text-sm text-gray-500">
                {stats?.announcements.delivered || 0} delivered, {stats?.announcements.pending || 0} pending
              </p>
            </div>
            <Bell className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Support Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.tickets.open || 0}</p>
              <p className="text-sm text-gray-500">
                {stats?.tickets.slaCompliance || 0}% SLA compliance
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Help Articles</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.helpCenter.articles || 0}</p>
              <p className="text-sm text-gray-500">
                {stats?.helpCenter.views || 0} total views
              </p>
            </div>
            <HelpCircle className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="announcements" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Support Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="help-center" className="flex items-center space-x-2">
            <HelpCircle className="h-4 w-4" />
            <span>Help Center</span>
          </TabsTrigger>
        </TabsList>

        {/* Search and Filter */}
        <div className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-48 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <TabsContent value="announcements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Announcements</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </div>
          
          <div className="space-y-4">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <Card key={announcement.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                        <Badge className={getStatusColor(announcement.status)}>
                          {announcement.status}
                        </Badge>
                        <Badge variant="outline">{announcement.type}</Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{announcement.content}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {announcement.targetAudience.join(', ')}
                        </span>
                        {announcement.scheduledAt && (
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {announcement.scheduledAt.toLocaleDateString()}
                          </span>
                        )}
                        <span>
                          {announcement.deliveryStats.delivered}/{announcement.deliveryStats.sent} delivered
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Announcements</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first announcement to communicate with platform users.
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Announcement
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Support Tickets</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </div>
          
          <div className="space-y-4">
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <Card key={ticket.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{ticket.subject}</h4>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{ticket.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>#{ticket.id}</span>
                        <span>{ticket.category}</span>
                        <span>Created by {ticket.createdBy}</span>
                        {ticket.assignedTo && <span>Assigned to {ticket.assignedTo}</span>}
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          SLA: {ticket.slaDeadline.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button size="sm">
                        Assign
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Support Tickets</h3>
                  <p className="text-gray-600 mb-4">
                    All support tickets will appear here when users submit them.
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="help-center" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Help Center Articles</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </div>
          
          <div className="space-y-4">
            {articles.length > 0 ? (
              articles.map((article) => (
                <Card key={article.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{article.title}</h4>
                        <Badge className={getStatusColor(article.status)}>
                          {article.status}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{article.content.substring(0, 150)}...</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{article.category}</span>
                        <span>By {article.author}</span>
                        <span>{article.views} views</span>
                        <span>{article.helpful} helpful votes</span>
                        <div className="flex space-x-1">
                          {article.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Help Articles</h3>
                  <p className="text-gray-600 mb-4">
                    Create help articles to assist users with common questions and tasks.
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Article
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};