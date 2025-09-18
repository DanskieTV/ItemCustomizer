# 🔧 Item Lua Converter

A powerful web-based tool for converting and managing QBCore item files. Built to solve the pain of manually converting thousands of items between different formats.


⚠️ IMPORTANT WARNING
Before using the Optimized format, make sure you have a complete backup of your items.lua file.
If you lose anything, you’re on your own  you’ve been warned!

## 🚀 Features

### **Multi-Format Converter**
- **Original Block**: Standard QBShared.Items format
- **Optimized ⭐**: Ultra-compact format (recommended for best performance)
- **Compact Pipe**: Pipe-separated single line format
- **JSON**: Clean JSON structure for APIs
- **CSV**: Comma-separated for spreadsheets

### **Item Builder**
Create new items with a smart form that auto-populates fields based on the item name:
- Type `assault_rifle` → automatically suggests weapon type, 2000g weight
- Type `burger` → automatically suggests food type, 100g weight
- Auto-generates proper labels and image filenames

### **Image Resizer**
Batch resize item images to 100x100 pixels (QBCore standard):
- Drag & drop multiple images
- Automatic resizing with progress bar
- Download individual or all resized images

## 🎯 Why I Built This

Working on FiveM servers, I got tired of manually converting item files between formats. Most servers stick with the bloated standard format because converting thousands of items manually is a nightmare. This tool solves that problem.

**Real-world tested**: Successfully converted 3,491 items from a 20k+ line file with zero errors on a live server.

## 🛠️ How to Use

### **Converter**
1. Upload your `items.lua` file
2. Choose your output format (Optimized recommended)
3. Click Convert
4. Download the converted file
5. Use "View Changes" to see a GitHub-style diff

### **Item Builder**
1. Go to the Item Builder tab
2. Type an item name (e.g., `custom_weapon`)
3. Watch it auto-populate the other fields
4. Adjust any values as needed
5. Choose your output format
6. Click "Build Item" and download

### **Image Resizer**
1. Go to the Image Resizer tab
2. Drag & drop your item images
3. Wait for processing (shows progress)
4. Download the 100x100 resized images

## 📁 File Structure

```
item-customizer/
├── index.html          # Main interface
├── converter.js        # Core conversion logic
├── styles.css          # Dark theme styling
├── diff-viewer.html    # Before/after comparison
└── README.md          # This file
```

## 🎨 Features I'm Proud Of

- **Smart Parsing**: Handles both `['item'] = {}` and `item = {}` formats
- **Real-time Validation**: Shows item counts and validates conversions
- **Epilepsy-Safe**: No flashing animations (my wife is pre-epileptic)
- **Production Ready**: Works with live servers, handles 20k+ line files
- **Auto-Population**: Intelligent field suggestions based on item names
- **Syntax Highlighting**: Beautiful code display with proper Lua highlighting

## 🔧 Technical Details

- **Pure JavaScript**: No dependencies, runs entirely in the browser
- **Canvas API**: For image resizing
- **SessionStorage**: For large file handling
- **Chunked Processing**: Handles massive files without freezing
- **Error Handling**: Comprehensive validation and error reporting

## 🚀 Performance

- **3,491 items** converted in seconds
- **268,917 characters** generated output
- **Zero server crashes** when testing on live server
- **Memory efficient** chunked processing

## 💡 Pro Tips

1. **Use Optimized format** for best performance - it's what I use on my server
2. **Test with character selection** - if you can select a character without black screen, your items are valid
3. **Use the diff viewer** to verify all items were converted correctly
4. **Batch resize images** before adding new items to your server


## 🔧 Format Usage Guide

### **Original Block Format**
```lua
QBShared.Items = {
    ['item_name'] = {
        ['name'] = 'item_name',
        ['label'] = 'Item Label',
        ['weight'] = 100,
        ['type'] = 'item',
        ['image'] = 'item.png',
        ['unique'] = false,
        ['useable'] = true,
        ['shouldClose'] = true,
        ['combinable'] = nil,
        ['description'] = 'Item description'
    }
}
```
# QB-Core Items Optimized Format

**Best for**: Compatibility, readability, debugging

### **Optimized Format** ⭐
```lua
Required Header

Paste this at the top of your items.lua file (under the QBShared items list):

local function add_item(k, l, w, t, i, u, us, d)
  QBShared.Items[k] = {
    name = k, label = l, weight = w, type = t, image = i,
    unique = u, useable = us, shouldClose = true, description = d
  }
end

Your converted items will look like this:
add_item('roach', 'Roach', 0, 'item', 'roach.png', false, true, 'Required to roll joints!')
add_item('weed_bag', 'Weed Bag', 1, 'item', 'weed_bag.png', false, true, 'A bag of sticky icky.')
add_item('grinder', 'Grinder', 500, 'item', 'grinder.png', true, true, 'Used to grind weed buds.')


Just add your converted items under the required header after end on a new line. should look like this 

-- Optimized items format - ultra compact
QBShared = QBShared or {}
QBShared.Items = QBShared.Items or {}

local function add_item(k, l, w, t, i, u, us, d)
  QBShared.Items[k] = {
    name = k, label = l, weight = w, type = t, image = i,
    unique = u, useable = us, shouldClose = true, description = d
  }
end

-- Items:
add_item('item', 'item', 25, 'item', 'item.png', false, true, '\"item\" }')
---
and thats it
```

### **Compact Pipe Format**
```
item_name | Item Label | 100 | item | item.png | false | true | Item description
```
**Best for**: Data processing, bulk editing, spreadsheet integration

### **JSON Format**
```json
{
  "QBShared": {
    "Items": {
      "item_name": {
        "name": "item_name",
        "label": "Item Label",
        "weight": 100,
        "type": "item",
        "image": "item.png",
        "unique": false,
        "useable": true,
        "shouldClose": true,
        "description": "Item description"
      }
    }
  }
}
```
**Best for**: APIs, web applications, data analysis

### **CSV Format**
```csv
key,name,label,weight,type,image,unique,useable,shouldClose,description
item_name,item_name,Item Label,100,item,item.png,false,true,true,Item description
```
**Best for**: Spreadsheets, database imports, bulk editing

## 🚨 Troubleshooting

### **⚠️ BACKUP YOUR FILES FIRST!**
- **ALWAYS** make a complete backup of your items.lua before converting
- **I'm not responsible** if you lose your items - you've been warned!
- **Test on a development server** before using on production

### **"Found X items but converted 0 items"**
- **Cause**: Parser couldn't read your file format
- **Fix**: Check your file uses standard QBShared.Items format
- **Check**: Make sure items use `['item_name'] = {}` or `item_name = {}` syntax

### **Black screen when selecting character**
- **Cause**: Invalid item syntax in your converted file
- **Fix**: Use the diff viewer to check for syntax errors
- **Check**: Look for missing commas, quotes, or brackets

### **"Error loading content" in diff viewer**
- **Cause**: File too large for URL parameters
- **Fix**: The tool now uses sessionStorage - this shouldn't happen anymore
- **If it does**: Try with a smaller file first

### **Parser stops at line X**
- **Cause**: Comments or malformed syntax confusing the parser
- **Fix**: Check around that line for:
  - Unclosed brackets `{` without `}`
  - Comments in the middle of item definitions
  - Missing commas between properties

### **Images not showing in game**
- **Cause**: Wrong image size or format
- **Fix**: Use the Image Resizer to make them 100x100 pixels
- **Check**: Ensure images are PNG format and properly named

### **Items not working after conversion**
- **Cause**: Missing required properties
- **Fix**: Check the diff viewer to ensure all properties were converted
- **Check**: Verify `name`, `label`, `weight`, `type`, `image` are present

### **Performance issues with large files**
- **Cause**: Browser memory limits
- **Fix**: The tool uses chunked processing - be patient
- **Tip**: Close other browser tabs to free up memory

### **Download not working**
- **Cause**: Browser blocking downloads
- **Fix**: Allow downloads for this site
- **Check**: Try right-click → "Save link as" on the download button

## 🎯 What Makes This Different

Most servers just accept the bloated standard format. This tool actually optimizes your items for better performance while maintaining full compatibility. Plus, the Item Builder makes creating new items a breeze instead of manually typing out all the properties.

## 📝 License

Free to use for any FiveM server. Just don't claim you made it 😉

---

## 🔮 Coming Soon - Future Features

### **Framework Support Expansion**
- **OX Inventory** - Full support for OX item formats
- **ESX** - Convert between ESX and QBCore formats
- **QBX** - Next-gen QBCore compatibility
- **Custom Frameworks** - Support for any custom item system

### **Advanced Image Tools**
- **Background Remover** - background removal for item images
- **Image Quality Enhancer** - Upscale and improve low-quality images

### **Weapon System Tools**
- **Weapon Builder** - Create weapons with proper stats and attachments
- **Weapon Config Generator** - Auto-generate weapon configs
- **Attachment Manager** - Manage weapon attachments and compatibility
- **Weapon Balance Calculator** - Calculate damage, range, and recoil stats

### **Map & Collision Tools**
- **Collision Map Fixer** - Fix collision issues without paying for expensive tools
- **Map Merger** - Merge multiple maps without conflicts
- **Prop Manager** - Manage and organize map props
- **Collision Optimizer** - Optimize collision meshes for better performance

### **Advanced Features**
- **Item Database** - Searchable database of community items
- **Import/Export** - Import from other servers, export to various formats
- **Item Validator** - Check for conflicts and issues and or duplicated items before converting

### **Developer Tools**
- **API Integration** - REST API for automated item management
- **Plugin System** - Extend functionality with custom plugins
- **Command Line Interface** - Use from terminal/scripts
- **Docker Support** - Run as a containerized service
- **Webhook Support** - Integrate with Discord, GitHub, etc.

---

## 💝 About This Project

*Built by Kuro-Sama - because manually converting 3000+ items is not fun*

### **My Philosophy**
I believe tools should be **FREE** and **OPEN SOURCE**. The FiveM community has been exploited by expensive, closed-source tools for too long. 

**My Promise:**
- ✅ **Always Free** - Never will I charge for basic functionality
- ✅ **Open Source** - Full source code available, modify as you wish
- ✅ **Community First** - Built by the community, for the community
- ✅ **No Exploitation** - No hidden fees, subscriptions, or paywalls
- ✅ **Credit Where Due** - Just give me credit, that's all I ask

### **Why I Built This**
Working on FiveM servers, I got tired of:
- Paying $30+  for basic collision map tools
- Manual item conversion taking hours
- Closed-source tools that break without support
- Expensive "premium" features that should be free

**This tool proves that quality development can be free and open source.**

### **Support the Project**
If this tool helps you, consider:
- ⭐ **Star the repository**
- 🐛 **Report bugs** and suggest features
- 💬 **Share with other server owners**
- 🔧 **Contribute code** if you're a developer

**Together, we can make FiveM development better for everyone!**


**My Current Project im working on now is a dynamic item creator that will allow you to make items and load them at run time without restarting the server**

---

*"I believe in tools should be made free so my tools will be free. I will never charge or exploit anyone for anything as long as it helps the community and makes servers better - then FREE shall it be!"* - Kuro-Sama
