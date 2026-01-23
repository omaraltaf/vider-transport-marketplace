# Design System Components

This directory contains the reusable UI components for the Vider Transport Marketplace design system.

## Component Hierarchy

### Atomic Components (Basic Building Blocks)
- **Button**: Primary interactive element with multiple variants
- **Input**: Text input with validation states
- **Textarea**: Multi-line text input with auto-resize
- **Select**: Dropdown selection with custom styling
- **Icon**: Wrapper for Lucide icons with consistent sizing

### Molecule Components (Simple Combinations)
- **Card**: Container for grouped content with elevation
- **FormField**: Unified form field combining Input/Textarea/Select with labels and error handling
- **SearchBar**: Search input with icon, clear button, and loading state

### Organism Components (Complex Components)
- **Modal**: Dialog component with overlay, focus trap, and animations
- **Table**: Responsive data table that transforms to cards on mobile
- **Navbar**: Navigation bar with mobile hamburger menu
- **Drawer**: Slide-in panel for mobile navigation

### Layout Components (Page Structure)
- **Container**: Max-width container with responsive padding
- **Grid**: CSS Grid layout with responsive columns
- **Stack**: Flexbox vertical/horizontal stacking with spacing

### Utility Components (Supporting UI Elements)
- **Badge**: Status and label indicators with color variants
- **Spinner**: Loading indicator with rotating animation
- **Skeleton**: Loading placeholder with shimmer animation

## Usage Examples

### Card Component

```tsx
import { Card } from '@/design-system/components';

// Basic card
<Card>
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</Card>

// Hoverable card with custom padding
<Card hoverable padding="lg">
  <p>This card has hover effects</p>
</Card>

// Clickable card
<Card onClick={() => console.log('clicked')}>
  <p>Click me!</p>
</Card>
```

### FormField Component

```tsx
import { FormField } from '@/design-system/components';
import { useState } from 'react';

function MyForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [country, setCountry] = useState('');

  return (
    <>
      {/* Text input */}
      <FormField
        type="email"
        label="Email Address"
        value={email}
        onChange={setEmail}
        required
        error={!email.includes('@') ? 'Invalid email' : undefined}
      />

      {/* Textarea */}
      <FormField
        type="textarea"
        label="Message"
        value={message}
        onChange={setMessage}
        autoResize
        helperText="Tell us about your needs"
      />

      {/* Select */}
      <FormField
        type="select"
        label="Country"
        value={country}
        onChange={setCountry}
        options={[
          { value: 'no', label: 'Norway' },
          { value: 'se', label: 'Sweden' },
          { value: 'dk', label: 'Denmark' },
        ]}
        placeholder="Select a country"
      />
    </>
  );
}
```

### SearchBar Component

```tsx
import { SearchBar } from '@/design-system/components';
import { useState } from 'react';

function SearchExample() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value) {
      setLoading(true);
      // Perform search...
      setTimeout(() => setLoading(false), 1000);
    }
  };

  return (
    <SearchBar
      value={query}
      onChange={handleSearch}
      onClear={() => console.log('Search cleared')}
      loading={loading}
      placeholder="Search vehicles or drivers..."
    />
  );
}
```

### Modal Component

```tsx
import { Modal, Button } from '@/design-system/components';
import { useState } from 'react';

function ModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
        size="md"
      >
        <p>Are you sure you want to proceed?</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Button variant="primary" onClick={() => setIsOpen(false)}>
            Confirm
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
```

### Table Component

```tsx
import { Table } from '@/design-system/components';
import { useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

function TableExample() {
  const [data, setData] = useState<User[]>([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
  ]);
  const [page, setPage] = useState(1);

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { 
      key: 'role', 
      header: 'Role',
      render: (row: User) => <span style={{ fontWeight: 'bold' }}>{row.role}</span>
    },
  ];

  return (
    <Table
      columns={columns}
      data={data}
      rowKey={(row) => row.id}
      pagination={{
        currentPage: page,
        totalPages: 5,
        onPageChange: setPage,
      }}
      onSort={(key, direction) => {
        console.log(`Sort by ${key} ${direction}`);
      }}
    />
  );
}
```

### Navbar Component

```tsx
import { Navbar, Button } from '@/design-system/components';

function NavbarExample() {
  return (
    <Navbar
      logo={<img src="/logo.svg" alt="Logo" height={32} />}
      rightContent={
        <>
          <Button variant="ghost" size="sm">Login</Button>
          <Button variant="primary" size="sm">Sign Up</Button>
        </>
      }
    >
      <Button variant="ghost" size="sm">Home</Button>
      <Button variant="ghost" size="sm">Vehicles</Button>
      <Button variant="ghost" size="sm">Drivers</Button>
      <Button variant="ghost" size="sm">About</Button>
    </Navbar>
  );
}
```

## Design Principles

1. **Consistency**: All components follow the same design tokens (colors, spacing, typography)
2. **Accessibility**: Components include proper ARIA labels, keyboard navigation, and focus management
3. **Responsiveness**: Components adapt to different screen sizes
4. **Composition**: Complex components are built from simpler ones
5. **Type Safety**: Full TypeScript support with comprehensive prop types

## Testing

All components include unit tests covering:
- Rendering with different props
- User interactions (clicks, typing, keyboard navigation)
- Accessibility features
- Edge cases and error states

Run tests with:
```bash
npm run test
```

### Badge Component

```tsx
import { Badge } from '@/design-system/components';

// Status badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="info">New</Badge>
<Badge variant="neutral">Draft</Badge>

// Different sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>
```

### Spinner Component

```tsx
import { Spinner } from '@/design-system/components';

// Basic spinner
<Spinner />

// Different sizes
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
<Spinner size="xl" />

// Different colors
<Spinner color="primary" />
<Spinner color="secondary" />
<Spinner color="white" />
<Spinner color="current" />

// In a button
<Button disabled>
  <Spinner size="sm" color="white" />
  Loading...
</Button>
```

### Skeleton Component

```tsx
import { Skeleton } from '@/design-system/components';

// Text skeleton (default)
<Skeleton />
<Skeleton />
<Skeleton />

// Circle skeleton (for avatars)
<Skeleton variant="circle" width={48} height={48} />

// Rectangle skeleton (for images/cards)
<Skeleton variant="rectangle" width="100%" height={200} />

// Custom dimensions
<Skeleton width="80%" height={20} />
<Skeleton width="60%" height={20} />
```

## Contributing

When adding new components:
1. Follow the existing patterns and structure
2. Include TypeScript types for all props
3. Add CSS Modules for styling
4. Write comprehensive unit tests
5. Update this README with usage examples
6. Export the component from `index.ts`
