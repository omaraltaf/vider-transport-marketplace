/**
 * Dashboard Page
 * Main dashboard for authenticated users
 */

import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Your Dashboard</h2>
        <div className="space-y-2">
          <p className="text-gray-600">
            <strong>Email:</strong> {user?.email}
          </p>
          <p className="text-gray-600">
            <strong>Role:</strong> {user?.role}
          </p>
          <p className="text-gray-600">
            <strong>Company ID:</strong> {user?.companyId}
          </p>
        </div>
        
        {user?.companyId && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Links</h3>
            <div className="space-y-2">
              <Link
                to={`/companies/${user.companyId}`}
                className="block text-blue-600 hover:text-blue-700 hover:underline"
              >
                View Company Profile
              </Link>
              {(user.role === 'COMPANY_ADMIN' || user.role === 'PLATFORM_ADMIN') && (
                <Link
                  to={`/companies/${user.companyId}/edit`}
                  className="block text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Edit Company Profile
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
