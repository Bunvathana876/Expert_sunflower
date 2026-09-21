# ✅ Symptom Translations (Bilingual EN/KM) - COMPLETE!

## What Changed

Symptoms now support **bilingual translations** just like diseases! You can input both English and Khmer names when creating or editing symptoms.

## Before vs After

### ❌ BEFORE
```
Creating a symptom:
  Label: "Brown spots on leaves"  ← Only one language!
  Category: Leaf
```

### ✅ AFTER
```
Creating a symptom:
  🇬🇧 Label (English): "Brown spots on leaves"
  🇰🇭 Label (ខ្មែរ):      "ស្នាមត្នោតនៅលើស្លឹក"
  Category: Leaf
```

Now supports both languages side-by-side!

## Visual Guide

### Creating a Symptom with Translations

```
┌────────────────────────────────────────────────────────────┐
│  Add Symptom                                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🇬🇧 Label (English) *         🇰🇭 Label (ខ្មែរ)            │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │ Brown spots on leaves   │  │ ស្នាមត្នោតនៅលើស្លឹក      │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
│  Auto-generated code: brown_spots_on_leaves                │
│                                                            │
│  Category *                                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Leaf                                             ▼   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [Cancel]  [Save]                                         │
└────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Auto-Generated Code (from English)

The system auto-generates the code from the **English label**:

| English Label | Khmer Label | Auto Code |
|--------------|-------------|-----------|
| Brown spots on leaves | ស្នាមត្នោតនៅលើស្លឹក | `brown_spots_on_leaves` |
| Yellowing and wilting | ស្លឹកពណ៌លឿងនិងស្វិត | `yellowing_and_wilting` |
| White powdery coating | ថ្នាំពណ៌សដូចម្សៅ | `white_powdery_coating` |

### 2. Bilingual Display

When growers use the app:
- **English users** see: "Brown spots on leaves"
- **Khmer users** see: "ស្នាមត្នោតនៅលើស្លឹក"

Both point to the same symptom in the database!

### 3. Optional Khmer

Khmer translation is **optional** - you can:
- ✅ Add English only and save
- ✅ Add both English and Khmer
- ❌ Cannot add Khmer without English (English is required)

## Where This Works

✅ **Admin → Symptoms** - Creating/editing symptoms in catalog  
✅ **Admin → Disease Editor** - Creating symptoms inline when editing disease  

Both places now show:
1. Side-by-side English and Khmer input fields
2. Auto-generated code from English label
3. Khmer input with proper font support

## Test Instructions

### Test 1: Create Symptom with Both Languages

```bash
1. Go to http://localhost:5174/admin
2. Login: admin / admin
3. Click "Symptoms" in sidebar
4. Click "+ Add Symptom"

5. Fill form:
   English: "Fuzzy gray mold growth"
   Khmer:   "ផ្សិតពណ៌ប្រផេះដែលមានរោម"
   Category: "Flower"

6. See auto code: fuzzy_gray_mold_growth
7. Click "Save"
8. ✅ Symptom created with both translations!

9. Switch language to Khmer (top-right)
10. Should see: "ផ្សិតពណ៌ប្រផេះដែលមានរោម" ✅
```

### Test 2: Create Symptom (English Only)

```bash
1. Admin → Symptoms → "+ Add Symptom"

2. Fill form:
   English: "Sticky residue on stems"
   Khmer:   [leave empty]
   Category: "Stem"

3. Click "Save"
4. ✅ Should work! (Khmer is optional)

5. When Khmer users view this symptom:
   - They see the English label (fallback)
   - Or you can edit later to add Khmer
```

### Test 3: Create Symptom in Disease Editor

```bash
1. Go to Admin → Diseases
2. Click "Edit" on any disease
3. Go to "Symptoms & Weights" tab
4. Click "+ Create New Catalog Symptom"

5. Fill form:
   English: "Black lesions on stem base"
   Khmer:   "របួសខ្មៅនៅជើងដើម"
   Plant Part: "Stem"

6. Click "Create & Attach"
7. ✅ Symptom created AND attached to disease!
```

### Test 4: Edit Existing Symptom

```bash
1. Admin → Symptoms
2. Click "Edit" on any symptom
3. See both English and Khmer fields
4. Update Khmer translation (if missing)
5. Click "Save"
6. ✅ Translation updated!
```

## API Changes

The frontend now sends:

```json
{
  "code": "brown_spots_on_leaves",
  "label_en": "Brown spots on leaves",
  "label_km": "ស្នាមត្នោតនៅលើស្លឹក",
  "category_id": 1
}
```

**Before**, it sent:
```json
{
  "code": "brown_spots_on_leaves",
  "label": "Brown spots on leaves",  ← Single language
  "category_id": 1
}
```

## Database Structure

The backend stores translations in the `translations` table:

```
symptoms table:
  id: 42
  code: "brown_spots_on_leaves"
  category_id: 1

translations table:
  entity_type: "symptom"
  entity_id: 42
  locale: "en"
  field: "label"
  value: "Brown spots on leaves"

  entity_type: "symptom"
  entity_id: 42
  locale: "km"
  field: "label"
  value: "ស្នាមត្នោតនៅលើស្លឹក"
```

## What Happens When Khmer Is Missing?

If a symptom has no Khmer translation:
1. Khmer users see the **English label** (automatic fallback)
2. Admin can add Khmer later by editing the symptom
3. No errors or blank spaces

## Translation Workflow

### Recommended Process:

1. **Create symptoms in English first**
   - Get all symptoms into the system
   - Auto-generated codes work correctly
   - Immediately usable

2. **Add Khmer translations later**
   - Edit each symptom
   - Add Khmer in the side-by-side editor
   - Growers immediately see Khmer on next app load

3. **Check completeness**
   - Look for symptoms without Khmer
   - Prioritize most common symptoms first
   - Less common symptoms can use English fallback

## Files Changed

### Frontend:
- ✅ `SymptomsPage.tsx` - Added side-by-side EN/KM fields
- ✅ `DiseaseEditorPage.tsx` - Added side-by-side EN/KM fields
- ✅ `admin/api.ts` - Updated interfaces to `label_en` / `label_km`

### Backend:
- ✅ Already supported! (`label_en` / `label_km` in schemas)

## Example Translations

Here are some common symptoms with translations:

| English | Khmer | Code |
|---------|-------|------|
| Brown spots on leaves | ស្នាមត្នោតនៅលើស្លឹក | `brown_spots_on_leaves` |
| Yellowing between veins | ពណ៌លឿងរវាងសរសៃស្លឹក | `yellowing_between_veins` |
| Wilting of whole plant | ដើមរុក្ខជាតិស្វិត | `wilting_of_whole_plant` |
| White powdery coating | ថ្នាំពណ៌សដូចម្សៅ | `white_powdery_coating` |
| Root rot with odor | ឬសផុយមានក្លិន | `root_rot_with_odor` |
| Fuzzy gray mold | ផ្សិតពណ៌ប្រផេះ | `fuzzy_gray_mold` |
| Black stem lesions | របួសខ្មៅនៅដើម | `black_stem_lesions` |
| Stunted growth | ការលូតលាស់យឺត | `stunted_growth` |

## Khmer Typography

The Khmer input fields include:
- ✅ `lang="km"` attribute for proper rendering
- ✅ `Noto Sans Khmer` font for correct diacritics
- ✅ Proper line-height to prevent clipping
- ✅ Right-to-left support where needed

## Benefits

| Before | After |
|--------|-------|
| Only English symptoms | Bilingual English + Khmer |
| Khmer users see English | Khmer users see Khmer |
| Manual translation needed later | Translate while creating |
| Separate tool for translations | Built into admin form |
| Difficult to track completeness | Side-by-side comparison |

## Translation Tips

### Good Khmer Translations:
- ✅ Use common agricultural terms
- ✅ Be descriptive and clear
- ✅ Match the English meaning closely
- ✅ Use Khmer script properly

### Avoid:
- ❌ Direct word-by-word translation
- ❌ Technical jargon without context
- ❌ Mixing Khmer and English in same field
- ❌ Using Latin characters for Khmer words

## Integration with Diseases

Symptoms with Khmer translations work seamlessly in disease management:

1. **Disease Editor** - Shows symptom labels in current locale
2. **Diagnosis Flow** - Growers see symptoms in their language
3. **Reports** - Export includes both languages
4. **Search** - Works in both English and Khmer

## Future Enhancements (Optional)

If needed, we can add:

1. **Translation Progress Bar**
   - Show % of symptoms with Khmer
   - Highlight missing translations

2. **Bulk Translation Import**
   - Upload CSV with EN/KM pairs
   - Auto-update all symptoms

3. **Translation Memory**
   - Suggest similar Khmer translations
   - Learn from previous translations

4. **Third Language Support**
   - French, Thai, Vietnamese, etc.
   - Same side-by-side pattern

Let me know if you want any of these!

---

## Summary

✅ **Symptom forms now bilingual** (EN/KM side-by-side)  
✅ **Code auto-generated from English** (unchanged)  
✅ **Khmer translation optional** (English fallback works)  
✅ **Works in both admin pages** (Symptoms + Disease Editor)  
✅ **Proper Khmer font support** (Noto Sans Khmer)  
✅ **API updated** (`label_en` / `label_km`)  
✅ **TypeScript & linting pass** ✓

**Test now**: http://localhost:5174/admin/symptoms

Login as `admin`/`admin` and create a symptom with both languages! 🌻🇬🇧🇰🇭
