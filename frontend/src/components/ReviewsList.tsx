import React, { useState } from 'react';
import type { Rating } from '../types';

interface ReviewsListProps {
  reviews: Rating[];
  canRespond?: boolean;
  onRespond?: (ratingId: string, response: string) => Promise<void>;
}

const StarDisplay: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-5 h-5 ${
            star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

const ReviewItem: React.FC<{
  review: Rating;
  canRespond?: boolean;
  onRespond?: (ratingId: string, response: string) => Promise<void>;
}> = ({ review, canRespond, onRespond }) => {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRespond || !responseText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onRespond(review.id, responseText.trim());
      setShowResponseForm(false);
      setResponseText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0">
      {/* Company Review */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StarDisplay rating={review.companyStars} />
              <span className="text-sm text-gray-600">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
            {review.renterCompany && (
              <p className="text-sm text-gray-600">
                by {review.renterCompany.name}
              </p>
            )}
          </div>
        </div>
        {review.companyReview && (
          <p className="text-gray-700 mt-2">{review.companyReview}</p>
        )}
      </div>

      {/* Driver Review (if exists) */}
      {review.driverStars && (
        <div className="ml-4 pl-4 border-l-2 border-gray-200 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">Driver:</span>
            <StarDisplay rating={review.driverStars} />
          </div>
          {review.driverReview && (
            <p className="text-gray-700 mt-2">{review.driverReview}</p>
          )}
        </div>
      )}

      {/* Provider Response */}
      {review.providerResponse && (
        <div className="mt-4 ml-4 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded">
          <p className="text-sm font-medium text-gray-700 mb-1">
            Response from provider:
          </p>
          <p className="text-gray-700">{review.providerResponse}</p>
          {review.providerRespondedAt && (
            <p className="text-xs text-gray-500 mt-2">
              {new Date(review.providerRespondedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Response Form */}
      {canRespond && !review.providerResponse && (
        <div className="mt-4">
          {!showResponseForm ? (
            <button
              onClick={() => setShowResponseForm(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Respond to review
            </button>
          ) : (
            <form onSubmit={handleSubmitResponse} className="space-y-3">
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write your response..."
                disabled={isSubmitting}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !responseText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Response'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResponseForm(false);
                    setResponseText('');
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export const ReviewsList: React.FC<ReviewsListProps> = ({
  reviews,
  canRespond,
  onRespond,
}) => {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No reviews yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          canRespond={canRespond}
          onRespond={onRespond}
        />
      ))}
    </div>
  );
};
