# Services Testing Guide

## Running Tests

The service tests require a PostgreSQL database to be set up and running. Tests will automatically skip if the database is not available.

### Database Setup for Testing

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-15
   sudo systemctl start postgresql
   ```

2. **Create the test database**:
   ```bash
   createdb vider_dev
   ```

3. **Update your `.env` file** with correct database credentials:
   ```env
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/vider_dev
   ```

4. **Run migrations**:
   ```bash
   npm run migrate
   ```

5. **Run tests**:
   ```bash
   npm test
   ```

### Property-Based Tests

The service tests include property-based tests using `fast-check` that verify correctness properties across many randomly generated inputs. Each property test runs 100 iterations by default.

#### Company Service Properties

- **Property 5: Profile update persistence** - Verifies that all updated fields are saved and retrievable
- **Property 6: Verification badge display** - Verifies that verified companies display the verification badge

### Test Isolation

Each test cleans up its data in the `afterEach` hook to ensure test isolation. Tests create their own test data and do not rely on seed data.

### Troubleshooting

If tests are skipping:
- Check that PostgreSQL is running
- Verify DATABASE_URL in `.env` is correct
- Ensure the database exists and migrations have been run
- Check database credentials are valid

If you see "Database not available" warnings, the tests will skip automatically. This is expected behavior when the database is not set up.
