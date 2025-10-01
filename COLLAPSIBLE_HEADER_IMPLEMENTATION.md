# Collapsible Header Implementation

## Overview

Implemented a collapsible header section for the werkbrief generator page to optimize table testing and improve page performance by making the table the primary focus.

## Changes Made

### 1. State Management

Added a new state variable to track the collapsed/expanded state:

```typescript
const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);
```

### 2. Toggle Handler

Created a memoized callback function to handle the collapse/expand toggle:

```typescript
const handleHeaderToggle = useCallback(() => {
  setIsHeaderCollapsed((prev) => !prev);
}, []);
```

### 3. UI Implementation

#### Collapsed State

When `isHeaderCollapsed` is `true`, the page displays:

- A centered, prominent "Expand Upload Section" button
- Chevron-down icon indicating expansion capability
- Blue background with hover effects for better UX

#### Expanded State

When `isHeaderCollapsed` is `false`, the page displays:

- Full Description component with text flip animation
- File upload section with PDF upload and generate button
- Upload progress bar
- Werkbrief progress (if streaming enabled)
- Error messages (if any)
- Collapse button (chevron-up icon) positioned at the top-right

## Features

### User Experience

- **One-Click Toggle**: Users can quickly collapse/expand the header section
- **Visual Feedback**:
  - Hover effects on buttons
  - Clear icons (chevron-down for expand, chevron-up for collapse)
  - Smooth transitions
- **Accessible**: Includes title attributes for better accessibility

### Performance Benefits

- **Reduced Initial Render**: When collapsed, fewer components are rendered
- **Table Focus**: Makes the table the main content for easier testing
- **Faster Navigation**: Less scrolling needed to reach table controls

### Design

- **Consistent Styling**: Matches the existing dark/light theme
- **Responsive Layout**: Works well on different screen sizes
- **Non-Intrusive**: Collapse button is subtle but accessible

## Usage

1. **Initial State**: Page loads with header expanded (default behavior)
2. **To Collapse**: Click the collapse button (chevron-up icon) in the top-right corner
3. **To Expand**: Click the "Expand Upload Section" button when collapsed

## Benefits for Testing

1. **Immediate Table Access**: Table is visible without scrolling
2. **Reduced Clutter**: Testing interface is cleaner
3. **Performance Testing**: Easier to focus on table performance metrics
4. **Quick Iterations**: Faster to test table features without regenerating content

## Technical Details

- **No Breaking Changes**: All existing functionality preserved
- **Backward Compatible**: Default expanded state maintains current behavior
- **Optimized**: Uses React.useCallback for performance
- **Type-Safe**: Full TypeScript support

## Future Enhancements

Potential improvements:

- Remember collapsed state in localStorage
- Add keyboard shortcut (e.g., Ctrl+H) to toggle
- Animate the collapse/expand transition
- Make default state configurable
