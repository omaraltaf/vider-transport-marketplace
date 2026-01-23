import React, { useState } from 'react';
import type { Rating } from '../types';
import { Card } from '../design-system/components/Card/Card';
import { Stack } from '../design-system/components/Stack/Stack';
import { Button } from '../design-system/components/Button/Button';
import { Textarea } from '../design-system/components/Textarea/Textarea';

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
    <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }} className="last:border-b-0">
      <Stack spacing={4}>
        {/* Company Review */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StarDisplay rating={review.companyStars} />
                <span className="text-sm ds-text-gray-600">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.renterCompany && (
                <p className="text-sm ds-text-gray-600">
                  by {review.renterCompany.name}
                </p>
              )}
            </div>
          </div>
          {review.companyReview && (
            <p className="ds-text-gray-700 mt-2">{review.companyReview}</p>
          )}
        </div>

        {/* Driver Review (if exists) */}
        {review.driverStars && (
          <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium ds-text-gray-700">Driver:</span>
              <StarDisplay rating={review.driverStars} />
            </div>
            {review.driverReview && (
              <p className="ds-text-gray-700 mt-2">{review.driverReview}</p>
            )}
          </div>
        )}

        {/* Provider Response */}
        {review.providerResponse && (
          <Card padding="sm" style={{ marginLeft: '1rem', borderLeft: '2px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
            <Stack spacing={2}>
              <p className="text-sm font-medium ds-text-gray-700">
                Response from provider:
              </p>
              <p className="ds-text-gray-700">{review.providerResponse}</p>
              {review.providerRespondedAt && (
                <p className="text-xs ds-text-gray-500">
                  {new Date(review.providerRespondedAt).toLocaleDateString()}
                </p>
              )}
            </Stack>
          </Card>
        )}

        {/* Response Form */}
        {canRespond && !review.providerResponse && (
          <div>
            {!showResponseForm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResponseForm(true)}
              >
                Respond to review
              </Button>
            ) : (
              <form onSubmit={handleSubmitResponse}>
                <Stack spacing={3}>
                  {error && (
                    <div className="p-2 ds-bg-error-light border ds-border-error rounded ds-text-error text-sm">
                      {error}
                    </div>
                  )}
                  <Textarea
                    value={responseText}
                    onChange={setResponseText}
                    rows={3}
                    placeholder="Write your response..."
                    disabled={isSubmitting}
                  />
                  <Stack direction="horizontal" spacing={2}>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting || !responseText.trim()}
                      loading={isSubmitting}
                    >
                      Submit Response
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowResponseForm(false);
                        setResponseText('');
                        setError(null);
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Stack>
              </form>
            )}
          </div>
        )}
      </Stack>
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
      <div className="text-center py-8 ds-text-gray-500">
        No reviews yet
      </div>
    );
  }

  return (
    <Stack spacing={6}>
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          canRespond={canRespond}
          onRespond={onRespond}
        />
      ))}
    </Stack>
  );
};
