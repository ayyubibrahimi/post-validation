# UX Overhaul: Three-Column Layout with Carousels

**Created:** 2026-01-17
**Status:** Planning
**Priority:** High

---

## Overview

Complete UX redesign to improve information architecture, reduce clutter, and create a more professional, scannable interface inspired by the reference dashboard design.

---

## Design Goals

1. **Clear visual hierarchy** - Header, separators, and distinct sections
2. **Reduce visual clutter** - Carousels instead of long lists
3. **Logical flow** - Stats → Content → Actions (left to right)
4. **Efficient navigation** - Quick Next/Previous officer buttons
5. **Professional appearance** - Line separators, better spacing, consistent design

---

## New Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ POST Entity Resolution Validator                                │
├─────────────┬───────────────────────────────────────┬───────────┤
│             │                                       │           │
│  SIDEBAR    │          MAIN CONTENT                 │  ACTIONS  │
│  (Left)     │          (Scrollable)                 │  (Right)  │
│  240px      │          flex: 1                      │  280px    │
│             │                                       │           │
│ ┌─────────┐ │ ─────────────────────────────────── │ ┌────────┐│
│ │Progress │ │ Officer Header                        │ │Validate││
│ │Stats    │ │ - Input name                          │ │Actions ││
│ │         │ │ - Matched name + POST ID              │ │        ││
│ │+ Queue  │ │ - Match probability badge             │ │[Notes] ││
│ │Status   │ │ - Matched agency                      │ │        ││
│ │Combined │ │ ─────────────────────────────────── │ │[✓ Conf]││
│ └─────────┘ │                                       │ │[✗ Rej] ││
│             │ ─────────────────────────────────── │ │[👁 Rev]││
│ ┌─────────┐ │ Matched Employment History            │ └────────┘│
│ │  Next   │ │ (Full table - always visible)         │           │
│ │ Officer │ │ ─────────────────────────────────── │           │
│ │         │ │                                       │           │
│ │ [Auto   │ │ ─────────────────────────────────── │           │
│ │Release &│ │ Other Officers with Same Name         │           │
│ │  Claim] │ │ Carousel: [< Officer 1 of 3 >]        │           │
│ └─────────┘ │ - Current officer card visible        │           │
│             │ - Prev/Next arrows to cycle           │           │
│             │ ─────────────────────────────────── │           │
│             │                                       │           │
│             │ ─────────────────────────────────── │           │
│             │ Citations                             │           │
│             │ Carousel: [< Citation 1 of 5 >]       │           │
│             │ - Current citation card visible       │           │
│             │ - Prev/Next arrows to cycle           │           │
│             │ ─────────────────────────────────── │           │
└─────────────┴───────────────────────────────────────┴───────────┘
```

---

## Task Breakdown

### Phase 1: Layout Infrastructure ✅ **COMPLETE**

#### 1.1 Create Header Component ✅
- [x] Create `components/AppHeader.tsx`
- [x] Add "POST Entity Resolution Validator" title
- [x] Style with bottom border separator
- [x] Add to dashboard layout

**Acceptance Criteria:** ✅
- Header spans full width
- Clear visual separation from content below
- Title is prominent and professional

---

#### 1.2 Create Three-Column Layout ✅
- [x] Update `components/DashboardLayout.tsx`
- [x] Implement three-column grid:
  - Left sidebar: 240px fixed
  - Main content: flex: 1 (scrollable)
  - Right sidebar: 280px fixed
- [x] Add proper gap spacing (24px)
- [x] Ensure responsive behavior

**Acceptance Criteria:** ✅
- Three distinct vertical columns
- Main content scrolls independently
- Sidebars remain fixed height
- Layout doesn't break on smaller screens

---

### Phase 2: Left Sidebar - Stats & Navigation ✅ **COMPLETE**

#### 2.1 Combine Progress + Queue into Sidebar ✅
- [x] Create new `components/LeftSidebar.tsx`
- [x] Integrate ProgressStats component
- [x] Integrate QueueStatus component (simplified)
- [x] Style with consistent card design
- [x] Add separator between sections

**Acceptance Criteria:** ✅
- Stats and queue in single sidebar
- Visual separator between sections
- Consistent padding and spacing
- Matches reference design quality

---

#### 2.2 Add "Next Officer" Navigation Button ✅
- [x] Add "Next Officer" button to left sidebar
- [x] Implement auto-release + claim logic:
  ```typescript
  const handleNextOfficer = async () => {
    // 1. Release current officer (if any)
    // 2. Claim next available officer
    // 3. Update URL and UI
  }
  ```
- [x] Show loading state during transition
- [x] Disable button when no officers available
- [x] Add success/error toast notifications

**Acceptance Criteria:** ✅
- Button releases current officer automatically
- Atomically claims next officer
- Smooth transition between officers
- Clear loading and error states
- Toast shows "Moved to next officer"

---

### Phase 3: Main Content - Carousels ✅ **COMPLETE**

#### 3.1 Create Carousel Component ✅
- [x] Create reusable `components/Carousel.tsx`
- [x] Props: `items`, `renderItem`, `emptyState`
- [x] Features:
  - Previous/Next arrow buttons
  - Current index display (e.g., "2 of 5")
  - Keyboard navigation (arrow keys)
  - Smooth transitions
- [x] Style to match reference design
- [x] Add disable state when only 1 item

**Acceptance Criteria:** ✅
- Reusable for both officers and citations
- Clean arrow button design
- Counter shows current/total
- Smooth fade/slide transitions
- Works with keyboard

---

#### 3.2 Implement Other Officers Carousel ✅
- [x] Update OfficerDetail component
- [x] Replace officer list with Carousel
- [x] Render one officer card at a time
- [x] Style officer card to match employment table
- [x] Show employment history for current carousel officer
- [x] Add empty state: "No other officers found"

**Acceptance Criteria:** ✅
- Shows one officer at a time
- Can cycle through all officers
- Employment history visible per officer
- Clear visual design
- Empty state for no conflicts

---

#### 3.3 Implement Citations Carousel ✅
- [x] Update OfficerDetail component
- [x] Replace citations list with Carousel
- [x] Render one CitationCard at a time
- [x] Keep existing CitationCard component
- [x] Add empty state: "No citations found"

**Acceptance Criteria:** ✅
- Shows one citation at a time
- Can cycle through all citations
- Maintains existing citation card styling
- Counter shows "Citation X of Y"
- Empty state with warning

---

### Phase 4: Right Sidebar - Validation Actions ✅ **COMPLETE**

#### 4.1 Create Right Sidebar Component ✅
- [x] Create `components/RightSidebar.tsx`
- [x] Move validation actions from bottom to sidebar
- [x] Stack buttons vertically
- [x] Make buttons full-width
- [x] Add section title: "Validation Decision"

**Acceptance Criteria:** ✅
- Fixed 280px width
- Buttons stacked vertically
- Full-width buttons
- Sticky positioning (stays visible on scroll)
- Maintains current button functionality

---

#### 4.2 Improve Validation Action Buttons ✅
- [x] Make buttons larger (full-width, more padding)
- [x] Improve icon placement
- [x] Add hover effects
- [x] Ensure colors match (green/red/yellow)
- [x] Keep confirmation dialog logic

**Acceptance Criteria:** ✅
- Buttons are prominent and easy to click
- Icons aligned properly
- Colors match status semantics
- Hover states feel responsive
- Dialog still works

---

### Phase 5: Visual Polish ✅ **COMPLETE**

#### 5.1 Add Line Separators ✅
- [x] Add horizontal line separators between:
  - Header and content
  - Officer header and employment
  - Employment and other officers carousel
  - Other officers and citations carousel
- [x] Style: 1px solid var(--border-subtle)
- [x] Add consistent spacing above/below lines

**Acceptance Criteria:** ✅
- Clear visual separation between sections
- Consistent line styling throughout
- Proper spacing (24px above/below)
- Matches reference design

---

#### 5.2 Improve Card Spacing and Borders ✅
- [x] Increase card padding to 32px (--spacing-2xl)
- [x] Use --border-medium instead of --border-subtle
- [x] Add --shadow-md to cards
- [x] Ensure consistent border-radius (--radius-lg)

**Acceptance Criteria:** ✅
- Cards feel more spacious
- Borders are more visible
- Shadows add depth
- Consistent radius throughout

---

#### 5.3 Typography and Hierarchy ✅
- [x] Section titles: uppercase, letter-spacing, border-bottom
- [x] Consistent label styling (12px, uppercase, muted)
- [x] Improve data display (larger, more prominent)
- [x] Add line-height for better readability

**Acceptance Criteria:** ✅
- Clear visual hierarchy
- Titles stand out
- Data is easy to read
- Professional typography

---

### Phase 6: Testing and Refinement

#### 6.1 Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Verify scrolling behavior
- [ ] Check responsive behavior

---

#### 6.2 User Flow Testing
- [ ] Test: Claim officer → Review → Next Officer
- [ ] Test: Navigate through other officers carousel
- [ ] Test: Navigate through citations carousel
- [ ] Test: Validate officer (all three statuses)
- [ ] Test: Next Officer when queue empty

---

#### 6.3 Performance Verification
- [ ] Check carousel transition smoothness
- [ ] Verify no layout shifts
- [ ] Test with many citations (20+)
- [ ] Test with many other officers (10+)
- [ ] Ensure React Query cache works correctly

---

## Technical Implementation Details

### API/Hook Changes Required

**None required** - All existing hooks remain the same:
- `useClaimOfficer` - Already works
- `useReleaseOfficer` - Already works
- `useOfficerDetail` - Already works
- `useValidateOfficer` - Already works

### New Components to Create

1. **AppHeader.tsx** - Application title header
2. **LeftSidebar.tsx** - Combined stats + queue + next button
3. **RightSidebar.tsx** - Validation actions
4. **Carousel.tsx** - Reusable carousel component

### Components to Update

1. **DashboardLayout.tsx** - Change from 2-column to 3-column
2. **DashboardContent.tsx** - Integrate new layout
3. **OfficerDetail.tsx** - Add carousels, remove bottom actions
4. **ProgressStats.tsx** - Minor styling updates (optional)
5. **QueueStatus.tsx** - Simplify for sidebar (optional)

### New State Management

**Carousel state** (local component state):
```typescript
const [currentOfficerIndex, setCurrentOfficerIndex] = useState(0);
const [currentCitationIndex, setCurrentCitationIndex] = useState(0);
```

**Next Officer logic** (combining existing hooks):
```typescript
const handleNextOfficer = async () => {
  if (currentOfficer) {
    await releaseOfficer.mutateAsync({
      mentionUid: currentOfficer.mention_uid,
      validatorId
    });
  }

  const result = await claimOfficer.mutateAsync({ validatorId });

  if (result.officer) {
    router.push(`/dashboard?officer=${result.officer.mention_uid}`);
    toast.success('Moved to next officer');
  }
};
```

---

## Design Specifications

### Colors
- Section separators: `var(--border-subtle)` (#2a2a2a)
- Card borders: `var(--border-medium)` (#333333)
- Action buttons: Keep existing (green/red/yellow)

### Spacing
- Between sections: `var(--spacing-2xl)` (32px)
- Card padding: `var(--spacing-2xl)` (32px)
- Column gaps: `var(--spacing-xl)` (24px)

### Typography
- Section titles: 16px, 600 weight, uppercase, 0.5px letter-spacing
- Labels: 12px, 600 weight, uppercase, muted color
- Data: 15-16px, normal weight, primary color

### Carousel
- Arrow buttons: 36px × 36px
- Counter: 13px, muted color
- Gap between arrows and content: 16px

---

## Future Enhancements (Post-MVP)

- [ ] Previous Officer button (with history tracking)
- [ ] Keyboard shortcuts (N = next, P = previous)
- [ ] Carousel thumbnails/previews
- [ ] Swipe gestures for mobile
- [ ] Animated transitions between officers
- [ ] Officer comparison view (side-by-side)

---

## Success Metrics

- Reduced time to validate officer (faster scanning)
- Improved user satisfaction (cleaner interface)
- Fewer validation errors (better information architecture)
- Easier onboarding for new validators

---

## Notes

- Keep all existing functionality intact
- Maintain type safety throughout
- Ensure accessibility (keyboard navigation, ARIA labels)
- Test with real data (officers with 0, 1, 5, 20+ citations)
- Get user feedback after implementation

---

**Questions/Decisions:**

1. ✅ Should "Next Officer" auto-release current? → **Yes**
2. ✅ Track officer history for "Previous"? → **No (future)**
3. ✅ Carousel thumbnails or just arrows? → **Just arrows + counter**
4. ❓ Should right sidebar be sticky/fixed position?
5. ❓ Should we add tooltips to action buttons?
6. ❓ Animation speed for carousel transitions?

---

**Last Updated:** 2026-01-17
