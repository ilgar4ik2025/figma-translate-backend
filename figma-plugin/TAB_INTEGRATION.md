# Tab 1 & Tab 2 Integration Guide

## Overview

This document explains how Tab 2 (Screenshot Generator) creates Figma elements that are fully compatible with Tab 1 (Screenshot Localizer), enabling a seamless workflow from generation to localization.

## Workflow

1. **Tab 2**: Generate screenshots with AI-powered backgrounds and text
2. **Tab 1**: Localize the generated screenshots to multiple languages
3. **Export**: Ready-to-publish App Store screenshots in all target languages

## Element Structure Compatibility

### Layer Naming Convention

Tab 2 creates slides with the following structure:

```
Slide 1: [Headline Text]
├── [PRESERVE] Background          ← Image, not localized
├── Headline                        ← TextNode, localizable
├── Subheadline                     ← TextNode, localizable
└── [PRESERVE] iPhone Mockup        ← Frame, not localized
    └── App Screenshot              ← Image, preserved
```

### Key Compatibility Features

#### 1. TextNode Elements

All text elements (Headline, Subheadline) are created as proper Figma `TextNode` objects with:
- **Type**: `TEXT` - Recognized by Tab 1's `collectTextNodes()` function
- **Characters property**: Editable text content accessible via `node.characters`
- **Font properties**: Proper font loading and styling
- **Auto-resize**: Set to `HEIGHT` for proper text overflow handling

#### 2. [PRESERVE] Prefix

Elements marked with `[PRESERVE]` prefix are **not modified** during localization:
- `[PRESERVE] Background` - AI-generated background image
- `[PRESERVE] iPhone Mockup` - iPhone frame with user's screenshot

This ensures that:
- Visual backgrounds remain consistent across all languages
- User's original app screenshots are not altered
- Only text content is translated

#### 3. Descriptive Layer Names

All layers have clear, descriptive names:
- `Slide 1: [Headline]` - Easy to identify in Figma layers panel
- `Headline` - Clear indication of text purpose
- `Subheadline` - Secondary text element
- `App Screenshot` - User's original screenshot
- `Screenshot Placeholder` - When no screenshot provided

## Using Tab 1 with Tab 2 Output

### Step 1: Generate Screenshots (Tab 2)

1. Switch to "Screenshot Generator" tab
2. Fill in app description (category, audience, style)
3. Optionally upload app screenshots
4. Click "Generate Screenshots"
5. Review and edit the generated story
6. Generate backgrounds and create slides

Result: 5 slides created in Figma with structure shown above

### Step 2: Localize Screenshots (Tab 1)

1. Switch to "Screenshot Localizer" tab
2. Select the parent frame "App Store Screenshots" or individual slides
3. Choose source language (e.g., English)
4. Select target languages (e.g., Spanish, French, German)
5. Configure ASO mode and glossary if needed
6. Click "Translate"

Result: Cloned frames for each language with translated text, preserved backgrounds and mockups

### What Gets Localized

✅ **Localized (TextNodes)**:
- Headline text
- Subheadline text

❌ **Preserved (Not Modified)**:
- Background images
- iPhone mockup frames
- App screenshots inside mockups
- Visual styling and layout

## Technical Implementation

### Text Collection

Tab 1 uses the `collectTextNodes()` function to find all text elements:

```javascript
function collectTextNodes(nodes, acc = []) {
  for (const node of nodes) {
    if (node.type === 'TEXT') acc.push(node);
    if ('children' in node) collectTextNodes(node.children, acc);
  }
  return acc;
}
```

This function:
1. Recursively traverses all nodes in a frame
2. Collects all nodes with `type === 'TEXT'`
3. Returns array of TextNodes for translation

### Enhanced Collection (Optional)

For better control, use `collectLocalizableTextNodes()` which respects `[PRESERVE]` markers:

```javascript
function collectLocalizableTextNodes(nodes, acc = []) {
  for (const node of nodes) {
    // Skip nodes marked with [PRESERVE] prefix
    if (node.name && node.name.startsWith('[PRESERVE]')) {
      continue;
    }
    
    if (node.type === 'TEXT') {
      acc.push(node);
    }
    
    if ('children' in node) {
      collectLocalizableTextNodes(node.children, acc);
    }
  }
  return acc;
}
```

### Text Update

Tab 1 updates text using the `setText()` function:

```javascript
async function setText(node, text) {
  await figma.loadFontAsync(node.fontName);
  node.characters = text;
}
```

This works seamlessly with Tab 2's TextNodes because:
- Font is properly loaded before text update
- `characters` property is accessible and editable
- Font properties are preserved from original

## Best Practices

### For Users

1. **Generate first, localize second**: Always complete screenshot generation in Tab 2 before switching to Tab 1
2. **Review before localizing**: Check and edit the generated text in Tab 2 before localizing
3. **Select parent frame**: For batch localization, select the "App Store Screenshots" parent frame
4. **Use ASO mode**: Enable ASO mode in Tab 1 for App Store-optimized translations

### For Developers

1. **Always use TextNode**: Create text elements using `figma.createText()`, never use other node types for text
2. **Set proper names**: Use descriptive layer names that indicate purpose
3. **Mark non-text elements**: Use `[PRESERVE]` prefix for elements that should not be modified
4. **Test compatibility**: Always test that Tab 1 can successfully localize Tab 2 output

## Troubleshooting

### Issue: Text not being localized

**Possible causes**:
- Text element is not a TextNode (check `node.type === 'TEXT'`)
- Text element is inside a `[PRESERVE]` container
- Frame is not selected in Tab 1

**Solution**:
- Verify element type in Figma
- Check layer hierarchy
- Select the correct frame before localizing

### Issue: Mockups being modified

**Possible causes**:
- `[PRESERVE]` prefix missing from mockup frame name
- Custom localization function not respecting `[PRESERVE]` marker

**Solution**:
- Ensure mockup frame name starts with `[PRESERVE]`
- Use `collectLocalizableTextNodes()` instead of `collectTextNodes()`

### Issue: Fonts not loading

**Possible causes**:
- Font not available in Figma
- Font name mismatch

**Solution**:
- Verify Inter font is available (Bold and Regular styles)
- Check font loading in `createTextElements()`

## Requirements Addressed

This integration addresses the following requirements:

- **Requirement 10.1**: Tab 2 creates Figma elements compatible with Tab 1 processing
- **Requirement 10.2**: Generated text elements are selectable and editable by Tab 1
- **Requirement 10.3**: Generated slides persist when switching between tabs
- **Requirement 10.4**: Mockup elements are preserved during localization

## Summary

Tab 2 (Screenshot Generator) creates fully compatible Figma structures that work seamlessly with Tab 1 (Screenshot Localizer):

✅ Proper TextNode elements for all text
✅ Descriptive layer names for easy identification
✅ [PRESERVE] markers for non-text elements
✅ Consistent structure across all slides
✅ Full compatibility with existing localization workflow

This enables a complete workflow: **Generate → Review → Localize → Export**
