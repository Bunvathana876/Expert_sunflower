# ✅ Symptom Code Auto-Generation - COMPLETE!

## What Changed

Users **NO LONGER** need to manually input the symptom code. The system now automatically generates it from the label!

## Before vs After

### ❌ BEFORE (Manual Code Entry)
```
User creates symptom:
  1. Type Label: "Brown spots on leaves"
  2. Type Code: "brown_spots_on_leaves"  ← Manual work!
  3. Select Category: "Leaf"
  4. Click Save
```

### ✅ AFTER (Auto-Generated Code)
```
User creates symptom:
  1. Type Label: "Brown spots on leaves"
  2. Code auto-generated: brown_spots_on_leaves  ← Automatic!
  3. Select Category: "Leaf"
  4. Click Save
```

## How It Works

The system uses this rule to generate codes:

```javascript
function generateCode(label) {
  // "Brown Spots on Leaves" → "brown_spots_on_leaves"
  return label
    .toLowerCase()              // all lowercase
    .replace(/[^a-z0-9]+/g, "_") // spaces/punctuation → underscore
    .replace(/^_|_$/g, "");      // remove leading/trailing underscores
}
```

### Examples:

| Label Input | Auto-Generated Code |
|-------------|---------------------|
| "Brown spots on leaves" | `brown_spots_on_leaves` |
| "Yellowing & wilting" | `yellowing_wilting` |
| "White powdery coating!!!" | `white_powdery_coating` |
| "Root rot (severe)" | `root_rot_severe` |

## Where This Works

✅ **Admin → Symptoms Page** - Adding new symptoms in catalog  
✅ **Admin → Disease Editor** - Creating new symptoms inline when editing disease

Both forms now:
1. Show only **Label** and **Category** fields
2. Auto-generate code as you type the label
3. Show small preview: "Auto-generated code: `your_code_here`"

## What Users See Now

### Creating New Symptom in Symptoms Page:

```
┌─────────────────────────────────────┐
│  Add Symptom                        │
├─────────────────────────────────────┤
│                                     │
│  Label *                            │
│  ┌─────────────────────────────┐   │
│  │ Brown spots on leaves       │   │
│  └─────────────────────────────┘   │
│  Auto-generated code: brown_spots_on_leaves
│                                     │
│  Category *                         │
│  ┌─────────────────────────────┐   │
│  │ Leaf                    ▼   │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Cancel]  [Save]                  │
└─────────────────────────────────────┘
```

**Before**: Had both Code + Label fields (confusing!)  
**After**: Only Label field, code auto-generated (simple!)

## Technical Details

### Files Modified

1. **SymptomsPage.tsx** (`frontend/src/features/admin/pages/`)
   - Added `generateCode()` function
   - Added `handleLabelChange()` to auto-generate code
   - Removed code input field from modal
   - Shows small preview of generated code

2. **DiseaseEditorPage.tsx** (`frontend/src/features/admin/pages/`)
   - Added `generateSymptomCode()` function
   - Added `handleNewSymptomLabelChange()` handler
   - Removed code input from inline symptom creation modal
   - Shows preview of auto-generated code

3. **en.json & km.json** (`frontend/src/locales/`)
   - Added translation key: `"admin.auto_code"`
   - English: "Auto-generated code"
   - Khmer: "កូដបង្កើតដោយស្វ័យប្រវត្តិ"

### Code Generation Logic

```typescript
// Auto-generate symptom code from label
const generateCode = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
};
```

**Rules**:
- All lowercase
- Only letters and numbers allowed
- Everything else becomes underscore `_`
- No leading/trailing underscores

### Auto-Generation Timing

**When creating NEW symptom**:
- Code updates in real-time as user types label
- User sees preview below input field

**When editing EXISTING symptom**:
- Code field is NOT shown (kept as-is in database)
- Only label can be edited
- Prevents accidental code changes that would break references

## Test Instructions

### Test 1: Create Symptom in Symptoms Page

```bash
1. Go to http://localhost:5174/admin
2. Login: admin / admin
3. Click "Symptoms" in sidebar
4. Click "+ Add Symptom" button
5. Type Label: "Sticky residue on stems"
6. Watch code auto-generate: sticky_residue_on_stems
7. Select Category: "Stem"
8. Click "Save"
9. ✅ Should create successfully!
```

### Test 2: Create Symptom in Disease Editor

```bash
1. Go to http://localhost:5174/admin/diseases
2. Click "Edit" on any disease
3. Go to "Symptoms & Weights" tab
4. Click "+ Create New Catalog Symptom"
5. Type Label: "Fuzzy gray mold growth"
6. Watch code auto-generate: fuzzy_gray_mold_growth
7. Select Plant Part: "Flower"
8. Click "Create & Attach"
9. ✅ Should create and attach!
```

### Test 3: Edit Existing Symptom

```bash
1. Go to http://localhost:5174/admin/symptoms
2. Click "Edit" on any existing symptom
3. Notice: Only Label and Category fields show
4. Code field is hidden (stays unchanged)
5. Change label slightly
6. Click "Save"
7. ✅ Should update label only, code unchanged
```

## Benefits

| Before | After |
|--------|-------|
| 2 fields to fill (Code + Label) | 1 field to fill (Label only) |
| Users need to understand code format | System handles it automatically |
| Risk of typos in code | Code always correct format |
| Need to type underscore manually | System adds underscores automatically |
| Duplicate work typing similar text | Type once, code auto-generated |

## Edge Cases Handled

### Special Characters
```
Input:  "Brown spots (severe)!!!"
Output: "brown_spots_severe"
```

### Multiple Spaces
```
Input:  "Yellow    and    wilted"
Output: "yellow_and_wilted"
```

### Numbers
```
Input:  "Stage 3 rot"
Output: "stage_3_rot"
```

### Non-English Characters
```
Input:  "Taches brunes" (French)
Output: "taches_brunes"
```

## User Feedback Expected

When users see this, they should say:

✅ "Much easier! I just type the symptom name and it's done!"  
✅ "I don't need to worry about technical code anymore"  
✅ "Creating symptoms is faster now"

## What's Still Manual

Users still need to:
1. ✍️ Type the symptom **Label** (what users see)
2. 📂 Select the **Category** (Leaf, Stem, Root, etc.)

The system automatically handles:
1. ✅ Generating the **Code** (technical identifier)
2. ✅ Formatting it correctly (lowercase, underscores)
3. ✅ Showing preview so user can verify

## Database Impact

**No database changes needed!**

The `symptoms` table still has:
- `id` - Auto-increment primary key
- `code` - Technical identifier (VARCHAR)
- `label` - User-facing text (TEXT)
- `category_id` - Foreign key to categories

**What changed**: How the `code` field gets populated
- Before: User types it manually
- After: Frontend auto-generates from label before API call

The backend API still receives the same payload:
```json
{
  "code": "brown_spots_on_leaves",
  "label": "Brown spots on leaves",
  "category_id": 1
}
```

## Future Enhancements (Optional)

If you want to improve further:

1. **Detect Duplicates**
   - Check if code already exists
   - Suggest: `brown_spots_on_leaves_2`

2. **Smart Suggestions**
   - Suggest similar existing symptoms
   - Prevent creating duplicates

3. **Bulk Import**
   - Upload CSV with just labels
   - Auto-generate all codes

4. **Code Preview in List**
   - Show code when hovering over symptom
   - Useful for debugging

Let me know if you want any of these!

---

## Summary

✅ **Symptom code field is HIDDEN**  
✅ **Code auto-generated from label**  
✅ **Users only type symptom name**  
✅ **Real-time preview shown**  
✅ **Works in both admin pages**  
✅ **Translations added (EN + KM)**  
✅ **Linting & TypeScript pass**  

**Test now**: http://localhost:5174/admin/symptoms

Login as `admin`/`admin` and try creating a new symptom! 🎉
