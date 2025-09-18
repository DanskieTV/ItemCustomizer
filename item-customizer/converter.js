// Item Lua Converter - Multiple Format Support
class ItemConverter {
    constructor() {
        this.selectedFormat = 'original';
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Format selection
        document.querySelectorAll('input[name="format"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectedFormat = e.target.value;
                this.updateFormatInfo();
            });
        });

        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const convertBtn = document.getElementById('convertBtn');
        const viewDiffBtn = document.getElementById('viewDiffBtn');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        convertBtn.addEventListener('click', this.convertFile.bind(this));
        viewDiffBtn.addEventListener('click', (e) => {
            console.log('View Changes button clicked!');
            this.showDiffViewer();
        });

        // Copy to clipboard button
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.addEventListener('click', this.copyToClipboard.bind(this));

        // Clipboard conversion
        const convertClipboardBtn = document.getElementById('convertClipboard');
        const clipboardInput = document.getElementById('clipboardInput');
        convertClipboardBtn.addEventListener('click', this.convertClipboard.bind(this));
        
        // Auto-resize clipboard textarea
        clipboardInput.addEventListener('input', () => {
            clipboardInput.style.height = 'auto';
            clipboardInput.style.height = Math.max(120, clipboardInput.scrollHeight) + 'px';
        });

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Item Builder
        const buildItemBtn = document.getElementById('buildItemBtn');
        const downloadBuilderBtn = document.getElementById('downloadBuilderBtn');
        const itemNameInput = document.getElementById('itemName');
        
        if (buildItemBtn) {
            buildItemBtn.addEventListener('click', this.buildItem.bind(this));
        }
        if (downloadBuilderBtn) {
            downloadBuilderBtn.addEventListener('click', this.downloadBuilderItem.bind(this));
        }
        if (itemNameInput) {
            itemNameInput.addEventListener('input', this.autoPopulateFields.bind(this));
        }

        // Image Resizer
        const resizerArea = document.getElementById('resizerArea');
        const resizerInput = document.getElementById('resizerInput');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        
        if (resizerArea) {
            resizerArea.addEventListener('click', () => resizerInput.click());
            resizerArea.addEventListener('dragover', this.handleResizerDragOver.bind(this));
            resizerArea.addEventListener('dragleave', this.handleResizerDragLeave.bind(this));
            resizerArea.addEventListener('drop', this.handleResizerDrop.bind(this));
        }
        
        if (resizerInput) {
            resizerInput.addEventListener('change', this.handleResizerFileSelect.bind(this));
        }
        
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', this.downloadAllResized.bind(this));
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave() {
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handleFileSelect(e) {
        if (e.target.files.length > 0) {
            this.handleFile(e.target.files[0]);
        }
    }

    handleFile(file) {
        if (!file.name.endsWith('.lua')) {
            this.showError('Please select a .lua file');
            return;
        }

        this.selectedFile = file;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('convertBtn').disabled = false;
        this.hideError();
        this.hideResult();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateFormatInfo() {
        const formatInfo = document.getElementById('formatInfo');
        const formatDescriptions = {
            'original': {
                title: 'Original Block Format',
                description: 'Standard QBShared.Items format with full table structure. Best for compatibility and readability.'
            },
            'compact': {
                title: 'Compact Pipe Format',
                description: 'Pipe-separated values in a single line per item. Most efficient for large item lists.'
            },
            'json': {
                title: 'JSON Format',
                description: 'Clean JSON structure perfect for APIs, web applications, and data processing.'
            },
            'csv': {
                title: 'CSV Format',
                description: 'Comma-separated values ideal for spreadsheet applications and data analysis.'
            },
            'minimal': {
                title: 'Optimized Format',
                description: 'Ultra-compact format with only essential properties. Smallest file size possible. Recommended for best performance.'
            }
        };

        const selected = formatDescriptions[this.selectedFormat];
        if (selected) {
            formatInfo.innerHTML = `
                <h4>${selected.title}</h4>
                <p>${selected.description}</p>
            `;
            formatInfo.style.display = 'block';
        }
    }

    async convertFile() {
        if (!this.selectedFile) return;

        this.showProgress();
        this.hideError();
        this.hideResult();

        try {
            console.log('Reading file...');
            const content = await this.readFile(this.selectedFile);
            this.updateProgress(10);
            console.log(`File size: ${this.formatFileSize(content.length)}`);

            // Store original content for diff comparison
            this.originalContent = content;

            console.log('Parsing items...');
            const items = this.parseItems(content);
            this.updateProgress(50);
            console.log(`Found ${items.length} items`);

            console.log('Converting to format...');
            const convertedContent = await this.convertToFormatAsync(items, this.selectedFormat);
            this.updateProgress(90);

            // Store converted content for diff comparison
            this.convertedContent = convertedContent;

            console.log('Creating download...');
            const blob = new Blob([convertedContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            document.getElementById('downloadBtn').onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = `converted-items-${this.selectedFormat}.${this.getFileExtension()}`;
                a.click();
                URL.revokeObjectURL(url);
            };

            this.updateProgress(100);
            
            // Show detailed stats
            document.getElementById('totalItems').textContent = items.length;
            document.getElementById('outputSize').textContent = this.formatFileSize(blob.size);
            
            // Add validation info
            this.showValidationInfo(items, content);
            
            setTimeout(() => {
                this.hideProgress();
                document.getElementById('result').style.display = 'block';
                document.getElementById('stats').style.display = 'flex';
            }, 500);

        } catch (err) {
            this.hideProgress();
            console.error('Conversion error:', err);
            this.showError('Failed to convert file: ' + err.message);
        }
    }

    async convertClipboard() {
        const clipboardInput = document.getElementById('clipboardInput');
        const content = clipboardInput.value.trim();
        
        if (!content) {
            this.showError('Please paste some Lua code first!');
            return;
        }

        this.showProgress();
        this.hideError();
        this.hideResult();

        try {
            console.log('Converting clipboard content...');
            this.updateProgress(10);
            
            // Store original content for diff comparison
            this.originalContent = content;
            
            console.log('Parsing items from clipboard...');
            let items = this.parseItemsFlexible(content);
            
            // If flexible parser finds nothing, try crafting format parser
            if (items.length === 0) {
                console.log('Trying crafting format parser...');
                items = this.parseCraftingFormat(content);
            }
            
            this.updateProgress(50);
            console.log(`Found ${items.length} items`);
            
            if (items.length === 0) {
                this.hideProgress();
                this.showError('No valid items found in the pasted code. Make sure you\'re pasting Lua item definitions or try a different format.');
                return;
            }
            
            console.log('Converting to format...');
            const convertedContent = await this.convertToFormatAsync(items, this.selectedFormat);
            this.updateProgress(90);
            
            // Store converted content for diff comparison
            this.convertedContent = convertedContent;
            
            console.log('Creating download...');
            const blob = new Blob([convertedContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            document.getElementById('downloadBtn').onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = `converted-items-${this.selectedFormat}.${this.getFileExtension()}`;
                a.click();
                URL.revokeObjectURL(url);
            };
            
            this.updateProgress(100);
            
            // Show detailed stats
            document.getElementById('totalItems').textContent = items.length;
            document.getElementById('outputSize').textContent = this.formatFileSize(blob.size);
            
            // Add validation info
            this.showValidationInfo(items, content);
            
            setTimeout(() => {
                this.hideProgress();
                document.getElementById('result').style.display = 'block';
                document.getElementById('stats').style.display = 'flex';
            }, 500);
            
        } catch (err) {
            this.hideProgress();
            console.error('Clipboard conversion error:', err);
            this.showError('Failed to convert clipboard content: ' + err.message);
        }
    }

    getFileExtension() {
        const extensions = {
            'original': 'lua',
            'compact': 'lua',
            'json': 'json',
            'csv': 'csv',
            'minimal': 'lua'
        };
        return extensions[this.selectedFormat] || 'lua';
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseItems(content) {
        console.log('Starting to parse large file...');
        console.log('File content preview:', content.substring(0, 500));
        const items = [];
        const lines = content.split('\n');
        let currentItem = null;
        let inItemsTable = false;
        let braceCount = 0;
        let foundOpeningBrace = false;
        let i = 0;

        console.log(`Total lines in file: ${lines.length}`);

        while (i < lines.length) {
            let line = lines[i].trim();
            
            // Check if we're entering the items table - be more flexible
            if ((line.includes('QBShared.Items') || line.includes('Items') || line.includes('items')) && line.includes('=')) {
                console.log(`Found items table at line ${i}: ${line}`);
                inItemsTable = true;
                foundOpeningBrace = false;
                i++;
                continue;
            }

            if (!inItemsTable) {
                i++;
                continue;
            }

            // Skip comments and empty lines
            if (line.startsWith('--') || line === '') {
                i++;
                continue;
            }

            // Only count braces that are NOT in comments
            // Remove comments from the line before checking for braces
            let cleanLine = line;
            const commentIndex = line.indexOf('--');
            if (commentIndex !== -1) {
                cleanLine = line.substring(0, commentIndex);
            }

            // Only count braces that are NOT part of individual items
            // Look for the main table closing brace (standalone } at the end)
            if (cleanLine.trim() === '}' && !cleanLine.includes('[') && !cleanLine.includes('=')) {
                // This is likely the main table closing brace
                console.log(`Found main table closing brace at line ${i}: "${line}"`);
                if (currentItem) {
                    items.push(currentItem);
                }
                break;
            }

            // Look for item keys - handle both ['itemname'] = { and itemname = {
            if (line.includes('=') && line.includes('{')) {
                let keyMatch = null;
                
                // Try bracket notation first: ['itemname'] = {
                if (line.includes('[') && line.includes(']')) {
                    keyMatch = line.match(/\[['"]([^'"]+)['"]\]\s*=\s*\{/);
                }
                // Try direct assignment: itemname = {
                else {
                    keyMatch = line.match(/^(\w+)\s*=\s*\{/);
                }
                
                if (keyMatch) {
                    console.log(`Found item key at line ${i}: "${keyMatch[1]}" (line: "${line}")`);
                    // Save previous item
                    if (currentItem) {
                        items.push(currentItem);
                    }
                    currentItem = { key: keyMatch[1] };
                }
                i++;
                continue;
            }

            // Debug: Log every line we're processing to see what's happening
            if (i >= 10 && i <= 20) {
                console.log(`Line ${i}: "${line}" (clean: "${cleanLine}") - braceCount: ${braceCount}`);
            }

            // Parse item properties - only if we have a current item and this looks like a property
            if (currentItem && line.includes('=') && !line.includes('{') && !line.includes('}') && 
                (line.includes('[') || line.match(/^\s*\w+\s*=/))) {
                // Handle multi-line values and complex structures
                let fullLine = line;
                
                // Check if this line continues on the next line (no comma at end)
                while (i + 1 < lines.length && !fullLine.endsWith(',') && !fullLine.endsWith('}')) {
                    i++;
                    const nextLine = lines[i].trim();
                    if (nextLine === '' || nextLine.startsWith('--')) continue;
                    fullLine += ' ' + nextLine;
                }

                // Handle both bracket notation ['prop'] = value and direct prop = value
                let match = fullLine.match(/\[['"]([^'"]+)['"]\]\s*=\s*(.+),?$/);
                if (!match) {
                    match = fullLine.match(/(\w+)\s*=\s*(.+),?$/);
                }
                if (match) {
                    const [, prop, value] = match;
                    let cleanValue = value.replace(/,$/, '').trim();
                    
                    // Debug: Log property parsing
                    console.log(`Parsing property: ${prop} = "${value}" -> cleanValue: "${cleanValue}"`);
                    
                    // Handle quoted strings
                    if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) || 
                        (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
                        cleanValue = cleanValue.slice(1, -1);
                    }
                    
                    // Handle boolean values
                    if (cleanValue === 'true') cleanValue = true;
                    else if (cleanValue === 'false') cleanValue = false;
                    
                    // Handle numeric values
                    else if (!isNaN(cleanValue) && cleanValue !== '') {
                        cleanValue = parseFloat(cleanValue);
                    }
                    
                    // Handle nil values
                    if (cleanValue === 'nil') cleanValue = null;
                    
                    currentItem[prop] = cleanValue;
                    console.log(`Set ${prop} = ${JSON.stringify(cleanValue)}`);
                }
            }

            // Update progress for large files
            if (items.length % 100 === 0 && items.length > 0) {
                this.updateProgress(20 + (items.length / 200) * 30); // 20-50% for parsing
                console.log(`Parsed ${items.length} items...`);
            }

            i++;
        }

        console.log(`Finished parsing ${items.length} items`);
        
        // Debug: Show first few and last few items
        if (items.length > 0) {
            console.log('First 5 items found:', items.slice(0, 5).map(item => item.key));
            console.log('Last 5 items found:', items.slice(-5).map(item => item.key));
        }
        
        return items;
    }

    parseItemsFlexible(content) {
        console.log('Starting flexible parsing for clipboard content...');
        console.log('Content preview:', content.substring(0, 500));
        
        const items = [];
        const lines = content.split('\n');
        let currentItem = null;
        let i = 0;

        console.log(`Total lines in content: ${lines.length}`);

        while (i < lines.length) {
            let line = lines[i].trim();
            
            // Skip comments and empty lines
            if (line.startsWith('--') || line === '') {
                i++;
                continue;
            }

            // Look for item keys - handle both ['itemname'] = { and itemname = {
            if (line.includes('=') && line.includes('{')) {
                let keyMatch = null;
                
                // Try bracket notation first: ['itemname'] = {
                if (line.includes('[') && line.includes(']')) {
                    keyMatch = line.match(/\[['"]([^'"]+)['"]\]\s*=\s*\{/);
                }
                // Try direct assignment: itemname = {
                else {
                    keyMatch = line.match(/^(\w+)\s*=\s*\{/);
                }
                
                if (keyMatch) {
                    console.log(`Found item key at line ${i}: "${keyMatch[1]}" (line: "${line}")`);
                    // Save previous item
                    if (currentItem) {
                        items.push(currentItem);
                    }
                    currentItem = { key: keyMatch[1] };
                }
                i++;
                continue;
            }

            // Parse item properties - only if we have a current item and this looks like a property
            if (currentItem && line.includes('=') && !line.includes('{') && !line.includes('}') && 
                (line.includes('[') || line.match(/^\s*\w+\s*=/))) {
                
                // Handle multi-line values and complex structures
                let fullLine = line;
                
                // Check if this line continues on the next line (no comma at end)
                while (i + 1 < lines.length && !fullLine.endsWith(',') && !fullLine.endsWith('}')) {
                    i++;
                    const nextLine = lines[i].trim();
                    if (nextLine === '' || nextLine.startsWith('--')) continue;
                    fullLine += ' ' + nextLine;
                }

                // Handle both bracket notation ['prop'] = value and direct prop = value
                let match = fullLine.match(/\[['"]([^'"]+)['"]\]\s*=\s*(.+),?$/);
                if (!match) {
                    match = fullLine.match(/(\w+)\s*=\s*(.+),?$/);
                }
                if (match) {
                    const [, prop, value] = match;
                    let cleanValue = value.replace(/,$/, '').trim();
                    
                    // Debug: Log property parsing
                    console.log(`Parsing property: ${prop} = "${value}" -> cleanValue: "${cleanValue}"`);
                    
                    // Handle quoted strings
                    if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) || 
                        (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
                        cleanValue = cleanValue.slice(1, -1);
                    }
                    
                    // Handle boolean values
                    if (cleanValue === 'true') cleanValue = true;
                    else if (cleanValue === 'false') cleanValue = false;
                    
                    // Handle numeric values
                    else if (!isNaN(cleanValue) && cleanValue !== '') {
                        cleanValue = parseFloat(cleanValue);
                    }
                    
                    // Handle nil values
                    if (cleanValue === 'nil') cleanValue = null;
                    
                    currentItem[prop] = cleanValue;
                    console.log(`Set ${prop} = ${JSON.stringify(cleanValue)}`);
                }
            }

            // Check for end of current item
            if (currentItem && line.includes('}')) {
                items.push(currentItem);
                currentItem = null;
            }

            i++;
        }

        // Don't forget the last item
        if (currentItem) {
            items.push(currentItem);
        }

        console.log(`Flexible parsing found ${items.length} items`);
        if (items.length > 0) {
            console.log('First 5 items found:', items.slice(0, 5).map(item => item.key));
            console.log('Last 5 items found:', items.slice(-5).map(item => item.key));
        }
        
        return items;
    }

    parseCraftingFormat(content) {
        console.log('Starting crafting format parsing...');
        console.log('Content preview:', content.substring(0, 500));
        
        const items = [];
        const lines = content.split('\n');
        let i = 0;

        console.log(`Total lines in content: ${lines.length}`);

        while (i < lines.length) {
            let line = lines[i].trim();
            
            // Skip comments and empty lines
            if (line.startsWith('--') || line === '') {
                i++;
                continue;
            }

            // Look for crafting format: ['itemname'] = createCraftable(...)
            const craftingMatch = line.match(/\[['"]([^'"]+)['"]\]\s*=\s*createCraftable\s*\(/);
            if (craftingMatch) {
                const itemKey = craftingMatch[1];
                console.log(`Found crafting item: ${itemKey}`);
                
                // Find the opening parenthesis and collect all parameters
                let paramStart = line.indexOf('createCraftable(') + 'createCraftable('.length;
                let params = '';
                let parenCount = 1;
                let currentLine = line.substring(paramStart);
                
                // Collect all parameters across multiple lines
                while (i < lines.length && parenCount > 0) {
                    for (let char of currentLine) {
                        if (char === '(') parenCount++;
                        else if (char === ')') parenCount--;
                        if (parenCount > 0) params += char;
                    }
                    
                    if (parenCount > 0) {
                        i++;
                        if (i < lines.length) {
                            currentLine = lines[i];
                        }
                    }
                }
                
                // Parse the parameters
                const parsedItem = this.parseCraftingParams(itemKey, params);
                if (parsedItem) {
                    items.push(parsedItem);
                    console.log(`Parsed crafting item: ${itemKey} -> ${parsedItem.label}`);
                }
            }

            i++;
        }

        console.log(`Crafting format parsing found ${items.length} items`);
        if (items.length > 0) {
            console.log('First 5 items found:', items.slice(0, 5).map(item => item.key));
        }
        
        return items;
    }

    parseCraftingParams(itemKey, params) {
        try {
            // Split parameters by comma, but be careful with nested structures
            const paramList = this.splitCraftingParams(params);
            
            if (paramList.length < 5) {
                console.log(`Not enough parameters for ${itemKey}: ${paramList.length}`);
                return null;
            }
            
            // Extract basic parameters
            const name = this.cleanString(paramList[0]);
            const label = this.cleanString(paramList[1]);
            const image = this.cleanString(paramList[2]);
            const type = this.cleanString(paramList[3]);
            const color = this.cleanString(paramList[4]);
            const description = paramList.length > 5 ? this.cleanString(paramList[5]) : '';
            
            // Create QBCore item structure
            const item = {
                key: itemKey,
                name: name || itemKey,
                label: label || this.formatLabel(itemKey),
                weight: 100, // Default weight for weapons
                type: type || 'weapon',
                image: image || 'default.png',
                unique: true, // Weapons are typically unique
                useable: true,
                shouldClose: true,
                combinable: null,
                description: description || `A ${label || itemKey}`
            };
            
            return item;
            
        } catch (error) {
            console.error(`Error parsing crafting params for ${itemKey}:`, error);
            return null;
        }
    }

    splitCraftingParams(params) {
        const result = [];
        let current = '';
        let depth = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < params.length; i++) {
            const char = params[i];
            
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
                current += char;
            } else if (inString && char === stringChar) {
                inString = false;
                stringChar = '';
                current += char;
            } else if (!inString && char === '(') {
                depth++;
                current += char;
            } else if (!inString && char === ')') {
                depth--;
                current += char;
            } else if (!inString && char === ',' && depth === 0) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        if (current.trim()) {
            result.push(current.trim());
        }
        
        return result;
    }

    cleanString(str) {
        if (!str) return '';
        str = str.trim();
        if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
            return str.slice(1, -1);
        }
        return str;
    }

    formatLabel(itemKey) {
        return itemKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    convertToFormat(items, format) {
        console.log(`convertToFormat called with ${items.length} items, format: ${format}`);
        console.log('First few items:', items.slice(0, 3));
        
        let result;
        switch (format) {
            case 'original':
                result = this.convertToOriginal(items);
                break;
            case 'compact':
                result = this.convertToCompact(items);
                break;
            case 'json':
                result = this.convertToJSON(items);
                break;
            case 'csv':
                result = this.convertToCSV(items);
                break;
            case 'minimal':
                result = this.convertToMinimal(items);
                break;
            default:
                result = this.convertToCompact(items);
        }
        
        console.log(`convertToFormat result length: ${result.length}`);
        return result;
    }

    async convertToFormatAsync(items, format) {
        console.log(`convertToFormatAsync called with ${items.length} items, format: ${format}`);
        console.log('First few items:', items.slice(0, 3));
        
        // For large files, process in chunks to avoid blocking the UI
        const chunkSize = 1000;
        let result = '';
        
        if (items.length <= chunkSize) {
            // Small files - process normally
            console.log('Using regular convertToFormat for small file');
            return this.convertToFormat(items, format);
        }
        
        // Large files - process in chunks
        console.log(`Processing ${items.length} items in chunks of ${chunkSize}...`);
        
        // Get the header/footer for the format
        const { header, footer, processChunk } = this.getFormatTemplate(format);
        console.log('Got format template:', { header: header.substring(0, 50) + '...', footer, processChunk: typeof processChunk });
        result += header;
        
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            console.log(`Processing chunk ${i}-${i + chunkSize}, items: ${chunk.length}`);
            const chunkResult = processChunk(chunk);
            console.log(`Chunk result length: ${chunkResult.length}`);
            result += chunkResult;
            
            // Update progress
            const progress = 50 + ((i + chunkSize) / items.length) * 40; // 50-90%
            this.updateProgress(Math.min(progress, 90));
            
            // Allow UI to update
            if (i % (chunkSize * 5) === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        result += footer;
        console.log(`Final result length: ${result.length}`);
        return result;
    }

    getFormatTemplate(format) {
        const self = this; // Capture the context
        switch (format) {
            case 'original':
                return {
                    header: `QBShared = QBShared or {}
QBShared.Items = {
`,
                    footer: `}`,
                    processChunk: (chunk) => {
                        let result = '';
                        for (const item of chunk) {
                            if (!item.key) continue;
                            result += `    ['${self.escapeLuaString(item.key)}'] = {\n`;
                            result += `        name = '${self.escapeLuaString(item.key)}',\n`;
                            result += `        label = '${self.escapeLuaString(item.label || item.name || item.key)}',\n`;
                            result += `        weight = ${item.weight || 0},\n`;
                            result += `        type = '${self.escapeLuaString(item.type || 'item')}',\n`;
                            result += `        image = '${self.escapeLuaString(item.image || 'default.png')}',\n`;
                            result += `        unique = ${item.unique || false},\n`;
                            result += `        useable = ${item.useable || false},\n`;
                            result += `        shouldClose = ${item.shouldClose !== undefined ? item.shouldClose : true},\n`;
                            if (item.description) result += `        description = '${self.escapeLuaString(item.description)}',\n`;
                            if (item.ammotype) result += `        ammotype = '${self.escapeLuaString(item.ammotype)}',\n`;
                            if (item.combinable) result += `        combinable = ${JSON.stringify(item.combinable)},\n`;
                            for (const [key, value] of Object.entries(item)) {
                                if (!['key', 'name', 'label', 'weight', 'type', 'image', 'unique', 'useable', 'description', 'ammotype', 'shouldClose', 'combinable'].includes(key)) {
                                    if (typeof value === 'string') {
                                        result += `        ${key} = '${self.escapeLuaString(value)}',\n`;
                                    } else {
                                        result += `        ${key} = ${value},\n`;
                                    }
                                }
                            }
                            result += `    },\n`;
                        }
                        return result;
                    }
                };
            case 'compact':
                return {
                    header: `-- Compact items loader: one line per item using pipes (|).
QBShared = QBShared or {}
QBShared.Items = QBShared.Items or {}

local function trim(s) return (s:gsub("^%s+",""):gsub("%s+$","")) end
local function tobool(s)
  s = s and s:lower()
  if s == "true" then return true end
  if s == "false" then return false end
  return nil
end
local function tonum(s)
  local n = tonumber(s)
  return n or s
end
local function parse_extras(s)
  local t = {}
  if not s or s == "" then return t end
  for pair in s:gmatch("[^;]+") do
    local k,v = pair:match("^%s*([^=]+)%s*=%s*(.+)%s*$")
    if k then
      v = trim(v)
      local bv = tobool(v)
      if bv ~= nil then
        t[k] = bv
      elseif v:match("^%d+$") then
        t[k] = tonumber(v)
      else
        t[k] = v
      end
    end
  end
  return t
end

local function add_compact_line(line)
  local cols = {}
  for part in line:gmatch("[^|]+") do cols[#cols+1] = trim(part) end
  if #cols < 8 then return end
  local key, label, weight, itype, image, unique, useable, desc = cols[1], cols[2], tonum(cols[3]), cols[4], cols[5], tobool(cols[6]), tobool(cols[7]), cols[8]
  local ammotype = cols[9] and cols[9] ~= "" and cols[9] or nil
  local extras = parse_extras(cols[10])

  local item = {
    name        = key,
    label       = label,
    weight      = type(weight)=="number" and weight or tonumber(weight) or 0,
    type        = itype,
    image       = image,
    unique      = unique == true,
    useable     = useable == true,
    shouldClose = (extras.shouldClose ~= nil) and extras.shouldClose or true,
    combinable  = extras.combinable or nil,
    description = desc,
    ammotype    = ammotype,
  }

  for k,v in pairs(extras) do
    if k ~= "shouldClose" and k ~= "combinable" then
      item[k] = v
    end
  end

  QBShared.Items[key] = item
end

local function load_compact_block(block)
  for raw in block:gmatch("[^\r\n]+") do
    local line = trim(raw)
    if line ~= "" and not line:match("^%-%-") and not line:match("^#") and not line:match("^##") then
      add_compact_line(line)
    end
  end
end

-- Converted items data:
`,
                    footer: '',
                    processChunk: (chunk) => {
                        let result = '';
                        for (const item of chunk) {
                            if (!item.key) continue;
                            const label = self.escapeLuaString(item.label || item.name || item.key);
                            const weight = item.weight || 0;
                            const type = self.escapeLuaString(item.type || 'item');
                            const image = self.escapeLuaString(item.image || 'default.png');
                            const unique = item.unique || false;
                            const useable = item.useable || false;
                            const description = self.escapeLuaString(item.description || '');
                            const ammotype = self.escapeLuaString(item.ammotype || '');
                            
                            const extras = [];
                            if (item.shouldClose !== undefined && item.shouldClose !== true) {
                                extras.push(`shouldClose=${item.shouldClose}`);
                            }
                            if (item.combinable) {
                                extras.push(`combinable=${JSON.stringify(item.combinable)}`);
                            }
                            for (const [key, value] of Object.entries(item)) {
                                if (!['key', 'name', 'label', 'weight', 'type', 'image', 'unique', 'useable', 'description', 'ammotype', 'shouldClose', 'combinable'].includes(key)) {
                                    if (typeof value === 'string') {
                                        extras.push(`${key}=${self.escapeLuaString(value)}`);
                                    } else {
                                        extras.push(`${key}=${value}`);
                                    }
                                }
                            }
                            
                            const extrasStr = extras.length > 0 ? extras.join(';') : '';
                            if (extrasStr) {
                                result += `${self.escapeLuaString(item.key)} | ${label} | ${weight} | ${type} | ${image} | ${unique} | ${useable} | ${description} | ${ammotype} | ${extrasStr}\n`;
                            } else {
                                result += `${self.escapeLuaString(item.key)} | ${label} | ${weight} | ${type} | ${image} | ${unique} | ${useable} | ${description} | ${ammotype}\n`;
                            }
                        }
                        return result;
                    }
                };
            case 'json':
                return {
                    header: '',
                    footer: '',
                    processChunk: (chunk) => {
                        const jsonItems = {};
                        for (const item of chunk) {
                            if (!item.key) continue;
                            const jsonItem = {
                                name: item.key,
                                label: item.label || item.name || item.key,
                                weight: item.weight || 0,
                                type: item.type || 'item',
                                image: item.image || 'default.png',
                                unique: item.unique || false,
                                useable: item.useable || false,
                                shouldClose: item.shouldClose !== undefined ? item.shouldClose : true
                            };
                            if (item.description) jsonItem.description = item.description;
                            if (item.ammotype) jsonItem.ammotype = item.ammotype;
                            if (item.combinable) jsonItem.combinable = item.combinable;
                            for (const [key, value] of Object.entries(item)) {
                                if (!['key', 'name', 'label', 'weight', 'type', 'image', 'unique', 'useable', 'description', 'ammotype', 'shouldClose', 'combinable'].includes(key)) {
                                    jsonItem[key] = value;
                                }
                            }
                            jsonItems[item.key] = jsonItem;
                        }
                        return JSON.stringify(jsonItems, null, 2);
                    }
                };
            case 'csv':
                return {
                    header: 'key,name,label,weight,type,image,unique,useable,shouldClose,description,ammotype\n',
                    footer: '',
                    processChunk: (chunk) => {
                        let result = '';
                        for (const item of chunk) {
                            if (!item.key) continue;
                            const row = [
                                item.key,
                                item.key,
                                item.label || item.name || item.key,
                                item.weight || 0,
                                item.type || 'item',
                                item.image || 'default.png',
                                item.unique || false,
                                item.useable || false,
                                item.shouldClose !== undefined ? item.shouldClose : true,
                                item.description || '',
                                item.ammotype || ''
                            ];
                            const escapedRow = row.map(cell => {
                                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                                    return `"${cell.replace(/"/g, '""')}"`;
                                }
                                return cell;
                            });
                            result += escapedRow.join(',') + '\n';
                        }
                        return result;
                    }
                };
            case 'minimal':
                return {
                    header: `-- Optimized items format - ultra compact
QBShared = QBShared or {}
QBShared.Items = QBShared.Items or {}

local function add_item(k, l, w, t, i, u, us, d)
  QBShared.Items[k] = {
    name = k, label = l, weight = w, type = t, image = i,
    unique = u, useable = us, shouldClose = true, description = d
  }
end

-- Items:
`,
                    footer: '',
                    processChunk: (chunk) => {
                        let result = '';
                        for (const item of chunk) {
                            if (!item.key) continue;
                            const label = self.escapeLuaString(item.label || item.name || item.key);
                            const weight = item.weight || 0;
                            const type = self.escapeLuaString(item.type || 'item');
                            const image = self.escapeLuaString(item.image || 'default.png');
                            const unique = item.unique || false;
                            const useable = item.useable || false;
                            const description = self.escapeLuaString(item.description || '');
                            result += `add_item('${self.escapeLuaString(item.key)}', '${label}', ${weight}, '${type}', '${image}', ${unique}, ${useable}, '${description}')\n`;
                        }
                        return result;
                    }
                };
            default:
                // For other formats, fall back to regular processing
                return {
                    header: '',
                    footer: '',
                    processChunk: (chunk) => self.convertToFormat(chunk, format)
                };
        }
    }

    convertToOriginal(items) {
        console.log(`convertToOriginal called with ${items.length} items`);
        let output = `QBShared = QBShared or {}
QBShared.Items = {
`;

        let processedCount = 0;
        for (const item of items) {
            if (!item.key) {
                console.log('Skipping item without key:', item);
                continue;
            }
            processedCount++;
            
            output += `    ['${this.escapeLuaString(item.key)}'] = {\n`;
            output += `        name = '${this.escapeLuaString(item.key)}',\n`;
            output += `        label = '${this.escapeLuaString(item.label || item.name || item.key)}',\n`;
            output += `        weight = ${item.weight || 0},\n`;
            output += `        type = '${this.escapeLuaString(item.type || 'item')}',\n`;
            output += `        image = '${this.escapeLuaString(item.image || 'default.png')}',\n`;
            output += `        unique = ${item.unique || false},\n`;
            output += `        useable = ${item.useable || false},\n`;
            output += `        shouldClose = ${item.shouldClose !== undefined ? item.shouldClose : true},\n`;
            if (item.description) output += `        description = '${this.escapeLuaString(item.description)}',\n`;
            if (item.ammotype) output += `        ammotype = '${this.escapeLuaString(item.ammotype)}',\n`;
            if (item.combinable) output += `        combinable = ${JSON.stringify(item.combinable)},\n`;
            
            // Add any extra properties
            for (const [key, value] of Object.entries(item)) {
                if (!['key', 'name', 'label', 'weight', 'type', 'image', 'unique', 'useable', 'description', 'ammotype', 'shouldClose', 'combinable'].includes(key)) {
                    if (typeof value === 'string') {
                        output += `        ${key} = '${this.escapeLuaString(value)}',\n`;
                    } else {
                        output += `        ${key} = ${value},\n`;
                    }
                }
            }
            
            output += `    },\n`;
        }

        output += `}`;
        console.log(`convertToOriginal processed ${processedCount} items, output length: ${output.length}`);
        return output;
    }

    convertToCompact(items) {
        let output = `-- Compact items loader: one line per item using pipes (|).
QBShared = QBShared or {}
QBShared.Items = QBShared.Items or {}

local function trim(s) return (s:gsub("^%s+",""):gsub("%s+$","")) end
local function tobool(s)
  s = s and s:lower()
  if s == "true" then return true end
  if s == "false" then return false end
  return nil
end
local function tonum(s)
  local n = tonumber(s)
  return n or s
end
local function parse_extras(s)
  local t = {}
  if not s or s == "" then return t end
  for pair in s:gmatch("[^;]+") do
    local k,v = pair:match("^%s*([^=]+)%s*=%s*(.+)%s*$")
    if k then
      v = trim(v)
      local bv = tobool(v)
      if bv ~= nil then
        t[k] = bv
      elseif v:match("^%d+$") then
        t[k] = tonumber(v)
      else
        t[k] = v
      end
    end
  end
  return t
end

local function add_compact_line(line)
  local cols = {}
  for part in line:gmatch("[^|]+") do cols[#cols+1] = trim(part) end
  if #cols < 8 then return end
  local key, label, weight, itype, image, unique, useable, desc = cols[1], cols[2], tonum(cols[3]), cols[4], cols[5], tobool(cols[6]), tobool(cols[7]), cols[8]
  local ammotype = cols[9] and cols[9] ~= "" and cols[9] or nil
  local extras = parse_extras(cols[10])

  local item = {
    name        = key,
    label       = label,
    weight      = type(weight)=="number" and weight or tonumber(weight) or 0,
    type        = itype,
    image       = image,
    unique      = unique == true,
    useable     = useable == true,
    shouldClose = (extras.shouldClose ~= nil) and extras.shouldClose or true,
    combinable  = extras.combinable or nil,
    description = desc,
    ammotype    = ammotype,
  }

  for k,v in pairs(extras) do
    if k ~= "shouldClose" and k ~= "combinable" then
      item[k] = v
    end
  end

  QBShared.Items[key] = item
end

local function load_compact_block(block)
  for raw in block:gmatch("[^\r\n]+") do
    local line = trim(raw)
    if line ~= "" and not line:match("^%-%-") and not line:match("^#") and not line:match("^##") then
      add_compact_line(line)
    end
  end
end

-- Converted items data:
`;

        for (const item of items) {
            if (!item.key) continue;
            
            const label = this.escapeLuaString(item.label || item.name || item.key);
            const weight = item.weight || 0;
            const type = this.escapeLuaString(item.type || 'item');
            const image = this.escapeLuaString(item.image || 'default.png');
            const unique = item.unique || false;
            const useable = item.useable || false;
            const description = this.escapeLuaString(item.description || '');
            const ammotype = this.escapeLuaString(item.ammotype || '');
            
            const extras = [];
            if (item.shouldClose !== undefined && item.shouldClose !== true) {
                extras.push(`shouldClose=${item.shouldClose}`);
            }
            if (item.combinable) {
                extras.push(`combinable=${JSON.stringify(item.combinable)}`);
            }
            for (const [key, value] of Object.entries(item)) {
                if (!['key', 'name', 'label', 'weight', 'type', 'image', 'unique', 'useable', 'description', 'ammotype', 'shouldClose', 'combinable'].includes(key)) {
                    if (typeof value === 'string') {
                        extras.push(`${key}=${this.escapeLuaString(value)}`);
                    } else {
                        extras.push(`${key}=${value}`);
                    }
                }
            }
            
            const extrasStr = extras.length > 0 ? extras.join(';') : '';
            output += `${this.escapeLuaString(item.key)} | ${label} | ${weight} | ${type} | ${image} | ${unique} | ${useable} | ${description} | ${ammotype} | ${extrasStr}\n`;
        }

        return output;
    }

    convertToJSON(items) {
        const jsonItems = {};
        
        for (const item of items) {
            if (!item.key) continue;
            
            const jsonItem = {
                name: item.key,
                label: item.label || item.name || item.key,
                weight: item.weight || 0,
                type: item.type || 'item',
                image: item.image || 'default.png',
                unique: item.unique || false,
                useable: item.useable || false,
                shouldClose: item.shouldClose !== undefined ? item.shouldClose : true
            };
            
            if (item.description) jsonItem.description = item.description;
            if (item.ammotype) jsonItem.ammotype = item.ammotype;
            if (item.combinable) jsonItem.combinable = item.combinable;
            
            // Add extra properties
            for (const [key, value] of Object.entries(item)) {
                if (!['key', 'name', 'label', 'weight', 'type', 'image', 'unique', 'useable', 'description', 'ammotype', 'shouldClose', 'combinable'].includes(key)) {
                    jsonItem[key] = value;
                }
            }
            
            jsonItems[item.key] = jsonItem;
        }
        
        return JSON.stringify({
            QBShared: {
                Items: jsonItems
            }
        }, null, 2);
    }

    convertToCSV(items) {
        const headers = ['key', 'name', 'label', 'weight', 'type', 'image', 'unique', 'useable', 'shouldClose', 'description', 'ammotype'];
        let output = headers.join(',') + '\n';
        
        for (const item of items) {
            if (!item.key) continue;
            
            const row = [
                item.key,
                item.key,
                item.label || item.name || item.key,
                item.weight || 0,
                item.type || 'item',
                item.image || 'default.png',
                item.unique || false,
                item.useable || false,
                item.shouldClose !== undefined ? item.shouldClose : true,
                item.description || '',
                item.ammotype || ''
            ];
            
            // Escape commas and quotes in CSV
            const escapedRow = row.map(cell => {
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            });
            
            output += escapedRow.join(',') + '\n';
        }
        
        return output;
    }

    convertToMinimal(items) {
        let output = `-- Optimized items format - ultra compact
QBShared = QBShared or {}
QBShared.Items = QBShared.Items or {}

local function add_item(k, l, w, t, i, u, us, d)
  QBShared.Items[k] = {
    name = k, label = l, weight = w, type = t, image = i,
    unique = u, useable = us, shouldClose = true, description = d
  }
end

-- Items:
`;

        for (const item of items) {
            if (!item.key) continue;
            
            const label = this.escapeLuaString(item.label || item.name || item.key);
            const weight = item.weight || 0;
            const type = this.escapeLuaString(item.type || 'item');
            const image = this.escapeLuaString(item.image || 'default.png');
            const unique = item.unique || false;
            const useable = item.useable || false;
            const description = this.escapeLuaString(item.description || '');
            
            output += `add_item('${this.escapeLuaString(item.key)}', '${label}', ${weight}, '${type}', '${image}', ${unique}, ${useable}, '${description}')\n`;
        }

        return output;
    }

    escapeLuaString(str) {
        if (typeof str !== 'string') return str;
        return str
            .replace(/\\/g, '\\\\')  // Escape backslashes first
            .replace(/'/g, "\\'")    // Escape single quotes
            .replace(/"/g, '\\"')    // Escape double quotes
            .replace(/\n/g, '\\n')   // Escape newlines
            .replace(/\r/g, '\\r')   // Escape carriage returns
            .replace(/\t/g, '\\t');  // Escape tabs
    }

    showValidationInfo(items, originalContent) {
        // Count items in original file using regex
        const originalItemMatches = originalContent.match(/\[['"][^'"]+['"]\]\s*=\s*\{/g);
        const originalItemCount = originalItemMatches ? originalItemMatches.length : 0;
        
        // Get some sample item names
        const sampleItems = items.slice(0, 5).map(item => item.key);
        const lastItems = items.slice(-3).map(item => item.key);
        
        // Create validation info
        const validationInfo = document.createElement('div');
        validationInfo.className = 'validation-info';
        validationInfo.innerHTML = `
            <div class="validation-stats">
                <div class="stat">
                    <div class="stat-number">${originalItemCount}</div>
                    <div class="stat-label">Items in Original</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${items.length}</div>
                    <div class="stat-label">Items Converted</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${originalItemCount === items.length ? '✅' : '⚠️'}</div>
                    <div class="stat-label">Status</div>
                </div>
            </div>
            <div class="sample-items">
                <h4>Sample Items (First 5):</h4>
                <div class="item-list">${sampleItems.map(item => `<span class="item-tag">${item}</span>`).join('')}</div>
                <h4>Last Items:</h4>
                <div class="item-list">${lastItems.map(item => `<span class="item-tag">${item}</span>`).join('')}</div>
            </div>
            ${originalItemCount !== items.length ? `
                <div class="warning">
                    <strong>⚠️ Warning:</strong> Found ${originalItemCount} items in original file but converted ${items.length} items. 
                    Some items may not have been parsed correctly.
                </div>
            ` : `
                <div class="success">
                    <strong>✅ Success:</strong> All ${items.length} items were successfully converted!
                </div>
            `}
        `;
        
        // Insert after stats
        const stats = document.getElementById('stats');
        stats.parentNode.insertBefore(validationInfo, stats.nextSibling);
    }

    showProgress() {
        document.getElementById('progress').style.display = 'block';
        document.getElementById('progressBar').style.width = '0%';
    }

    updateProgress(percent) {
        document.getElementById('progressBar').style.width = percent + '%';
    }

    hideProgress() {
        document.getElementById('progress').style.display = 'none';
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('error').style.display = 'block';
    }

    hideError() {
        document.getElementById('error').style.display = 'none';
    }

    hideResult() {
        document.getElementById('result').style.display = 'none';
        document.getElementById('stats').style.display = 'none';
    }

    async copyToClipboard() {
        if (!this.convertedContent) {
            this.showError('No converted content available to copy');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.convertedContent);
            
            // Visual feedback
            const copyBtn = document.getElementById('copyBtn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            copyBtn.classList.add('copied');
            
            // Reset after 2 seconds
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
            
            console.log('Content copied to clipboard successfully');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            this.showError('Failed to copy to clipboard. Please try downloading the file instead.');
        }
    }

    showDiffViewer() {
        console.log('showDiffViewer called');
        console.log('originalContent exists:', !!this.originalContent);
        console.log('convertedContent exists:', !!this.convertedContent);
        
        if (!this.originalContent || !this.convertedContent) {
            console.log('Missing content, showing error');
            this.showError('No content available for comparison');
            return;
        }

        // Store content in sessionStorage to avoid URL length limits
        try {
            sessionStorage.setItem('diff_original', this.originalContent);
            sessionStorage.setItem('diff_converted', this.convertedContent);
            sessionStorage.setItem('diff_format', this.selectedFormat);
            
            // Navigate to separate diff viewer page
            const diffUrl = `diff-viewer.html`;
            window.open(diffUrl, '_blank');
        } catch (error) {
            console.error('Error storing content:', error);
            this.showError('Content too large for comparison. Please try with a smaller file.');
        }
    }


    highlightLuaSyntax(code) {
        return code
            .replace(/--.*$/gm, '<span class="comment">$&</span>') // Comments
            .replace(/\b(function|local|if|then|else|elseif|end|for|while|do|return|and|or|not|true|false|nil)\b/g, '<span class="keyword">$1</span>') // Keywords
            .replace(/\b(QBShared|Items)\b/g, '<span class="variable">$1</span>') // Variables
            .replace(/(['"])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$&</span>') // Strings
            .replace(/\b\d+\.?\d*\b/g, '<span class="number">$&</span>') // Numbers
            .replace(/\[([^\]]+)\]/g, '<span class="bracket">[$1]</span>') // Brackets
            .replace(/(\{|\})/g, '<span class="brace">$1</span>') // Braces
            .replace(/(\||,|;)/g, '<span class="operator">$1</span>'); // Operators
    }

    addLineNumbers(code) {
        const lines = code.split('\n');
        return lines.map((line, index) => {
            const lineNumber = (index + 1).toString().padStart(3, ' ');
            return `<div class="code-line"><span class="line-number">${lineNumber}</span>${line}</div>`;
        }).join('\n');
    }

    // Navigation Methods
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    // Item Builder Methods
    autoPopulateFields() {
        const itemName = document.getElementById('itemName').value.trim();
        if (!itemName) return;

        // Auto-populate label (convert snake_case to Title Case)
        const itemLabel = itemName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        // Auto-populate image filename
        const itemImage = `${itemName}.png`;

        // Auto-populate label and image (always update these based on name)
        const labelField = document.getElementById('itemLabel');
        const imageField = document.getElementById('itemImage');
        
        labelField.value = itemLabel;
        imageField.value = itemImage;

        // Auto-suggest type based on name patterns
        const typeField = document.getElementById('itemType');
        const lowerName = itemName.toLowerCase();
        
        if (lowerName.includes('weapon') || lowerName.includes('gun') || lowerName.includes('rifle') || lowerName.includes('pistol')) {
            typeField.value = 'weapon';
        } else if (lowerName.includes('ammo') || lowerName.includes('bullet') || lowerName.includes('round')) {
            typeField.value = 'ammo';
        } else if (lowerName.includes('drug') || lowerName.includes('pill') || lowerName.includes('medicine')) {
            typeField.value = 'drug';
        } else if (lowerName.includes('food') || lowerName.includes('burger') || lowerName.includes('pizza') || lowerName.includes('sandwich')) {
            typeField.value = 'food';
        } else if (lowerName.includes('drink') || lowerName.includes('water') || lowerName.includes('soda') || lowerName.includes('beer')) {
            typeField.value = 'drink';
        } else {
            typeField.value = 'item';
        }

        // Auto-suggest weight based on type
        const weightField = document.getElementById('itemWeight');
        const selectedType = typeField.value;
        
        if (selectedType === 'weapon') {
            weightField.value = '2000';
        } else if (selectedType === 'ammo') {
            weightField.value = '1';
        } else if (selectedType === 'food' || selectedType === 'drink') {
            weightField.value = '100';
        } else if (selectedType === 'drug') {
            weightField.value = '5';
        } else {
            weightField.value = '25';
        }
    }

    buildItem() {
        const itemName = document.getElementById('itemName').value.trim();
        const itemLabel = document.getElementById('itemLabel').value.trim();
        const itemWeight = parseInt(document.getElementById('itemWeight').value) || 25;
        const itemType = document.getElementById('itemType').value;
        const itemImage = document.getElementById('itemImage').value.trim();
        const itemUnique = document.getElementById('itemUnique').value === 'true';
        const itemUseable = document.getElementById('itemUseable').value === 'true';
        const itemDescription = document.getElementById('itemDescription').value.trim();
        const builderFormat = document.getElementById('builderFormat').value;

        if (!itemName || !itemLabel || !itemImage) {
            alert('Please fill in all required fields (Name, Label, Image)');
            return;
        }

        // Create item object
        const item = {
            key: itemName,
            name: itemName,
            label: itemLabel,
            weight: itemWeight,
            type: itemType,
            image: itemImage,
            unique: itemUnique,
            useable: itemUseable,
            shouldClose: true,
            combinable: null,
            description: itemDescription
        };

        // Convert to selected format
        const convertedItem = this.convertToFormat([item], builderFormat);
        
        // Display result with syntax highlighting
        const outputElement = document.getElementById('builderOutput');
        outputElement.innerHTML = this.highlightLuaSyntax(convertedItem);
        document.getElementById('builderResult').style.display = 'block';
        
        // Store for download
        this.builderItem = convertedItem;
        this.builderFormat = builderFormat;
    }

    downloadBuilderItem() {
        if (!this.builderItem) return;
        
        const blob = new Blob([this.builderItem], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `item-${this.builderFormat}.${this.getFileExtension()}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Image Resizer Methods
    handleResizerDragOver(e) {
        e.preventDefault();
        document.getElementById('resizerArea').classList.add('dragover');
    }

    handleResizerDragLeave() {
        document.getElementById('resizerArea').classList.remove('dragover');
    }

    handleResizerDrop(e) {
        e.preventDefault();
        document.getElementById('resizerArea').classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.processImages(files);
    }

    handleResizerFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processImages(files);
    }

    async processImages(files) {
        if (files.length === 0) return;

        document.getElementById('resizerProgress').style.display = 'block';
        document.getElementById('resizerResults').style.display = 'none';
        
        this.resizedImages = [];
        const totalFiles = files.length;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const resizedImage = await this.resizeImage(file);
                this.resizedImages.push({
                    name: file.name,
                    data: resizedImage,
                    originalSize: file.size
                });
                
                // Update progress
                const progress = ((i + 1) / totalFiles) * 100;
                document.getElementById('resizerProgressBar').style.width = progress + '%';
            } catch (error) {
                console.error('Error processing image:', file.name, error);
            }
        }

        // Hide progress and show results
        document.getElementById('resizerProgress').style.display = 'none';
        this.displayResizedImages();
    }

    resizeImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                // Set canvas size to 100x100
                canvas.width = 100;
                canvas.height = 100;
                
                // Draw and resize image
                ctx.drawImage(img, 0, 0, 100, 100);
                
                // Convert to blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to resize image'));
                    }
                }, 'image/png', 0.9);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    displayResizedImages() {
        const container = document.getElementById('resizerImages');
        container.innerHTML = '';
        
        this.resizedImages.forEach((imageData, index) => {
            const item = document.createElement('div');
            item.className = 'resizer-image-item';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(imageData.data);
            img.alt = imageData.name;
            
            const name = document.createElement('p');
            name.textContent = imageData.name;
            
            const size = document.createElement('p');
            size.textContent = `${Math.round(imageData.data.size / 1024)}KB`;
            size.style.color = '#888';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-btn';
            downloadBtn.textContent = 'Download';
            downloadBtn.onclick = () => this.downloadSingleImage(imageData);
            
            item.appendChild(img);
            item.appendChild(name);
            item.appendChild(size);
            item.appendChild(downloadBtn);
            container.appendChild(item);
        });
        
        document.getElementById('resizerResults').style.display = 'block';
    }

    downloadSingleImage(imageData) {
        const url = URL.createObjectURL(imageData.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resized_${imageData.name}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    downloadAllResized() {
        if (!this.resizedImages || this.resizedImages.length === 0) return;
        
        // Create a zip-like download (for now, just download individually)
        this.resizedImages.forEach((imageData, index) => {
            setTimeout(() => {
                this.downloadSingleImage(imageData);
            }, index * 100); // Stagger downloads
        });
    }
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ItemConverter();
});
