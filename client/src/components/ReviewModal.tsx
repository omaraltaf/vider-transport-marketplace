import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { config } from '../config/config';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, booking }) => {
    const queryClient = useQueryClient();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [success, setSuccess] = useState(false);

    const reviewMutation = useMutation({
        mutationFn: async (reviewData: any) => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            return axios.post(`${config.api.baseUrl}/reviews`, reviewData, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            setSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setRating(0);
                setComment('');
            }, 2000);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return;

        reviewMutation.mutate({
            bookingId: booking.id,
            rating,
            comment
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={success ? 'Review Submitted!' : 'Leave a Review'}
        >
            {success ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                    <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                        <CheckCircle2 size={48} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold">Thank You!</h3>
                        <p className="text-slate-400">Your feedback helps the Vider community.</p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <p className="text-sm text-slate-400">How was your experience?</p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className="focus:outline-none transition-transform hover:scale-110"
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                        onClick={() => setRating(star)}
                                    >
                                        <Star
                                            size={32}
                                            className={`${star <= (hover || rating)
                                                ? 'fill-yellow-500 text-yellow-500'
                                                : 'text-slate-700'
                                                } transition-colors`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Your Feedback (Optional)</label>
                            <textarea
                                className="w-full h-32 bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-600"
                                placeholder="Share your experience working with this partner..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>
                    </div>

                    {reviewMutation.isError && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
                            <AlertCircle size={18} />
                            <p>{(reviewMutation.error as any)?.response?.data?.message || 'Error submitting review.'}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-12 text-lg"
                        disabled={rating === 0}
                        isLoading={reviewMutation.isPending}
                    >
                        Submit Review
                    </Button>
                </form>
            )}
        </Modal>
    );
};
