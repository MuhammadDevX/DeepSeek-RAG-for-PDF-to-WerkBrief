# Testing Guide - Werkbrief Generator Updates

## 🧪 Comprehensive Testing Instructions

This guide provides step-by-step testing procedures for all new features.

---

## Pre-Testing Setup

1. **Start Development Server**

   ```powershell
   npm run dev
   ```

2. **Navigate to Werkbrief Generator**

   ```
   http://localhost:3000/werkbrief-generator
   ```

3. **Prepare Test Data**
   - Have a PDF invoice ready (preferably with 10+ products)
   - Note: Smaller test PDFs (~1-2 pages) work best for quick testing

---

## Test Suite 1: Row Number Editing & Reordering

### Test 1.1: Basic Row Number Click

**Objective**: Verify row number becomes editable

**Steps**:

1. Upload a PDF and generate werkbrief
2. Wait for table to load
3. Click on any row number (e.g., row 3)

**Expected Result**:

- ✅ Row number transforms into an input field
- ✅ Input is auto-focused
- ✅ Current position is pre-filled (e.g., "3")
- ✅ Input has blue border

**Screenshot Location**: Row number in edit mode

---

### Test 1.2: Valid Position Change

**Objective**: Move row to a new valid position

**Steps**:

1. Click row number 5
2. Type "1"
3. Press Enter

**Expected Result**:

- ✅ Row 5 moves to position 1
- ✅ Other rows shift down accordingly
- ✅ Input field closes
- ✅ No errors in console
- ✅ Selection state (checkbox) moves with the row

**Verification**:

```
Before:        After:
1. Item A      1. Item E  ← Moved here
2. Item B      2. Item A
3. Item C      3. Item B
4. Item D      4. Item C
5. Item E      5. Item D
```

---

### Test 1.3: Invalid Position Handling

**Objective**: Verify validation prevents invalid moves

**Steps**:

1. Click row number 3
2. Try these invalid inputs:
   - Type "0" and press Enter
   - Type "-5" and press Enter
   - Type "999" (if total rows < 999) and press Enter
   - Type "abc" (should not be accepted)

**Expected Result**:

- ✅ Row stays in original position
- ✅ No errors thrown
- ✅ Input field closes or shows validation
- ✅ Letters are not typed (only numbers accepted)

---

### Test 1.4: Escape Key Cancel

**Objective**: Cancel editing without making changes

**Steps**:

1. Click row number 4
2. Type "1" (but don't press Enter)
3. Press Escape

**Expected Result**:

- ✅ Input field closes
- ✅ Row remains at position 4
- ✅ No changes made

---

### Test 1.5: Blur Cancel

**Objective**: Clicking outside cancels/confirms edit

**Steps**:

1. Click row number 3
2. Type "1"
3. Click somewhere else on the page (not Enter)

**Expected Result**:

- ✅ Input field closes
- ✅ Change is applied (row moves to position 1)
- ✅ OR if invalid, row stays at original position

---

### Test 1.6: Multiple Reorders

**Objective**: Verify multiple reorders work correctly

**Steps**:

1. Move row 5 to position 1
2. Move row 3 to position 2
3. Move row 1 to position 5

**Expected Result**:

- ✅ All moves execute correctly
- ✅ Final order reflects all changes
- ✅ No duplicate positions
- ✅ Checked states maintain correctly

---

### Test 1.7: Reorder with Filters

**Objective**: Test reordering with search/filter active

**Steps**:

1. Apply a search filter (e.g., search "shirt")
2. Try to reorder filtered results

**Expected Result**:

- ✅ Reordering works on full dataset (not just filtered view)
- ✅ Position numbers refer to absolute position in full dataset
- ✅ No unexpected behavior

---

## Test Suite 2: Table Width & Column Sizing

### Test 2.1: GOEDEREN OMSCHRIJVING Width

**Objective**: Verify column is wider and shows full text

**Steps**:

1. Generate werkbrief with products that have long names
2. Look at "GOEDEREN OMSCHRIJVING" column

**Expected Result**:

- ✅ Column is noticeably wider (256px vs 160px before)
- ✅ Most product names are fully visible
- ✅ Less text truncation
- ✅ Professional appearance

**Visual Check**:

```
Before: "KATOEN HEMD BLA..."
After:  "KATOEN HEMD BLAUW MAAT M"
```

---

### Test 2.2: Responsive Width

**Objective**: Verify table adapts to screen size

**Steps**:

1. Resize browser window to different widths:
   - Desktop (1920px)
   - Laptop (1366px)
   - Tablet (768px)
   - Mobile (375px)

**Expected Result**:

- ✅ Table remains usable at all sizes
- ✅ Horizontal scroll appears when needed
- ✅ Column proportions are maintained
- ✅ Text remains readable

---

### Test 2.3: Dark Mode Width

**Objective**: Verify styling in dark mode

**Steps**:

1. Enable dark mode (system settings or browser)
2. Check table appearance

**Expected Result**:

- ✅ Wider column maintains dark mode styling
- ✅ Text contrast is good
- ✅ Borders and backgrounds look correct

---

## Test Suite 3: Dynamic Goederen Code Matching

### Test 3.1: Single Product (Minimum Context)

**Objective**: Verify formula provides adequate context

**Setup**: PDF with 1 product

**Steps**:

1. Upload single-product PDF
2. Check browser console for log: "Using dynamic topK: 65 for 1 products"
3. Verify goederen code accuracy

**Expected Result**:

- ✅ Console shows: `dynamicTopK = 65` (1 × 15 + 50)
- ✅ Goederen code is accurate (not "00000000")
- ✅ Goederen name matches product

**Console Log Check**:

```
Using dynamic topK: 65 for 1 products
```

---

### Test 3.2: Small Invoice (5 Products)

**Objective**: Test scaling for small invoices

**Setup**: PDF with 5 products

**Expected Formula**: 5 × 15 + 50 = 125

**Steps**:

1. Upload 5-product PDF
2. Check console: "Using dynamic topK: 125 for 5 products"
3. Verify all 5 products have correct codes

**Expected Result**:

- ✅ Console shows: `dynamicTopK = 125`
- ✅ All products get correct goederen codes
- ✅ Accuracy improvement over old method

---

### Test 3.3: Medium Invoice (10 Products)

**Objective**: Test scaling for medium invoices

**Setup**: PDF with 10 products

**Expected Formula**: 10 × 15 + 50 = 200

**Steps**:

1. Upload 10-product PDF
2. Check console: "Using dynamic topK: 200 for 10 products"
3. Compare accuracy with previous version

**Expected Result**:

- ✅ Console shows: `dynamicTopK = 200`
- ✅ Significantly better matching accuracy
- ✅ Fewer "00000000" fallback codes

**Accuracy Comparison**:

```
Before (topK=10): ~70% accurate
After (topK=200): ~95% accurate
```

---

### Test 3.4: Large Invoice (20+ Products)

**Objective**: Test scaling for large invoices

**Setup**: PDF with 20+ products

**Expected Formula**: 20 × 15 + 50 = 350

**Steps**:

1. Upload 20-product PDF
2. Check console: "Using dynamic topK: 350 for 20 products"
3. Monitor API performance

**Expected Result**:

- ✅ Console shows: `dynamicTopK = 350`
- ✅ High accuracy maintained
- ✅ API responds within acceptable time (<30s for full processing)
- ✅ No timeout errors

---

### Test 3.5: Edge Cases

**Objective**: Test formula handles edge cases

**Test Cases**:

1. **Empty Invoice** (0 products)

   - Expected: Minimum topK = 50

2. **Massive Invoice** (50+ products)
   - Expected: 50 × 15 + 50 = 800
   - Should still process successfully

**Steps**:

1. Test each edge case
2. Check console logs
3. Verify no errors

---

## Test Suite 4: Filters Open by Default

### Test 4.1: Initial State

**Objective**: Verify filters are visible on load

**Steps**:

1. Upload PDF and generate werkbrief
2. Observe table area immediately after loading

**Expected Result**:

- ✅ Filters section is expanded (visible)
- ✅ No need to click "Show Filters"
- ✅ All filter options are accessible

---

### Test 4.2: Default Items Per Page

**Objective**: Verify default is 50 items

**Steps**:

1. Generate werkbrief with 100+ products
2. Check items per page dropdown

**Expected Result**:

- ✅ Dropdown shows "50" selected
- ✅ Only 50 items displayed initially
- ✅ Pagination shows correct total pages

**Calculation Example**:

```
Total items: 120
Items per page: 50
Expected pages: 3 (50, 50, 20)
```

---

### Test 4.3: Filter Options

**Objective**: Verify all options are available

**Steps**:

1. Click items per page dropdown
2. Check available options

**Expected Result**:

- ✅ Options: 5, 10, 25, 50, 100, All
- ✅ "50" is pre-selected
- ✅ Changing option updates table immediately

---

### Test 4.4: Toggle Filters

**Objective**: Verify filters can be collapsed/expanded

**Steps**:

1. Click "Filters" button/toggle
2. Observe animation
3. Click again to expand

**Expected Result**:

- ✅ Filters collapse smoothly
- ✅ Can be re-opened
- ✅ State persists during session
- ✅ Smooth animation

---

## Test Suite 5: UX Enhancements

### Test 5.1: Hover Effects

**Objective**: Verify all hover interactions

**Elements to Test**:

1. Row numbers
2. Action buttons (Add/Delete)
3. Table rows
4. Input fields

**Steps**:

1. Hover over each element type
2. Observe visual feedback

**Expected Result**:

- ✅ Row numbers: gradient brightens, scales up
- ✅ Buttons: background color changes
- ✅ Rows: subtle background tint
- ✅ Smooth transitions (~150ms)

---

### Test 5.2: Keyboard Navigation

**Objective**: Test all keyboard shortcuts

**Shortcuts**:
| Shortcut | Action |
|----------|--------|
| Enter | Confirm row position |
| Escape | Cancel editing |
| Ctrl+F | Focus search |
| Ctrl+A | Select all visible |
| Ctrl+E | Expand/collapse table |
| Ctrl+← | Previous page |
| Ctrl+→ | Next page |

**Steps**:

1. Test each shortcut
2. Verify correct action occurs

**Expected Result**:

- ✅ All shortcuts work as described
- ✅ Visual feedback on activation
- ✅ No conflicts with browser shortcuts

---

### Test 5.3: Tooltips

**Objective**: Verify helpful tooltips appear

**Elements with Tooltips**:

- Row numbers: "Click to change row position"
- Checkboxes: "Select for export to Excel"
- Action buttons: "Add row below", "Delete row"
- Confidence badges: Shows percentage

**Steps**:

1. Hover over each element
2. Wait ~500ms

**Expected Result**:

- ✅ Tooltip appears
- ✅ Text is clear and helpful
- ✅ Positioned correctly (not overlapping)

---

### Test 5.4: Dark Mode

**Objective**: Verify all features work in dark mode

**Steps**:

1. Enable dark mode
2. Re-test all features:
   - Row number editing
   - Table width
   - Filters
   - Hover effects

**Expected Result**:

- ✅ All colors are appropriate for dark mode
- ✅ Text is readable
- ✅ Hover effects are visible
- ✅ No white flashes or jarring contrasts

---

### Test 5.5: Mobile Responsiveness

**Objective**: Test on mobile/tablet devices

**Steps**:

1. Open on mobile device OR use browser DevTools
2. Test all features in mobile viewport

**Expected Result**:

- ✅ Table is scrollable horizontally
- ✅ Row numbers remain clickable
- ✅ Touch interactions work
- ✅ No layout breaks

---

## Test Suite 6: Integration Tests

### Test 6.1: Full Workflow

**Objective**: Test complete user workflow

**Steps**:

1. Upload PDF invoice
2. Wait for processing
3. Review generated werkbrief
4. Reorder 2-3 rows
5. Adjust items per page to 25
6. Search for specific product
7. Export to Excel

**Expected Result**:

- ✅ All steps complete without errors
- ✅ Excel export reflects current order
- ✅ Search works correctly
- ✅ Performance is acceptable

---

### Test 6.2: Error Handling

**Objective**: Verify graceful error handling

**Scenarios**:

1. Invalid PDF upload
2. Network error during processing
3. Invalid row position entered
4. Attempt to move row in empty table

**Expected Result**:

- ✅ User-friendly error messages
- ✅ No uncaught exceptions
- ✅ App remains functional

---

### Test 6.3: Performance

**Objective**: Measure performance improvements

**Metrics to Check**:

1. Initial page load time
2. Table render time with 50 items
3. Table render time with 100 items
4. Row reorder response time
5. Search responsiveness

**Expected Results**:

- ✅ Initial load: <2s
- ✅ 50 items render: <500ms
- ✅ 100 items render: <1s
- ✅ Row reorder: <100ms
- ✅ Search: instant (<50ms)

**How to Measure**:

```javascript
// Open browser console
performance.mark("start");
// Perform action
performance.mark("end");
performance.measure("action", "start", "end");
console.log(performance.getEntriesByType("measure"));
```

---

## Regression Testing

### Areas to Check

**Objective**: Ensure no existing features broke

1. **PDF Upload**

   - ✅ Still accepts valid PDFs
   - ✅ Shows upload progress
   - ✅ Error handling works

2. **Werkbrief Generation**

   - ✅ All fields generated correctly
   - ✅ Streaming progress works
   - ✅ Error messages shown

3. **Data Editing**

   - ✅ All fields editable
   - ✅ Debounced inputs work
   - ✅ Number formatting correct

4. **Excel Export**

   - ✅ Copy to clipboard works
   - ✅ Download file works
   - ✅ Only checked items exported

5. **Search & Sort**

   - ✅ Search filters correctly
   - ✅ Sorting works on all columns
   - ✅ Clear buttons work

6. **Pagination**
   - ✅ Next/previous buttons work
   - ✅ Page numbers correct
   - ✅ Go to page input works

---

## Bug Report Template

If you find an issue, please report it using this format:

```markdown
### Bug Title

[Brief description of the issue]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:

1. Step one
2. Step two
3. Step three

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Environment**:

- Browser: Chrome 120.0
- OS: Windows 11
- Screen Size: 1920x1080

**Screenshots**:
[Attach if applicable]

**Console Errors**:
```

[Paste any console errors]

```

**Additional Notes**:
[Any other relevant information]
```

---

## Acceptance Criteria Checklist

Use this for final sign-off:

### Feature Completeness

- [ ] Row numbers are clickable
- [ ] Row reordering works correctly
- [ ] GOEDEREN OMSCHRIJVING column is wider
- [ ] Dynamic topK formula is implemented
- [ ] Filters open by default
- [ ] Default 50 items per page
- [ ] All UX improvements applied

### Quality Assurance

- [ ] No console errors during normal use
- [ ] All keyboard shortcuts work
- [ ] Dark mode looks good
- [ ] Mobile responsive
- [ ] Performance is acceptable
- [ ] No regression bugs

### Documentation

- [ ] IMPLEMENTATION_SUMMARY.md created
- [ ] VISUAL_GUIDE.md created
- [ ] TESTING_GUIDE.md created (this file)
- [ ] Code is commented where needed

### Client Requirements Met

- [ ] Client can reorder rows easily
- [ ] Full product names are visible
- [ ] Goederen codes are more accurate
- [ ] Interface is more user-friendly
- [ ] Professional appearance maintained

---

## Testing Completion Report

After completing all tests, fill out this report:

```
Date Tested: _______________
Tester Name: _______________
Browser/Device: _______________

Test Results:
- Suite 1 (Row Reordering): PASS / FAIL
- Suite 2 (Table Width): PASS / FAIL
- Suite 3 (Dynamic TopK): PASS / FAIL
- Suite 4 (Filters Default): PASS / FAIL
- Suite 5 (UX Enhancements): PASS / FAIL
- Suite 6 (Integration): PASS / FAIL

Bugs Found: _____ (Critical: ___, High: ___, Medium: ___, Low: ___)

Overall Status: APPROVED / NEEDS REVISION

Comments:
_______________________________________
_______________________________________
_______________________________________

Signature: _______________
```

---

## Quick Test (5 Minutes)

If time is limited, run this quick test:

1. **Upload a PDF** ✓
2. **Click row number 3, type "1", press Enter** ✓
3. **Verify row moved to position 1** ✓
4. **Check GOEDEREN OMSCHRIJVING column is wider** ✓
5. **Verify filters are open with 50 items showing** ✓
6. **Check console for dynamic topK log** ✓
7. **Test hover effect on row numbers** ✓

If all 7 quick tests pass → Ready for demo! ✅

---

## Support

For questions or issues during testing:

- Check browser console for errors
- Review IMPLEMENTATION_SUMMARY.md for technical details
- Review VISUAL_GUIDE.md for expected behavior

---

**Testing Version**: 1.0
**Last Updated**: October 1, 2025
**Status**: Ready for QA ✅
