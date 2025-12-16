import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  MessageSquare, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Filter, 
  Plus,
  Eye,
  Edit,
  Send,
  Paperclip,
  Calendar,
  BarChart3,
  Users,
  TrendingUp,
  Timer
} from 'lucide-react';

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
  tags: string[];
  customerSatisfaction?: number;
}

interface TicketResponse {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  isInternal: boolean;
  attachments?: string[];
}

interface TicketMetrics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaCompliance: number;
  customerSatisfaction: number;
  ticketsByCategory: { [key: string]: number };
  ticketsByPriority: { [key: string]: number };
}

interface SupportTicketDashboardProps {
  onTicketSelect?: (ticket: SupportTicket) => void;
}

export const SupportTicketDashboard: React.FC<SupportTicketDashboardProps> = ({
  onTicketSelect
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [metrics, setMetrics] = useState<TicketMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [newResponse, setNewResponse] = useState('');

  useEffect(() => {
    fetchTickets();
    fetchMetrics();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/platform-admin/communication/tickets');
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/platform-admin/communication/tickets/metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketAssignment = async (ticketId: string, assigneeId: string) => {
    try {
      await fetch(`/api/platform-admin/communication/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId })
      });
      fetchTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
    }
  };

  const handleTicketResponse = async (ticketId: string) => {
    if (!newResponse.trim()) return;

    try {
      await fetch(`/api/platform-admin/communication/tickets/${ticketId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newResponse,
          isInternal: false
        })
      });
      setNewResponse('');
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        const updatedTicket = tickets.find(t => t.id === ticketId);
        if (updatedTicket) setSelectedTicket(updatedTicket);
      }
    } catch (error) {
      console.error('Error responding to ticket:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSLAStatus = (deadline: Date) => {
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return { color: 'text-red-600', text: 'Overdue' };
    if (hoursLeft < 2) return { color: 'text-orange-600', text: 'Due Soon' };
    return { color: 'text-green-600', text: 'On Track' };
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'all' || ticket.assignedTo === filterAssignee;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

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
          <h3 className="text-lg font-semibold text-gray-900">Support Ticket Dashboard</h3>
          <p className="text-gray-600">Manage and track customer support tickets</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalTickets}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.openTickets}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.avgResponseTime}h</p>
              </div>
              <Timer className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SLA Compliance</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.slaCompliance}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="john_doe">John Doe</SelectItem>
                  <SelectItem value="jane_smith">Jane Smith</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Ticket List */}
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const slaStatus = getSLAStatus(ticket.slaDeadline);
              return (
                <Card 
                  key={ticket.id} 
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedTicket?.id === ticket.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowTicketDetail(true);
                    onTicketSelect?.(ticket);
                  }}
                >
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
                      
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {ticket.createdBy}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {ticket.createdAt.toLocaleDateString()}
                        </span>
                        <span className={`flex items-center ${slaStatus.color}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          SLA: {slaStatus.text}
                        </span>
                        {ticket.assignedTo && (
                          <span>Assigned to {ticket.assignedTo}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {ticket.responses.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {ticket.responses.length} replies
                        </Badge>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Ticket Detail Sidebar */}
        <div className="space-y-4">
          {selectedTicket ? (
            <>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Ticket Details</h4>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500">Subject</Label>
                    <p className="text-sm font-medium">{selectedTicket.subject}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-gray-500">Category</Label>
                    <p className="text-sm">{selectedTicket.category}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Priority</Label>
                      <Badge className={getPriorityColor(selectedTicket.priority)}>
                        {selectedTicket.priority}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Status</Label>
                      <Badge className={getStatusColor(selectedTicket.status)}>
                        {selectedTicket.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-gray-500">Assigned To</Label>
                    <Select 
                      value={selectedTicket.assignedTo || 'unassigned'} 
                      onValueChange={(value) => handleTicketAssignment(selectedTicket.id, value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="john_doe">John Doe</SelectItem>
                        <SelectItem value="jane_smith">Jane Smith</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Responses */}
              <Card className="p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Conversation</h4>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedTicket.responses.map((response) => (
                    <div key={response.id} className={`p-3 rounded-lg ${
                      response.isInternal ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-blue-50 border-l-4 border-blue-400'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">{response.author}</span>
                        <span className="text-xs text-gray-500">
                          {response.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{response.content}</p>
                      {response.attachments && response.attachments.length > 0 && (
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {response.attachments.length} attachment(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Response Form */}
                <div className="mt-4 space-y-3">
                  <textarea
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleTicketResponse(selectedTicket.id)}
                      disabled={!newResponse.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a ticket to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};