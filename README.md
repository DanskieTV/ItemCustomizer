# Kuro Item Customizer

## What This Is
My custom item tool for FiveM servers. Converts items between different formats, builds new items from scratch, resizes images, and compares code changes. All in one clean interface.

## How To Use

### Quick Start
1. **Open:** `react-app\buildbuild\index.html` in your browser
2. **That's it!** Everything is already built and ready to go

### For Developers (Optional)
If you want to modify the code:
1. **Install:** `npm install` (in the react-app folder)
2. **Run:** `npm start` for development
3. **Build:** `npm run build` when done

## What's Inside

### 🔄 Converter Tab
- Upload your items.lua file
- Convert between QB Block, Optimized, and OX formats
- Download the converted file
- Shows how many items were found

### 🛠️ Item Builder Tab  
- Type an item key (like "custom_weapon")
- Auto-fills label, weight, type, image, and description
- Smart defaults for unique/useable/combinable based on item type
- Choose output format (QB Block, Optimized, or OX)
- Copy to clipboard or download

### 🖼️ Image Resizer Tab
- Drag & drop images to resize to 100x100
- Batch process multiple images
- Download individual or all resized images
- Maintains aspect ratio option

### 🔍 Diff Viewer Tab
- Compare two pieces of code side by side
- "From Output" button loads current tab's output
- Copy either side to clipboard

## V1 vs V2 - The Evolution

### **OLD V1 (Basic 2-Stroke Engine):**
- ❌ **Shared Preview:** All tabs used the same preview area - confusing as hell
- ❌ **Manual Everything:** Had to manually type every field, no auto-fill
- ❌ **Generic Inputs:** Just text boxes, no dropdowns or smart defaults
- ❌ **Broken Builder:** Item builder showed "No items found" error
- ❌ **No Copy Function:** Had to manually select and copy text
- ❌ **Basic UI:** Plain interface, no real organization

### **NEW V2 (Supercharged Big Block Engine):**
- ✅ **Dedicated Previews:** Each tab has its own preview area - no more confusion
- ✅ **Smart Auto-Fill:** Type "custom_weapon" and it auto-fills everything intelligently
- ✅ **Smart Dropdowns:** Type/unique/useable fields are proper dropdowns with logic
- ✅ **Working Builder:** Item builder actually works and shows your built items
- ✅ **One-Click Copy:** Copy buttons on every preview with clipboard API
- ✅ **Professional UI:** Clean tabs, proper labels, organized layout

### **Under The Hood Improvements:**

**OLD:** Single shared state for all previews
**NEW:** Separate state management - `converterOutput` and `builderOutput`

**OLD:** Basic text parsing that broke on single items
**NEW:** Direct generation system that creates proper output for each format

**OLD:** Manual field entry with no intelligence
**NEW:** Smart type detection - weapons get unique=true, food gets useable=true, etc.

**OLD:** Generic "outputText" everywhere
**NEW:** Context-aware outputs that know which tab they belong to

**OLD:** Basic HTML inputs
**NEW:** Proper form controls with validation and user experience

## File Structure
```
react-app/
├── src/App.js          # Main app with all features
├── src/index.js        # React entry point  
├── src/index.css       # Styles
├── public/index.html   # HTML template
└── package.json        # Dependencies
```

## My Custom Colors
- **Kuro Green:** #55fa9a
- **Kuro Purple:** #6d28d9

## Notes
- Runs entirely in browser (no server needed)
- Works offline once loaded
- Production build is optimized and minified
- All original features preserved and enhanced
