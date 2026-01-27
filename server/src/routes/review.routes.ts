import { Router, Response } from 'express';
import { BookingStatus } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import prisma from '../config/database.js';

const router = Router();

// Create a review
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const userCompanyId = req.user?.companyId;
    if (!userCompanyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
        return res.status(400).json({ message: 'Booking ID and rating are required' });
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { reviews: true }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Only COMPLETED, CANCELLED, or REJECTED bookings can be reviewed
        const reviewableStatuses: string[] = [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REJECTED];
        if (!reviewableStatuses.includes(booking.status)) {
            return res.status(400).json({ message: 'Can only review completed, cancelled, or rejected bookings' });
        }

        // Check if the user's company is either the requester or provider
        const isRequester = booking.requesterId === userCompanyId;
        const isProvider = booking.providerId === userCompanyId;

        if (!isRequester && !isProvider) {
            return res.status(403).json({ message: 'Not authorized to review this booking' });
        }

        // Check if this company already reviewed this booking
        const existingReview = booking.reviews.find(r => r.reviewerId === userCompanyId);
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this booking' });
        }

        const revieweeId = isRequester ? booking.providerId : booking.requesterId;

        const review = await prisma.review.create({
            data: {
                bookingId,
                reviewerId: userCompanyId,
                revieweeId,
                rating: parseInt(rating),
                comment: comment || ''
            }
        });

        res.status(201).json(review);
    } catch (error: any) {
        console.error('Create Review Error:', error);
        res.status(500).json({ message: 'Error creating review', error: error.message });
    }
});

// Get reviews received by a company
router.get('/company/:companyId', async (req, res) => {
    const { companyId } = req.params;

    try {
        const reviews = await prisma.review.findMany({
            where: { revieweeId: companyId },
            include: {
                reviewer: {
                    select: { name: true }
                },
                booking: {
                    select: {
                        vehicle: { select: { make: true, model: true } },
                        shipment: { select: { title: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(reviews);
    } catch (error: any) {
        console.error('Get Company Reviews Error:', error);
        res.status(500).json({ message: 'Error fetching reviews' });
    }
});

export default router;
