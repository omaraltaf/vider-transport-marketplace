import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { Badge } from '../../design-system/components/Badge';
import { Modal } from '../../design-system/components/Modal';
import { apiClient } from '../../services/api';
import type { AvailabilityBlock } from './BlockForm';
import styles from './BlockList.module.css';

export interface BlockListProps {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  onBlockDeleted?: (blockId: string) => void;
  refreshTrigger?: number;
  className?: string;
}

export const BlockList: React.FC<BlockListProps> = ({
  listingId,
  listingType,
  onBlockDeleted,
  refreshTrigger = 0,
  className = '',
}) => {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<AvailabilityBlock | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchBlocks();
  }, [listingId, listingType, refreshTrigger]);

  const fetchBlocks = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await apiClient.get<AvailabilityBlock[]>(
        `/availability/blocks/${listingId}?listingType=${listingType}`,
        token
      );

      // The API returns an array directly, so response should be the blocks array
      const blocks = Array.isArray(response) ? response : [];
      
      // Sort blocks by start date (most recent first)
      const sortedBlocks = blocks.sort((a, b) => {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });

      setBlocks(sortedBlocks);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load availability blocks');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (block: AvailabilityBlock) => {
    setBlockToDelete(block);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!blockToDelete) return;

    setDeletingBlockId(blockToDelete.id);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      await apiClient.delete(`/availability/blocks/${blockToDelete.id}`, token);

      // Remove the block from the list
      setBlocks((prevBlocks) =>
        prevBlocks.filter((block) => block.id !== blockToDelete.id)
      );

      if (onBlockDeleted) {
        onBlockDeleted(blockToDelete.id);
      }

      setShowDeleteModal(false);
      setBlockToDelete(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete availability block');
      }
    } finally {
      setDeletingBlockId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setBlockToDelete(null);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    if (start === end) {
      return start;
    }
    
    return `${start} - ${end}`;
  };

  const isBlockInPast = (endDate: string): boolean => {
    return new Date(endDate) < new Date();
  };

  if (loading) {
    return (
      <Card className={`${styles.blockList} ${className}`} padding="lg">
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading availability blocks...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${styles.blockList} ${className}`} padding="lg">
        <div className={styles.error} role="alert">
          <AlertCircle size={24} />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchBlocks}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (blocks.length === 0) {
    return (
      <Card className={`${styles.blockList} ${className}`} padding="lg">
        <div className={styles.empty}>
          <Calendar size={48} className={styles.emptyIcon} />
          <h3>No Blocked Dates</h3>
          <p>You haven't blocked any dates for this listing yet.</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={`${styles.blockList} ${className}`} padding="lg">
        <h3 className={styles.title}>Blocked Dates</h3>
        <p className={styles.description}>
          Manage your unavailable dates. Past blocks are shown for reference.
        </p>

        <div className={styles.list}>
          {blocks.map((block) => {
            const isPast = isBlockInPast(block.endDate);
            
            return (
              <div
                key={block.id}
                className={`${styles.blockItem} ${isPast ? styles.pastBlock : ''}`}
              >
                <div className={styles.blockInfo}>
                  <div className={styles.blockHeader}>
                    <span className={styles.dateRange}>
                      {formatDateRange(block.startDate, block.endDate)}
                    </span>
                    {isPast && (
                      <Badge variant="neutral" size="sm">
                        Past
                      </Badge>
                    )}
                    {block.isRecurring && (
                      <Badge variant="info" size="sm">
                        Recurring
                      </Badge>
                    )}
                  </div>
                  
                  {block.reason && (
                    <p className={styles.reason}>{block.reason}</p>
                  )}
                  
                  <p className={styles.metadata}>
                    Created {formatDate(block.createdAt)}
                  </p>
                </div>

                <div className={styles.blockActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(block)}
                    disabled={deletingBlockId === block.id}
                    aria-label={`Delete block for ${formatDateRange(
                      block.startDate,
                      block.endDate
                    )}`}
                    leftIcon={<Trash2 size={16} />}
                  >
                    {deletingBlockId === block.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        title="Delete Availability Block"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Are you sure you want to delete the block for{' '}
            <strong>
              {blockToDelete &&
                formatDateRange(blockToDelete.startDate, blockToDelete.endDate)}
            </strong>
            ?
          </p>
          
          {blockToDelete?.reason && (
            <p className={styles.deleteReason}>
              Reason: <em>{blockToDelete.reason}</em>
            </p>
          )}
          
          <p className={styles.deleteWarning}>
            This action cannot be undone. The dates will become available for
            booking again.
          </p>

          <div className={styles.deleteActions}>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={deletingBlockId !== null}
            >
              Delete Block
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

BlockList.displayName = 'BlockList';
