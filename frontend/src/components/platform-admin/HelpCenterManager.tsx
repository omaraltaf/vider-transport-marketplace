import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { getApiUrl } from '../../config/app.config';
import { 
  HelpCircle, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Save, 
  FileText,
  Tag,
  TrendingUp,
  Users,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Calendar,
  Globe,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  subcategory?: string;
  tags: string[];
  status: 'draft' | 'review' | 'published' | 'archived';
  author: string;
  reviewer?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  views: number;
  helpful: number;
  notHelpful: number;
  searchRanking: number;
  relatedArticles: string[];
  featured: boolean;
}

interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  articleCount: number;
  subcategories: string[];
}

interface HelpCenterAnalytics {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  avgRating: number;
  topSearchQueries: { query: string; count: number }[];
  popularArticles: { id: string; title: string; views: number }[];
  categoryStats: { [key: string]: { views: number; articles: number } };
}

interface HelpCenterManagerProps {
  onArticleSelect?: (article: HelpArticle) => void;
}

export const HelpCenterManager: React.FC<HelpCenterManagerProps> = ({
  onArticleSelect
}) => {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [analytics, setAnalytics] = useState<HelpCenterAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<HelpArticle>>({});

  useEffect(() => {
    fetchArticles();
    fetchCategories();
    fetchAnalytics();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch(getApiUrl('/platform-admin/communication/help-center/articles'));
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(getApiUrl('/platform-admin/communication/help-center/categories'));
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(getApiUrl('/platform-admin/communication/help-center/analytics'));
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveArticle = async () => {
    try {
      const method = editingArticle.id ? 'PUT' : 'POST';
      const url = editingArticle.id 
        ? `/api/platform-admin/communication/help-center/articles/${editingArticle.id}`
        : '/api/platform-admin/communication/help-center/articles';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingArticle)
      });

      setShowEditor(false);
      setEditingArticle({});
      fetchArticles();
    } catch (error) {
      console.error('Error saving article:', error);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      await fetch(`/api/platform-admin/communication/help-center/articles/${articleId}`, {
        method: 'DELETE'
      });
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
    }
  };

  const handlePublishArticle = async (articleId: string) => {
    try {
      await fetch(`/api/platform-admin/communication/help-center/articles/${articleId}/publish`, {
        method: 'POST'
      });
      fetchArticles();
    } catch (error) {
      console.error('Error publishing article:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'review':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      case 'review':
        return <Clock className="h-4 w-4" />;
      case 'draft':
        return <Edit className="h-4 w-4" />;
      case 'archived':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || article.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || article.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
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
          <h3 className="text-lg font-semibold text-gray-900">Help Center Manager</h3>
          <p className="text-gray-600">Create and manage help center articles and documentation</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button 
            size="sm"
            onClick={() => {
              setEditingArticle({});
              setShowEditor(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Articles</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalArticles}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.publishedArticles}</p>
              </div>
              <Globe className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.avgRating.toFixed(1)}</p>
              </div>
              <ThumbsUp className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
        </div>
      )}

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          {!showEditor ? (
            <>
              {/* Filters */}
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search articles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Under Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              {/* Articles List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredArticles.map((article) => (
                  <Card key={article.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getStatusColor(article.status)}>
                              {getStatusIcon(article.status)}
                              <span className="ml-1">{article.status}</span>
                            </Badge>
                            {article.featured && (
                              <Badge variant="outline" className="text-yellow-600">
                                Featured
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">{article.title}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{article.category}</span>
                        <span className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {article.views}
                        </span>
                        <span className="flex items-center">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {article.helpful}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {article.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {article.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{article.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-xs text-gray-500">
                          By {article.author}
                        </span>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedArticle(article);
                              onArticleSelect?.(article);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingArticle(article);
                              setShowEditor(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {article.status === 'draft' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePublishArticle(article.id)}
                            >
                              <Globe className="h-3 w-3" />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteArticle(article.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            /* Article Editor */
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-semibold">
                  {editingArticle.id ? 'Edit Article' : 'Create New Article'}
                </h4>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setShowEditor(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveArticle}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <Label htmlFor="title">Article Title</Label>
                    <Input
                      id="title"
                      value={editingArticle.title || ''}
                      onChange={(e) => setEditingArticle(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter article title..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Input
                      id="excerpt"
                      value={editingArticle.excerpt || ''}
                      onChange={(e) => setEditingArticle(prev => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="Brief description of the article..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <textarea
                      id="content"
                      value={editingArticle.content || ''}
                      onChange={(e) => setEditingArticle(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your article content here..."
                      rows={12}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={editingArticle.category || ''} 
                      onValueChange={(value) => setEditingArticle(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={editingArticle.status || 'draft'} 
                      onValueChange={(value: any) => setEditingArticle(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="review">Under Review</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={editingArticle.tags?.join(', ') || ''}
                      onChange={(e) => setEditingArticle(prev => ({ 
                        ...prev, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }))}
                      placeholder="tag1, tag2, tag3"
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="featured"
                        checked={editingArticle.featured || false}
                        onChange={(e) => setEditingArticle(prev => ({ ...prev, featured: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="featured">Featured Article</Label>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="text-2xl">{category.icon}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{category.name}</h4>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{category.articleCount} articles</span>
                  <Button variant="outline" size="sm">
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Popular Articles</h4>
                <div className="space-y-3">
                  {analytics.popularArticles.map((article, index) => (
                    <div key={article.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="text-sm text-gray-900">{article.title}</span>
                      </div>
                      <span className="text-sm text-gray-500">{article.views} views</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Top Search Queries</h4>
                <div className="space-y-3">
                  {analytics.topSearchQueries.map((query, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{query.query}</span>
                      <span className="text-sm text-gray-500">{query.count} searches</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};