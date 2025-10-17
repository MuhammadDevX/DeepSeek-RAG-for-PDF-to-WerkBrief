# Calculator Functionality Test Guide

## ✅ Fixed Implementation

The calculator functionality in the DebouncedInput component now works correctly!

### How It Works:

1. **During Typing** (`handleChange`):

   - Detects if input contains mathematical operators (`+`, `-`, `*`, `/`, `()`)
   - If NO operators → parses as simple number
   - If YES operators → stores display value WITHOUT evaluating (waits for completion)

2. **On Blur or Enter Key**:
   - Evaluates the complete mathematical expression
   - Applies precision rounding based on field type
   - Updates the final value

### Test Cases:

#### CTNS Field (precision: 0 - whole numbers)

- Type: `5+5` → Press Enter or blur → Result: `10`
- Type: `20*3` → Press Enter or blur → Result: `60`
- Type: `100/4` → Press Enter or blur → Result: `25`
- Type: `(10+5)*2` → Press Enter or blur → Result: `30`

#### STKS Field (precision: 0 - whole numbers)

- Type: `12+8` → Press Enter or blur → Result: `20`
- Type: `15*4` → Press Enter or blur → Result: `60`

#### BRUTO Field (precision: 1 - one decimal)

- Type: `5.5+2.3` → Press Enter or blur → Result: `7.8`
- Type: `10/3` → Press Enter or blur → Result: `3.3`
- Type: `2.5*4` → Press Enter or blur → Result: `10.0`

#### FOB Field (precision: 2 - two decimals for currency)

- Type: `100+50.75` → Press Enter or blur → Result: `150.75`
- Type: `99.99*2` → Press Enter or blur → Result: `199.98`
- Type: `250/3` → Press Enter or blur → Result: `83.33`
- Type: `(100+25.50)*1.5` → Press Enter or blur → Result: `188.25`

### Security Features:

- ✅ Only allows: numbers, operators (+, -, \*, /), parentheses, and decimal points
- ✅ Rejects any other characters (no code injection possible)
- ✅ Uses Function constructor (safer than eval)
- ✅ Validates regex: `/^[0-9+\-*/().]+$/`

### UX Features:

- ✅ Auto-select text on focus (easy to replace values)
- ✅ Debounced updates (300ms delay)
- ✅ Precision formatting applied automatically
- ✅ Visual feedback on invalid expressions (falls back to last valid value)

## 🎯 Key Fix:

The main issue was that the previous version tried to evaluate expressions **during typing** (on every keystroke), which caused incomplete expressions like "1+" to fail and return 0. Now it only evaluates when you're done typing (on blur or Enter), ensuring the complete expression is evaluated correctly.

## Testing Steps:

1. Navigate to the werkbrief generator page
2. Upload a PDF to get table data
3. Click on any numeric field (CTNS, STKS, BRUTO, FOB)
4. Type a mathematical expression (e.g., "10+5")
5. Press Enter OR click outside the field
6. Watch the result appear with proper precision formatting! 🎉
