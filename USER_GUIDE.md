# Werkbrief Generator - New Features User Guide

## 🎯 What's New

### 1. Mathematical Calculations in Number Fields ✨

You can now perform calculations directly in numeric input fields!

**How to use:**

1. Click on any numeric field (CTNS, STKS, BRUTO, FOB)
2. Type a mathematical expression instead of just a number
3. Press Enter or click outside the field
4. The result will be automatically calculated and formatted

**Examples:**

- Type `1+1` → Result: `2`
- Type `5*2.5` → Result: `12.5` (or `12` for CTNS/STKS)
- Type `(100+50)/3` → Result: `50.0`
- Type `20*1.5+10` → Result: `40.0`

**Supported operations:**

- Addition: `+`
- Subtraction: `-`
- Multiplication: `*`
- Division: `/`
- Parentheses for grouping: `()`

---

### 2. Improved Search Goederen Modal 🔍

The search modal is now wider and easier to read!

**What's improved:**

- **Wider layout** - More information visible at once
- **Grid layout** - Item and description side-by-side
- **Less scrolling** - Better use of space
- **Compact cards** - More results visible
- **Collapsible sections** - Additional info and metadata can be expanded when needed
- **Better performance** - Faster rendering and smoother scrolling

**How to use:**

1. Click the "Search" button on any table row
2. Enter your search query
3. Adjust number of results if needed
4. Browse results in the improved layout
5. Click "Use this Goederen" to apply

---

### 3. Fixed Number Rounding 🔢

Numbers now round correctly to the specified decimal places!

**Before:**

- Entering `1.234` in BRUTO field would show `1` ❌

**Now:**

- Entering `1.234` in BRUTO field shows `1.2` ✅
- Entering `1.2345` in FOB field shows `1.23` ✅
- Entering `5.7` in CTNS field shows `6` ✅

**Field precision:**

- CTNS: Whole numbers (0 decimals)
- STKS: Whole numbers (0 decimals)
- BRUTO: 1 decimal place
- FOB: 2 decimal places

---

### 4. Improved Merge Functionality 🔀

The merge button now works immediately on first click!

**How to use:**

1. Click "Batch Merge" button
2. Select 2 or more items you want to merge
3. Click "Merge Selected" button
4. Items will merge immediately into the first selected item
5. Quantities (CTNS, STKS, BRUTO, FOB) are summed up

**What gets merged:**

- ✅ CTNS (summed)
- ✅ STKS (summed)
- ✅ BRUTO (summed)
- ✅ FOB (summed)
- 📝 First item's description is kept
- 📝 First item's codes are kept

---

### 5. Werkbrief History Panel 📚

Access your previously generated werkbriefs anytime!

**Features:**

- **Auto-save** - Every werkbrief is automatically saved
- **User-specific** - Only you can see your history
- **Easy access** - Click the "History" button in the table header
- **Quick restore** - Load any previous werkbrief with one click

**How to use:**

#### Viewing History:

1. Look for the **History** button in the table header (indigo/purple color)
2. Click it to open the history panel
3. Browse your previously generated werkbriefs
4. See creation date and file size for each

#### Loading a Previous Werkbrief:

1. Open the history panel
2. Find the werkbrief you want to load
3. Click the **Load** button
4. Your werkbrief will be restored instantly

#### What gets saved:

- All table data and fields
- Total items count
- Page information
- Missing pages data
- Creation timestamp

**Benefits:**

- 🔄 Never lose your work
- 📊 Compare different versions
- ⏱️ Save time by reusing previous work
- 🔍 Track your generation history

---

## 🎨 UI/UX Improvements

### Visual Enhancements:

- Better spacing in search results
- Improved button states and feedback
- Cleaner loading indicators
- More intuitive layouts
- Consistent color scheme

### Performance:

- Faster search results rendering
- Smoother scrolling
- Optimized state updates
- Better responsiveness

---

## 💡 Tips & Tricks

### For Calculations:

- You can use complex expressions like `(10+5)*2-3`
- The calculator respects order of operations
- Use parentheses to control calculation order
- Invalid expressions default to 0

### For Search:

- Collapse metadata sections you don't need
- Use the copy button to quickly copy codes
- Results are sorted by relevance score
- Higher scores (closer to 100%) are better matches

### For Merge:

- Always verify merged quantities
- First item's description is preserved
- Consider which item should be first
- Undo is available if you make a mistake

### For History:

- History is automatically saved after generation
- No manual action needed
- Refresh the panel to see latest items
- Each user has their own private history

---

## 🐛 Known Limitations

1. **Calculations:** Only basic math operators supported (no advanced functions yet)
2. **History:** No search/filter within history (coming soon)
3. **Merge:** Cannot undo a merge directly (use the general undo button)

---

## 🆘 Troubleshooting

### Issue: Calculation not working

- **Solution:** Make sure you're using only numbers and operators (+, -, \*, /, ())
- Invalid characters will be ignored

### Issue: History not loading

- **Solution:** Make sure you're logged in and have generated at least one werkbrief

### Issue: Search modal text is cut off

- **Solution:** Hover over truncated text to see full content in tooltip

### Issue: Merge button not responding

- **Solution:** This has been fixed! Make sure you're using the latest version

---

## 📞 Support

For any issues or questions:

1. Check this guide first
2. Review the implementation summary document
3. Contact your administrator
4. Report bugs through proper channels

---

## 🚀 What's Next?

Upcoming features (roadmap):

- Advanced calculator functions (sqrt, power, etc.)
- History search and filtering
- Export/import history
- Bulk operations on history
- More merge options
- Custom field calculations

---

**Last Updated:** October 18, 2025
**Version:** 2.0.0
