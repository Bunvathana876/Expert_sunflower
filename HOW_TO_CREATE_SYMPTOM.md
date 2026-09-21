# 📝 How to Create Symptoms (Simple Guide)

## Quick Steps

### Option 1: From Symptoms Page

```
1. Go to Admin → Symptoms
2. Click "+ Add Symptom"
3. Type symptom name (e.g., "Brown spots on leaves")
4. Select plant part (e.g., "Leaf")
5. Click "Save"
```

**That's it!** The system automatically creates the technical code for you.

### Option 2: From Disease Editor

```
1. Go to Admin → Diseases
2. Click "Edit" on a disease
3. Go to "Symptoms & Weights" tab
4. Click "+ Create New Catalog Symptom"
5. Type symptom name
6. Select plant part
7. Click "Create & Attach"
```

The symptom is created AND attached to the disease immediately!

## What You Type vs What the System Generates

| You Type (Label) | System Generates (Code) |
|------------------|-------------------------|
| Brown spots on leaves | `brown_spots_on_leaves` |
| Yellowing and wilting | `yellowing_and_wilting` |
| White powdery coating | `white_powdery_coating` |
| Root rot (severe) | `root_rot_severe` |
| Fuzzy gray mold!!! | `fuzzy_gray_mold` |

## Visual Guide

### Creating a Symptom

```
Step 1: Click "Add Symptom"
┌──────────────────────────────┐
│  Symptoms Catalog            │
│  ┌────────────────────────┐  │
│  │ Search...              │  │
│  └────────────────────────┘  │
│                              │
│  [+ Add Symptom]  ← Click    │
└──────────────────────────────┘

Step 2: Fill In the Form
┌──────────────────────────────┐
│  Add Symptom                 │
├──────────────────────────────┤
│  Label *                     │
│  ┌────────────────────────┐  │
│  │ Brown spots on leaves  │  │ ← Type the symptom name
│  └────────────────────────┘  │
│  Auto-generated code: brown_spots_on_leaves  ← System shows preview
│                              │
│  Category *                  │
│  ┌────────────────────────┐  │
│  │ Leaf              ▼    │  │ ← Choose plant part
│  └────────────────────────┘  │
│                              │
│  [Cancel]  [Save]            │ ← Click Save
└──────────────────────────────┘

Step 3: Done!
The symptom is now in your catalog and ready to use.
```

## Common Questions

### Q: Do I need to type the "code"?
**A:** No! The system automatically generates it from the label you type.

### Q: Can I change the code?
**A:** The code is fixed when you create the symptom. You can change the label anytime, but the code stays the same (so it doesn't break existing disease references).

### Q: What if I make a typo?
**A:** Just click "Edit" on the symptom and fix the label. The code won't change.

### Q: Can I delete symptoms?
**A:** Yes, but only if they're not attached to any diseases. If attached, you'll need to remove them from diseases first.

### Q: What's the difference between "label" and "code"?
- **Label** = What growers see: "Brown spots on leaves"
- **Code** = What the computer uses: `brown_spots_on_leaves`

You only type the label - the system handles the code!

## Tips

✅ **Good symptom names**:
- "Brown spots on leaves"
- "Yellowing between veins"
- "White powdery coating on stems"
- "Root rot with black discoloration"

❌ **Avoid**:
- Too vague: "Something wrong"
- Too technical: "Chlorosis induced by pathogen XYZ"
- Multiple symptoms: "Yellow and brown and wilting"

**Best practice**: One clear observation per symptom.

## Categories Available

When creating a symptom, choose the plant part:

- 🍃 **Leaf** - Spots, yellowing, wilting, holes
- 🌿 **Stem** - Lesions, cankers, discoloration
- 🌱 **Root** - Rot, discoloration, poor development
- 🌻 **Flower** - Distortion, discoloration, mold
- 🌾 **Whole Plant** - Stunting, wilting, death

## Example: Creating "Fuzzy Gray Mold"

```bash
1. Admin → Symptoms → "+ Add Symptom"

2. Fill form:
   Label: "Fuzzy gray mold growth"
   Category: "Flower"
   
   System shows: "Auto-generated code: fuzzy_gray_mold_growth"

3. Click "Save"

4. Done! ✅

Now you can:
- Attach it to diseases (e.g., Gray Mold, Botrytis)
- Set weights (how important is this symptom?)
- Mark as required or pathognomonic if needed
```

## What Happens After Creation

Once you create a symptom:

1. ✅ It appears in the **Symptoms Catalog**
2. ✅ You can **attach it to diseases** in disease editor
3. ✅ You can set **diagnostic weights** (how valuable is this symptom?)
4. ✅ Growers will see it when **checking their crops**

## Need Help?

If you see an error or something doesn't work:

1. Check the label isn't empty
2. Make sure you selected a category
3. Try a different name if "code already exists"
4. Contact admin if problem persists

---

**Remember**: Just type the symptom name and select the plant part. Everything else is automatic! 🌻✨
