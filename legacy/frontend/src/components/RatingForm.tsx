import React, { useState } from 'react';
import { Button } from '../design-system/components/Button/Button';
import { Textarea } from '../design-system/components/Textarea/Textarea';
import { Card } from '../design-system/components/Card/Card';
import { Stack } from '../design-system/components/Stack/Stack';

interface RatingFormProps {
  bookingId?: string;
  hasDriver: boolean;
  onSubmit: (data: {
    companyStars: number;
    companyReview?: string;
    driverStars?: number;
    driverReview?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

const StarRating: React.FC<{
  value: number;
  onChange: (value: number) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium ds-text-gray-700">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
          >
            <svg
              className={`w-8 h-8 ${
                star <= (hover || value)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
};

export const RatingForm: React.FC<RatingFormProps> = ({
  hasDriver,
  onSubmit,
  onCancel,
}) => {
  const [companyStars, setCompanyStars] = useState(0);
  const [companyReview, setCompanyReview] = useState('');
  const [driverStars, setDriverStars] = useState(0);
  const [driverReview, setDriverReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (companyStars === 0) {
      setError('Please provide a company rating');
      return;
    }

    if (hasDriver && driverStars === 0) {
      setError('Please provide a driver rating');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        companyStars,
        companyReview: companyReview.trim() || undefined,
        driverStars: hasDriver ? driverStars : undefined,
        driverReview: hasDriver && driverReview.trim() ? driverReview : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card padding="lg">
        <Stack spacing={4}>
          <h3 className="text-lg font-semibold">Rate Your Experience</h3>

          {error && (
            <div className="p-3 ds-bg-error-light border ds-border-error rounded ds-text-error text-sm">
              {error}
            </div>
          )}

          {/* Company Rating */}
          <Stack spacing={4}>
            <StarRating
              value={companyStars}
              onChange={setCompanyStars}
              label="Company Rating *"
            />

            <Textarea
              label="Company Review (Optional)"
              value={companyReview}
              onChange={setCompanyReview}
              rows={4}
              placeholder="Share your experience with this company..."
            />
          </Stack>

          {/* Driver Rating (if applicable) */}
          {hasDriver && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <Stack spacing={4}>
                <StarRating
                  value={driverStars}
                  onChange={setDriverStars}
                  label="Driver Rating *"
                />

                <Textarea
                  label="Driver Review (Optional)"
                  value={driverReview}
                  onChange={setDriverReview}
                  rows={4}
                  placeholder="Share your experience with the driver..."
                />
              </Stack>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: '1.5rem' }}>
            <Stack direction="horizontal" spacing={3}>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
                fullWidth
              >
                Submit Rating
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
            </Stack>
          </div>
        </Stack>
      </Card>
    </form>
  );
};
