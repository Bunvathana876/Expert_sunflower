# 🎯 UI Improvements Requested

## ✅ Completed

### 1. Simplified Symptom Selection
**Issue**: Tri-state selection (Yes/No/Not Sure) was confusing  
**Solution**: Changed to simple binary toggle - "Tap if observed"
- ✅ Removed "No" and "Not Sure" buttons
- ✅ Only one button: tap to mark as observed, tap again to unmark
- ✅ Simpler, faster user experience

## 🔧 To Be Fixed

### 2. Hide Symptom "Code" Field
**Issue**: Internal technical "code" field (e.g. `leaf_chlorosis`) shown to users  
**Location**: 
- Admin → Symptoms page
- Disease Editor → Add Symptom modal
- Results page (shows symptom codes)

**Solution**: Hide the code field from:
- ✅ Symptom creation/edit forms (auto-generate from label)
- ✅ Result displays (show labels only)
- Keep internally for database/API

### 3. Can't Edit Diseases
**Issue**: Disease editing not working  
**Need to investigate**:
- Check browser console for errors
- Test permissions (expert vs admin)
- Verify API calls
- Check form submission

### 4. Hide Old Rulesets
**Issue**: Old ruleset versions showing in admin - confusing  
**Current**: Shows all ruleset versions (2026.09.1, legacy-import, etc.)  
**Desired**: Only show the active ruleset  

**Solution**:
- Hide inactive rulesets from list
- Only allow creating new ones
- Automatically archive old ones
- Keep ONE active ruleset at a time

## 📝 Implementation Plan

### Priority 1: Hide Symptom Codes (Quick Fix)
```typescript
// Auto-generate code from label
function generateSymptomCode(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// Example: "Leaf yellowing" → "leaf_yellowing"
```

### Priority 2: Fix Disease Editing
1. Check backend logs for errors
2. Test with different user roles
3. Verify form validation
4. Check API endpoint responses

### Priority 3: Simplify Rulesets
1. Filter out inactive rulesets in UI
2. Add "Archive" action for old rulesets
3. Only show "Create New" option
4. Hide version management (automatic)

## 🧪 Testing Checklist

- [ ] Symptom checker shows simple toggle
- [ ] Users can easily mark observed symptoms
- [ ] No "code" field visible in symptom forms
- [ ] Disease editing works (Content, Symptoms, Media tabs)
- [ ] Only active ruleset shown in admin
- [ ] Can create new ruleset (archives old one)
- [ ] Symptom weights save correctly
- [ ] Translation editing works

## 📋 Current User Feedback

1. ✅ **Symptom selection**: "Remove absent, keep only observed" 
   - FIXED: Now single toggle button

2. ❌ **Disease editing**: "I can't edit DISEASE and symptom"
   - TO FIX: Need to diagnose why editing fails

3. ❌ **Symptom code**: "What is code in symptom why u put this"
   - TO FIX: Hide from UI, auto-generate

4. ❌ **Rulesets**: "Don't show Ruleset Versions, keep only new and clear old"
   - TO FIX: Hide inactive, only show active

## 🎯 Expected Final Behavior

### Symptom Checker:
- User sees plant part categories
- Clicks on a category
- Sees list of symptoms
- Taps symptom to mark as "Observed" (green)
- Taps again to unmark
- No "absent" or "not sure" needed

### Admin - Symptoms:
- Create symptom: only needs Label (code auto-generated)
- Edit symptom: only see Label and Category
- No technical "code" field visible

### Admin - Diseases:
- Can edit all three tabs: Content, Symptoms, Media
- Symptom weights adjust with sliders
- Changes save successfully
- No errors

### Admin - Rulesets:
- Only see current active ruleset (e.g., "2026.09.1")
- Can create new ruleset
- Old versions automatically archived (hidden)
- Simple, clean interface
