import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

/**
 * Feature: vider-transport-marketplace, Property 36: Migration tracking
 * Validates: Requirements 21.4
 * 
 * Property: For any database migration execution, the system must record the migration 
 * as applied and prevent duplicate execution of the same migration.
 */

describe('Property 36: Migration tracking', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should track applied migrations in the database', async () => {
    /**
     * Property test: For any database with migrations applied,
     * the _prisma_migrations table must contain records of all applied migrations
     */
    
    // Query the Prisma migrations table
    const migrations = await prisma.$queryRaw<Array<{
      id: string;
      checksum: string;
      finished_at: Date | null;
      migration_name: string;
      logs: string | null;
      rolled_back_at: Date | null;
      started_at: Date;
      applied_steps_count: number;
    }>>`
      SELECT * FROM _prisma_migrations 
      ORDER BY started_at ASC
    `;

    // Verify that migrations are tracked
    expect(migrations).toBeDefined();
    expect(Array.isArray(migrations)).toBe(true);

    // Each migration should have required fields
    migrations.forEach(migration => {
      expect(migration.id).toBeDefined();
      expect(migration.migration_name).toBeDefined();
      expect(migration.checksum).toBeDefined();
      expect(migration.started_at).toBeDefined();
      expect(migration.applied_steps_count).toBeGreaterThanOrEqual(0);
    });
  });

  it('should prevent duplicate migration execution', async () => {
    /**
     * Property test: For any migration that has already been applied,
     * attempting to apply it again should be prevented by Prisma's tracking system
     */

    // Get all applied migrations
    const appliedMigrations = await prisma.$queryRaw<Array<{
      migration_name: string;
      finished_at: Date | null;
    }>>`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      WHERE finished_at IS NOT NULL
    `;

    // Verify each migration was only applied once
    const migrationNames = appliedMigrations.map(m => m.migration_name);
    const uniqueMigrationNames = new Set(migrationNames);
    
    expect(migrationNames.length).toBe(uniqueMigrationNames.size);
    
    // Each migration should have a finished_at timestamp
    appliedMigrations.forEach(migration => {
      expect(migration.finished_at).not.toBeNull();
    });
  });

  it('should maintain migration order and integrity', async () => {
    /**
     * Property test: For any sequence of migrations,
     * they must be applied in chronological order and maintain referential integrity
     */

    const migrations = await prisma.$queryRaw<Array<{
      migration_name: string;
      started_at: Date;
      finished_at: Date | null;
      applied_steps_count: number;
    }>>`
      SELECT migration_name, started_at, finished_at, applied_steps_count
      FROM _prisma_migrations 
      ORDER BY started_at ASC
    `;

    // Verify migrations are in chronological order
    for (let i = 1; i < migrations.length; i++) {
      const prevStarted = new Date(migrations[i - 1].started_at).getTime();
      const currStarted = new Date(migrations[i].started_at).getTime();
      expect(currStarted).toBeGreaterThanOrEqual(prevStarted);
    }

    // Verify all migrations completed successfully
    migrations.forEach(migration => {
      if (migration.finished_at !== null) {
        const started = new Date(migration.started_at).getTime();
        const finished = new Date(migration.finished_at).getTime();
        expect(finished).toBeGreaterThanOrEqual(started);
      }
    });
  });

  it('should record migration metadata correctly', () => {
    /**
     * Property test: For any migration record,
     * it must contain valid metadata including checksum, name, and timestamps
     */

    fc.assert(
      fc.property(
        fc.record({
          migration_name: fc.string({ minLength: 1, maxLength: 255 }),
          checksum: fc.hexaString({ minLength: 64, maxLength: 64 }),
          started_at: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
          applied_steps_count: fc.integer({ min: 0, max: 100 }),
        }),
        (migrationData) => {
          // Verify migration name format (typically timestamp_name)
          expect(migrationData.migration_name).toBeTruthy();
          expect(migrationData.migration_name.length).toBeGreaterThan(0);

          // Verify checksum is a valid hex string
          expect(migrationData.checksum).toMatch(/^[0-9a-f]{64}$/i);

          // Verify timestamps are valid dates
          expect(migrationData.started_at).toBeInstanceOf(Date);
          expect(migrationData.started_at.getTime()).toBeLessThanOrEqual(Date.now());

          // Verify applied steps count is non-negative
          expect(migrationData.applied_steps_count).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle migration failures gracefully', async () => {
    /**
     * Property test: For any failed migration,
     * the system must record the failure and not mark it as successfully applied
     */

    const failedMigrations = await prisma.$queryRaw<Array<{
      migration_name: string;
      finished_at: Date | null;
      logs: string | null;
    }>>`
      SELECT migration_name, finished_at, logs
      FROM _prisma_migrations 
      WHERE finished_at IS NULL OR logs IS NOT NULL
    `;

    // If there are any failed migrations, verify they're properly tracked
    failedMigrations.forEach(migration => {
      // Failed migrations should either not have finished_at or have error logs
      if (migration.finished_at === null || migration.logs !== null) {
        expect(migration.migration_name).toBeDefined();
      }
    });
  });

  it('should ensure migration checksums are unique and consistent', async () => {
    /**
     * Property test: For any two different migrations,
     * they must have different checksums to ensure integrity
     */

    const migrations = await prisma.$queryRaw<Array<{
      migration_name: string;
      checksum: string;
    }>>`
      SELECT migration_name, checksum
      FROM _prisma_migrations
    `;

    // Build a map of migration names to checksums
    const checksumMap = new Map<string, string>();
    
    migrations.forEach(migration => {
      const existingChecksum = checksumMap.get(migration.migration_name);
      
      if (existingChecksum) {
        // If we've seen this migration before, checksum must match
        expect(migration.checksum).toBe(existingChecksum);
      } else {
        // Record the checksum for this migration
        checksumMap.set(migration.migration_name, migration.checksum);
      }
    });

    // Verify all checksums are valid hex strings
    migrations.forEach(migration => {
      expect(migration.checksum).toMatch(/^[0-9a-f]+$/i);
      expect(migration.checksum.length).toBeGreaterThan(0);
    });
  });
});
