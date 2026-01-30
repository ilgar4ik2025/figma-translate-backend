# Tab 1 & Tab 2 Integration Diagram

## Visual Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                            │
└─────────────────────────────────────────────────────────────────┘

Step 1: Generate (Tab 2)          Step 2: Localize (Tab 1)
┌──────────────────────┐          ┌──────────────────────┐
│  Screenshot          │          │  Screenshot          │
│  Generator           │   →→→    │  Localizer           │
│                      │          │                      │
│  • Input app info    │          │  • Select frame      │
│  • Generate story    │          │  • Choose languages  │
│  • Create slides     │          │  • Translate text    │
└──────────────────────┘          └──────────────────────┘
         │                                  │
         ▼                                  ▼
┌──────────────────────┐          ┌──────────────────────┐
│  5 Slides Created    │          │  Localized Frames    │
│  in Figma            │          │  (Multiple Languages)│
└──────────────────────┘          └──────────────────────┘
```

## Element Structure Compatibility

```
┌─────────────────────────────────────────────────────────────────┐
│                    TAB 2 CREATES                                 │
└─────────────────────────────────────────────────────────────────┘

App Store Screenshots (FrameNode)
├── Slide 1: Transform Your Workflow (FrameNode)
│   ├── [PRESERVE] Background (RectangleNode) ◄─── NOT LOCALIZED
│   ├── Headline (TextNode) ◄───────────────────── LOCALIZED ✓
│   ├── Subheadline (TextNode) ◄────────────────── LOCALIZED ✓
│   └── [PRESERVE] iPhone Mockup (FrameNode) ◄──── NOT LOCALIZED
│       └── App Screenshot (RectangleNode)
│
├── Slide 2: Boost Productivity (FrameNode)
│   ├── [PRESERVE] Background (RectangleNode) ◄─── NOT LOCALIZED
│   ├── Headline (TextNode) ◄───────────────────── LOCALIZED ✓
│   ├── Subheadline (TextNode) ◄────────────────── LOCALIZED ✓
│   └── [PRESERVE] iPhone Mockup (FrameNode) ◄──── NOT LOCALIZED
│       └── App Screenshot (RectangleNode)
│
└── ... (3 more slides with same structure)

┌─────────────────────────────────────────────────────────────────┐
│                    TAB 1 PROCESSES                               │
└─────────────────────────────────────────────────────────────────┘

1. collectTextNodes() finds all TextNodes
   ├── Headline (TextNode) ✓
   ├── Subheadline (TextNode) ✓
   └── Skips [PRESERVE] elements ✗

2. Translates text content
   ├── Headline: "Transform Your Workflow" → "Transforme su flujo de trabajo"
   └── Subheadline: "Boost productivity" → "Aumenta la productividad"

3. Creates cloned frames
   ├── Original Frame (English)
   ├── Cloned Frame (Spanish)
   ├── Cloned Frame (French)
   └── ... (more languages)

4. Preserves visual elements
   ├── Background images stay the same ✓
   └── iPhone mockups stay the same ✓
```

## Layer Naming Convention

```
┌─────────────────────────────────────────────────────────────────┐
│                    NAMING RULES                                  │
└─────────────────────────────────────────────────────────────────┘

[PRESERVE] Prefix
├── Purpose: Mark elements that should NOT be modified
├── Examples:
│   ├── [PRESERVE] Background
│   └── [PRESERVE] iPhone Mockup
└── Behavior: Skipped by collectLocalizableTextNodes()

Descriptive Names
├── Purpose: Easy identification in Figma layers panel
├── Examples:
│   ├── Headline
│   ├── Subheadline
│   ├── App Screenshot
│   └── Screenshot Placeholder
└── Behavior: Collected by collectTextNodes() if type === 'TEXT'

Slide Names
├── Format: "Slide N: [Headline Text]"
├── Examples:
│   ├── Slide 1: Transform Your Workflow
│   ├── Slide 2: Boost Productivity
│   └── Slide 3: Seamless Integration
└── Purpose: Quick identification of slide content
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GENERATION FLOW (TAB 2)                       │
└─────────────────────────────────────────────────────────────────┘

User Input
    │
    ├─► category: "Productivity"
    ├─► audience: "Busy professionals"
    ├─► style: "Modern, minimalist"
    └─► screenshots: [optional images]
    │
    ▼
GPT Story Generation
    │
    ├─► Slide 1: { headline, subheadline, description }
    ├─► Slide 2: { headline, subheadline, description }
    ├─► Slide 3: { headline, subheadline, description }
    ├─► Slide 4: { headline, subheadline, description }
    └─► Slide 5: { headline, subheadline, description }
    │
    ▼
Gemini Background Generation
    │
    ├─► Background 1: [base64 image]
    ├─► Background 2: [base64 image]
    ├─► Background 3: [base64 image]
    ├─► Background 4: [base64 image]
    └─► Background 5: [base64 image]
    │
    ▼
Figma Composition
    │
    ├─► createBackground() → [PRESERVE] Background
    ├─► createTextElements() → Headline + Subheadline
    └─► createiPhoneMockup() → [PRESERVE] iPhone Mockup
    │
    ▼
5 Complete Slides in Figma

┌─────────────────────────────────────────────────────────────────┐
│                  LOCALIZATION FLOW (TAB 1)                       │
└─────────────────────────────────────────────────────────────────┘

Select Frame
    │
    └─► App Store Screenshots (parent frame)
    │
    ▼
Collect Text Nodes
    │
    ├─► collectTextNodes([frame])
    │   └─► Returns all TextNodes (Headline, Subheadline × 5)
    │
    └─► collectLocalizableTextNodes([frame]) [optional]
        └─► Returns only TextNodes not in [PRESERVE] containers
    │
    ▼
Extract Text
    │
    ├─► texts = textNodes.map(n => n.characters)
    └─► ["Transform Your Workflow", "Boost productivity", ...]
    │
    ▼
Translate via API
    │
    ├─► sourceLang: "en"
    ├─► targetLangs: ["es", "fr", "de"]
    └─► Returns translations for each language
    │
    ▼
Create Cloned Frames
    │
    ├─► For each target language:
    │   ├─► Clone original frame
    │   ├─► Update text nodes with translations
    │   ├─► Preserve [PRESERVE] elements
    │   └─► Position next to original
    │
    ▼
Localized Frames Ready for Export
```

## Element Type Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                    ELEMENT TYPES                                 │
└─────────────────────────────────────────────────────────────────┘

Element Name              | Type      | Localizable | Preserved
─────────────────────────────────────────────────────────────────
Slide Frame               | FRAME     | No          | Yes (container)
[PRESERVE] Background     | RECTANGLE | No          | Yes ✓
Headline                  | TEXT      | Yes ✓       | No
Subheadline               | TEXT      | Yes ✓       | No
[PRESERVE] iPhone Mockup  | FRAME     | No          | Yes ✓
App Screenshot            | RECTANGLE | No          | Yes ✓
Screenshot Placeholder    | RECTANGLE | No          | Yes ✓
```

## Compatibility Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                  TAB 1 COMPATIBILITY                             │
└─────────────────────────────────────────────────────────────────┘

Feature                          | Tab 2 Support | Tab 1 Support
────────────────────────────────────────────────────────────────
TextNode elements                | ✓ Yes         | ✓ Yes
collectTextNodes() compatible    | ✓ Yes         | ✓ Yes
characters property accessible   | ✓ Yes         | ✓ Yes
Font loading                     | ✓ Yes         | ✓ Yes
setText() compatible             | ✓ Yes         | ✓ Yes
smartOverflow() compatible       | ✓ Yes         | ✓ Yes
Frame cloning                    | ✓ Yes         | ✓ Yes
[PRESERVE] marker support        | ✓ Yes         | ○ Optional
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                  INTEGRATION POINTS                              │
└─────────────────────────────────────────────────────────────────┘

1. Element Creation (Tab 2)
   ├─► figma.createText() → TextNode
   ├─► node.name = "Headline" | "Subheadline"
   ├─► node.characters = text content
   └─► node.fontName, fontSize, etc.

2. Element Collection (Tab 1)
   ├─► collectTextNodes(nodes)
   ├─► Filter by node.type === 'TEXT'
   └─► Return array of TextNodes

3. Text Update (Tab 1)
   ├─► await figma.loadFontAsync(node.fontName)
   ├─► node.characters = translatedText
   └─► await smartOverflow(node, preset)

4. Frame Cloning (Tab 1)
   ├─► clone = frame.clone()
   ├─► clone.name = `${frame.name} [${sourceLang} → ${targetLang}]`
   └─► Position clone next to original
```

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         KEY POINTS                               │
└─────────────────────────────────────────────────────────────────┘

✓ Tab 2 creates proper TextNodes for all text elements
✓ [PRESERVE] prefix marks non-localizable elements
✓ Descriptive layer names for easy identification
✓ Full compatibility with Tab 1's collectTextNodes()
✓ Visual elements preserved during localization
✓ Complete workflow: Generate → Localize → Export
```
