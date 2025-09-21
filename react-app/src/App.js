import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileCode, Hammer, Image as ImageIcon, GitCompare, Upload, Download, RefreshCw, Wand2, ClipboardCopy } from 'lucide-react'

// =====================
// Helper (pure) functions

const PLACEHOLDER_DESC = 'A custom item created with Kuro Item Customizer'

function toKey(name) {
  const key = (name || '').trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '_')
  let label = (name || '').replace(/_/g, ' ').trim()
  if (label) label = label.charAt(0).toUpperCase() + label.slice(1)
  return { key, label }
}

function extractString(body, keys, fallback = '') {
  for (const key of keys) {
    const regex = new RegExp(`${key}\\s*=\\s*['"]([^'"]*)['"]`, 'i')
    const match = body.match(regex)
    if (match) return match[1]
  }
  return fallback
}

function extractNumber(body, key, fallback = 0) {
  const regex = new RegExp(`${key}\\s*=\\s*(\\d+)`, 'i')
  const match = body.match(regex)
  return match ? parseInt(match[1]) : fallback
}

function extractBoolean(body, key, fallback = false) {
  const regex = new RegExp(`${key}\\s*=\\s*(true|false)`, 'i')
  const match = body.match(regex)
  return match ? match[1] === 'true' : fallback
}

function collect(key, body) {
  const label = extractString(body, ['label', "['label']"], key)
  const weight = extractNumber(body, 'weight', 0)
  const type = extractString(body, ['type', "['type']"], 'item')
  const image = extractString(body, ['image', "['image']"], `${key}.png`)
  const unique = extractBoolean(body, 'unique', false)
  const useable = extractBoolean(body, 'useable', true)
  const description = extractString(body, ['description', "['description']"], label)
  
  return { key, label, weight, type, image, unique, useable, description }
}

function parseItemsFromLua(content) {
  const items = []
  const lines = content.split('\n')
  let inItemsTable = false
  let braceCount = 0
  let currentItem = ''
  let currentKey = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Check for optimized format
    if (line.includes('add_item(')) {
      return parseOptimizedFormat(content)
    }
    
    // Look for QBShared.Items table
    if (line.includes('QBShared.Items') && line.includes('=')) {
      inItemsTable = true
      continue
    }
    
    if (!inItemsTable) continue
    
    // Count braces to track nesting
    const openBraces = (line.match(/\{/g) || []).length
    const closeBraces = (line.match(/\}/g) || []).length
    braceCount += openBraces - closeBraces
    
    // Check for item key
    if (line.match(/^\s*\[['"][^'"]+['"]\]\s*=\s*\{/)) {
      const keyMatch = line.match(/\[['"]([^'"]+)['"]\]/)
      if (keyMatch) {
        currentKey = keyMatch[1]
        currentItem = line
      }
    } else if (currentKey && braceCount > 0) {
      currentItem += '\n' + line
    }
    
    // If we've closed the item (braceCount back to 0), process it
    if (currentKey && braceCount === 0 && currentItem) {
      try {
        const item = collect(currentKey, currentItem)
        items.push(item)
      } catch (error) {
        console.warn(`Failed to parse item ${currentKey}:`, error)
      }
      currentKey = ''
      currentItem = ''
    }
    
    // If we've closed the main table, stop
    if (inItemsTable && braceCount < 0) {
      break
    }
  }
  
  return items
}

function parseOptimizedFormat(content) {
  const items = []
  const addItemRegex = /add_item\(['"]([^'"]+)['"],\s*['"]([^'"]*)['"],\s*(\d+),\s*['"]([^'"]+)['"],\s*['"]([^'"]*)['"],\s*(true|false),\s*(true|false),\s*['"]([^'"]*)['"]\)/g
  
  let match
  while ((match = addItemRegex.exec(content)) !== null) {
    const [, key, label, weight, type, image, unique, useable, description] = match
    items.push({
      key,
      label: label || key,
      weight: parseInt(weight),
      type,
      image: image || `${key}.png`,
      unique: unique === 'true',
      useable: useable === 'true',
      description: description || label || key
    })
  }
  
  return items
}

function parseAndConvert(content, format) {
  const items = parseItemsFromLua(content)
  
  if (items.length === 0) {
    return { items: [], out: '-- No items found in the provided content' }
  }
  
  let out = ''
  
  switch (format) {
    case 'optimized':
      out = generateOptimizedFormat(items)
      break
    case 'original':
      out = generateOriginalFormat(items)
      break
    case 'pipe':
      out = generatePipeFormat(items)
      break
    case 'json':
      out = generateJsonFormat(items)
      break
    case 'ox':
      out = generateOXFormat(items)
      break
    default:
      out = generateOptimizedFormat(items)
  }
  
  return { items, out }
}

function generateOptimizedFormat(items) {
  let out = '-- Optimized items format - ultra compact\n'
  out += 'QBShared = QBShared or {}\n'
  out += 'QBShared.Items = QBShared.Items or {}\n\n'
  out += 'local function add_item(k, l, w, t, i, u, us, d)\n'
  out += '  QBShared.Items[k] = {\n'
  out += '    name = k, label = l, weight = w, type = t, image = i,\n'
  out += '    unique = u, useable = us, shouldClose = true, description = d\n'
  out += '  }\n'
  out += 'end\n\n'
  out += '-- Items:\n'
  
  items.forEach(item => {
    out += `add_item('${item.key}', '${item.label}', ${item.weight}, '${item.type}', '${item.image}', ${item.unique}, ${item.useable}, '${item.description}')\n`
  })
  
  return out
}

function generateOriginalFormat(items) {
  let out = 'QBShared = QBShared or {}\n'
  out += 'QBShared.Items = QBShared.Items or {}\n\n'
  
  items.forEach(item => {
    out += `QBShared.Items['${item.key}'] = {\n`
    out += `  name = '${item.key}',\n`
    out += `  label = '${item.label}',\n`
    out += `  weight = ${item.weight},\n`
    out += `  type = '${item.type}',\n`
    out += `  image = '${item.image}',\n`
    out += `  unique = ${item.unique},\n`
    out += `  useable = ${item.useable},\n`
    out += `  shouldClose = true,\n`
    out += `  description = '${item.description}'\n`
    out += `}\n\n`
  })
  
  return out
}

function generatePipeFormat(items) {
  return items.map(item => 
    `${item.key}|${item.label}|${item.weight}|${item.type}|${item.image}|${item.unique}|${item.useable}|${item.description}`
  ).join('\n')
}

function generateJsonFormat(items) {
  return JSON.stringify(items, null, 2)
}

function generateOXFormat(items) {
  let out = 'return {\n'
  
  items.forEach((item, index) => {
    out += `\t['${item.key}'] = {\n`
    out += `\t\tlabel = '${item.label}',\n`
    
    if (item.weight !== 0) {
      out += `\t\tweight = ${item.weight},\n`
    }
    
    out += `\t\tconsume = 0.3,\n`
    out += `\t\tstack = ${!item.unique},\n`
    out += `\t\tclient = {\n`
    out += `\t\t\timage = '${item.image}',\n`
    out += `\t\t\tusetime = 2500,\n`
    out += `\t\t\tnotification = 'You used ${item.label}',\n`
    out += `\t\t},\n`
    out += `\t\tserver = {\n`
    out += `\t\t\texport = 'your_resource.${item.key}'\n`
    out += `\t\t},\n`
    
    if (item.description && item.description !== item.label) {
      out += `\t\t-- ${item.description}\n`
    }
    
    out += `\t}${index < items.length - 1 ? ',' : ''}\n`
  })
  
  out += '}\n'
  return out
}

// =====================
// Subcomponents (moved outside to prevent remounting)

const Header = () => (
  <motion.header 
    initial={{ opacity: 0, y: -8 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ duration: .3 }} 
    className='mb-6'
  >
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-3'>
        <div className='h-9 w-9 rounded-xl bg-gradient-to-br from-kuro-green to-kuro-purple shadow-lg shadow-emerald-500/10' />
        <div>
          <h1 className='text-xl md:text-2xl font-semibold tracking-tight text-white'>Kuro Item Customizer</h1>
          <p className='text-xs text-gray-400'>Convert • Build • Resize • Diff — blazing-fast, zero deps</p>
        </div>
      </div>
    </div>
  </motion.header>
)

const Tabs = ({ tab, setTab }) => (
  <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='mb-6'>
    <div className='flex flex-wrap gap-2 items-center'>
      {[
        { key: 'converter', label: 'Converter', icon: <FileCode size={16} /> },
        { key: 'builder', label: 'Item Builder', icon: <Hammer size={16} /> },
        { key: 'images', label: 'Image Resizer', icon: <ImageIcon size={16} /> },
        { key: 'diff', label: 'Diff Viewer', icon: <GitCompare size={16} /> },
      ].map(t => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`group px-4 py-2 rounded-xl border text-sm flex items-center gap-2 transition ${
            tab === t.key 
              ? 'bg-gradient-to-r from-kuro-green/20 to-kuro-purple/20 border-kuro-green/40 text-white' 
              : 'bg-white/5 border-white/10 hover:border-white/20 text-gray-300'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  </motion.nav>
)

const Converter = ({ fileText, setFileText, converterOutput, processing, progress, itemsFound, format, setFormat, handleUpload, convert, downloadOutput }) => (
  <section>
    <div className='grid md:grid-cols-2 gap-6'>
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-white'>Input</h2>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-400'>{itemsFound} items</span>
            <select 
              value={format} 
              onChange={e => setFormat(e.target.value)}
              className='px-3 py-1 rounded-lg bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-kuro-green/40'
            >
              <option value='optimized'>Optimized (recommended)</option>
              <option value='original'>Original QB Format</option>
              <option value='pipe'>Pipe Delimited</option>
              <option value='json'>JSON</option>
              <option value='ox'>OX Inventory</option>
            </select>
          </div>
        </div>
        <textarea
          value={fileText}
          onChange={e => setFileText(e.target.value)}
          placeholder='Paste your items.lua content here...'
          className='w-full h-96 p-4 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-kuro-green/40 text-white font-mono resize-none'
        />
        <div className='flex gap-2 mt-4'>
          <button 
            onClick={() => document.getElementById('fileInput')?.click()}
            className='px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition'
          >
            <Upload size={16} className='inline mr-2' />
            Upload items.lua
          </button>
          <input 
            id='fileInput' 
            type='file' 
            accept='.lua' 
            onChange={handleUpload} 
            className='hidden'
          />
        </div>
      </motion.div>
      
      <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-white'>Output</h2>
          <button 
            onClick={downloadOutput}
            disabled={!converterOutput}
            className='px-4 py-2 rounded-xl bg-kuro-green hover:bg-kuro-green/80 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition'
          >
            <Download size={16} className='inline mr-2' />
            Download
          </button>
        </div>
        <div className='relative'>
          <textarea
            value={converterOutput}
            readOnly
            placeholder='Converted output will appear here...'
            className='w-full h-96 p-4 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 text-green-400 font-mono resize-none'
          />
          {processing && (
            <div className='absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center'>
              <div className='text-center'>
                <RefreshCw size={24} className='animate-spin text-kuro-green mx-auto mb-2' />
                <div className='text-white text-sm'>Converting... {progress}%</div>
                <div className='w-32 h-2 bg-white/20 rounded-full mt-2 overflow-hidden'>
                  <div 
                    className='h-full bg-kuro-green transition-all duration-300'
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <button 
          onClick={convert}
          disabled={!fileText || processing}
          className='w-full mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-kuro-green to-kuro-purple font-medium shadow-lg shadow-emerald-500/20 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-emerald-500/30'
        >
          {processing ? 'Converting...' : 'Convert'}
        </button>
      </motion.div>
    </div>
  </section>
)

const ItemKeyInput = React.memo(({ onChange }) => {
  const handleChange = (e) => {
    onChange(e.target.value)
  }
  
  return (
    <input 
      onChange={handleChange} 
      placeholder='custom_weapon' 
      className='w-full mt-2 p-3 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-kuro-green/40 text-white'
    />
  )
})

const Builder = ({ inputKey, builder, setBuilder, onBuilderNameChange, buildItem, builderOutput, setBuilderOutput, builderFormat, setBuilderFormat }) => (
  <section>
    <div className='grid md:grid-cols-2 gap-4'>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <label className='text-sm text-gray-300'>Item Key</label>
        <ItemKeyInput onChange={onBuilderNameChange} />
        
        <label className='text-sm text-gray-300 mt-3 block'>Label</label>
        <input 
          value={builder.label} 
          onChange={e => setBuilder(v => ({ ...v, label: e.target.value }))} 
          className='w-full mt-2 p-3 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-kuro-green/40 text-white'
          placeholder='Auto-generated from item key'
        />
        
        <div className='grid grid-cols-2 gap-2 mt-3'>
          <div>
            <label className='text-sm text-gray-300 block'>Weight</label>
            <input 
              type='number' 
              value={builder.weight} 
              onChange={e => setBuilder(v => ({ ...v, weight: Number(e.target.value) }))} 
              className='w-full mt-1 p-2 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:ring-2 focus:ring-kuro-green/40 text-white'
              placeholder='100'
            />
          </div>
          <div>
            <label className='text-sm text-gray-300 block'>Type</label>
            <select 
              value={builder.type} 
              onChange={e => setBuilder(v => ({ ...v, type: e.target.value }))} 
              className='w-full mt-1 p-2 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:ring-2 focus:ring-kuro-green/40 text-white'
            >
              <option value='item'>item</option>
              <option value='weapon'>weapon</option>
              <option value='ammo'>ammo</option>
              <option value='drug'>drug</option>
              <option value='food'>food</option>
              <option value='drink'>drink</option>
              <option value='clothing'>clothing</option>
              <option value='accessory'>accessory</option>
            </select>
          </div>
        </div>
        
        <label className='text-sm text-gray-300 mt-3 block'>Image</label>
        <input 
          value={builder.image} 
          onChange={e => setBuilder(v => ({ ...v, image: e.target.value }))} 
          className='w-full mt-2 p-3 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-kuro-green/40 text-white'
          placeholder='Auto-generated from item key'
        />
        
        <div className='grid grid-cols-3 gap-2 mt-3'>
          <div>
            <label className='text-sm text-gray-300 block'>Unique</label>
            <select 
              value={builder.unique ? 'true' : 'false'} 
              onChange={e => setBuilder(v => ({ ...v, unique: e.target.value === 'true' }))} 
              className='w-full mt-1 p-2 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:ring-2 focus:ring-kuro-green/40 text-white'
            >
              <option value='false'>false</option>
              <option value='true'>true</option>
            </select>
          </div>
          <div>
            <label className='text-sm text-gray-300 block'>Useable</label>
            <select 
              value={builder.useable ? 'true' : 'false'} 
              onChange={e => setBuilder(v => ({ ...v, useable: e.target.value === 'true' }))} 
              className='w-full mt-1 p-2 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:ring-2 focus:ring-kuro-green/40 text-white'
            >
              <option value='true'>true</option>
              <option value='false'>false</option>
            </select>
          </div>
          <div>
            <label className='text-sm text-gray-300 block'>Combinable</label>
            <select 
              value={builder.combinable ? 'true' : 'false'} 
              onChange={e => setBuilder(v => ({ ...v, combinable: e.target.value === 'true' }))} 
              className='w-full mt-1 p-2 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:ring-2 focus:ring-kuro-green/40 text-white'
            >
              <option value='false'>false</option>
              <option value='true'>true</option>
            </select>
          </div>
        </div>
        
        <label className='text-sm text-gray-300 mt-3 block'>Description</label>
        <textarea 
          value={builder.description} 
          onChange={e => setBuilder(v => ({ ...v, description: e.target.value }))} 
          className='w-full mt-2 p-3 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-kuro-green/40 text-white'
          rows={3}
          placeholder='Auto-generated from label'
        />
        
        <label className='text-sm text-gray-300 mt-3 block'>Output Format</label>
        <select 
          value={builderFormat} 
          onChange={e => setBuilderFormat(e.target.value)} 
          className='w-full mt-2 p-3 bg-[#0b0f1a] rounded-lg text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-kuro-green/40 text-white'
        >
          <option value='qb_block'>QB Block Format</option>
          <option value='optimized'>Optimized Format</option>
          <option value='ox'>OX Format</option>
        </select>
        
        <div className='flex gap-2 mt-4'>
          <button 
            type="button"
            onClick={buildItem} 
            className='px-4 py-2 rounded-xl bg-gradient-to-r from-kuro-green to-kuro-purple font-medium shadow-lg shadow-emerald-500/20 text-white'
          >
            Build Item
          </button>
          <button 
            type="button"
            onClick={() => { 
              setBuilder({ key: '', label: '', weight: 100, type: 'item', image: '', unique: false, useable: true, combinable: false, description: '' }); 
              setInputKey(''); 
              setBuilderOutput(''); 
            }} 
            className='px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300'
          >
            Clear
          </button>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className='flex justify-between items-center'>
          <label className='text-sm text-gray-300'>Item Preview</label>
          {builderOutput && (
            <button 
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(builderOutput);
                  // Simple alert for now - you could replace with a proper toast
                  alert('Copied to clipboard!');
                } catch (err) {
                  console.error('Failed to copy: ', err);
                  alert('Failed to copy to clipboard');
                }
              }}
              className='px-3 py-1 rounded-lg bg-kuro-green/20 border border-kuro-green/30 text-kuro-green text-xs hover:bg-kuro-green/30 transition-colors'
            >
              <ClipboardCopy className='w-3 h-3 inline mr-1' />
              Copy
            </button>
          )}
        </div>
        <pre className='mt-2 p-3 bg-[#0b0f1a] rounded-lg text-sm overflow-auto font-mono border border-white/10 text-green-400 min-h-[200px]'>
          {builderOutput || '-- built item will show here --'}
        </pre>
      </motion.div>
    </div>
  </section>
)

const ImagesTab = ({ images, setImages, maintainRatio, setMaintainRatio, processingImages, resizeProgress, resizedPreviews, onDropImages, handleResizeClick, processImages, downloadAllResized, downloadSingleResized }) => (
  <section>
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      onDragOver={e => e.preventDefault()} 
      onDrop={onDropImages} 
      className='border-2 border-dashed border-white/15 p-6 rounded-xl text-center bg-black/20'
    >
      <p className='text-sm text-gray-300'>
        Drag & drop images here or{' '}
        <button 
          onClick={() => document.getElementById('imgIn')?.click()} 
          className='underline text-kuro-green'
        >
          browse
        </button>
      </p>
      <input 
        id='imgIn' 
        type='file' 
        multiple 
        accept='image/*' 
        onChange={onDropImages} 
        className='hidden'
      />
      <div className='mt-4 text-xs text-gray-400'>{images.length} image(s) ready</div>
      
      <div className='mt-4 flex items-center justify-center gap-2'>
        <label className='flex items-center gap-2 text-sm text-gray-300'>
          <input
            type='checkbox'
            checked={maintainRatio}
            onChange={(e) => setMaintainRatio(e.target.checked)}
            className='rounded border-white/20 bg-white/10 text-kuro-green focus:ring-kuro-green'
          />
          Smart resize (maintain aspect ratio)
        </label>
      </div>
      
      <div className='flex gap-2 justify-center mt-4'>
        <button 
          onClick={handleResizeClick} 
          disabled={processingImages}
          className='px-4 py-2 rounded-xl bg-gradient-to-r from-kuro-green to-kuro-purple font-medium shadow-lg shadow-emerald-500/20 text-white disabled:opacity-50'
        >
          {images.length > 0 ? 'Select & Resize Images' : 'Select Images'}
        </button>
        <button 
          onClick={processImages} 
          disabled={processingImages || !images.length}
          className='px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-medium text-white disabled:opacity-50'
        >
          {processingImages ? 'Processing...' : 'Process Images'}
        </button>
        <button 
          onClick={() => { setImages([]); setResizedPreviews([]); setResizeProgress(0) }} 
          className='px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300'
        >
          Clear All
        </button>
      </div>
      
      {(processingImages || resizeProgress > 0) && (
        <div className='mt-4'>
          <div className='bg-white/10 h-2 rounded-full overflow-hidden'>
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${resizeProgress}%` }} 
              className='h-full bg-kuro-green'
            />
          </div>
          <div className='text-xs text-gray-400 mt-1'>{resizeProgress}% complete</div>
        </div>
      )}
      
      {resizedPreviews.length > 0 && (
        <div className='mt-6 border-t border-white/10 pt-6'>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='text-lg font-semibold text-white'>Processed Images ({resizedPreviews.length})</h3>
            <button 
              onClick={downloadAllResized}
              className='px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 font-medium text-white'
            >
              Download All
            </button>
          </div>
          
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto'>
            {resizedPreviews.map((preview, index) => (
              <div key={index} className='bg-white/5 rounded-lg p-4'>
                <div className='flex gap-4'>
                  <div className='flex-1'>
                    <h4 className='text-sm font-medium text-white mb-2'>{preview.name}</h4>
                    <div className='flex gap-2'>
                      <div className='text-center'>
                        <div className='text-xs text-gray-400 mb-1'>Original</div>
                        <img src={preview.original} alt='Original' className='w-16 h-16 object-cover rounded border border-white/20' />
                      </div>
                      <div className='text-center'>
                        <div className='text-xs text-gray-400 mb-1'>Resized (100x100)</div>
                        <img src={preview.resized} alt='Resized' className='w-16 h-16 object-cover rounded border border-white/20' />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => downloadSingleResized(preview)}
                    className='px-3 py-2 rounded-lg bg-kuro-green hover:bg-kuro-green/80 text-white text-sm'
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
    <div className='mt-4 grid grid-cols-2 md:grid-cols-6 gap-2'>
      {images.map((f, i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, y: 6 }} 
          animate={{ opacity: 1, y: 0 }} 
          className='bg-[#0b0f1a] p-2 rounded-lg text-xs text-gray-300 border border-white/10 truncate'
        >
          {f.name}
        </motion.div>
      ))}
    </div>
  </section>
)

const DiffTab = ({ diffBefore, diffAfter, setDiffBefore, setDiffAfter, converterOutput, builderOutput, tab }) => (
  <section>
    <div className='grid md:grid-cols-2 gap-4'>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <label className='text-sm text-gray-300'>Before</label>
        <textarea 
          value={diffBefore} 
          onChange={e => setDiffBefore(e.target.value)} 
          rows={14} 
          className='w-full mt-2 p-3 bg-[#0b0f1a] rounded-lg text-sm font-mono border border-white/10 text-white'
        />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className='flex items-center justify-between'>
          <label className='text-sm text-gray-300'>After</label>
          <div className='flex gap-2'>
            <button 
              onClick={() => setDiffAfter(tab === 'builder' ? builderOutput : converterOutput)} 
              className='text-xs px-2 py-1 rounded border border-white/10 bg-white/5 hover:border-white/20 flex items-center gap-1 text-gray-300'
            >
              <RefreshCw size={14} /> From Output
            </button>
            <button 
              onClick={() => navigator.clipboard.writeText(diffAfter)} 
              className='text-xs px-2 py-1 rounded border border-white/10 bg-white/5 hover:border-white/20 flex items-center gap-1 text-gray-300'
            >
              <ClipboardCopy size={14} /> Copy
            </button>
          </div>
        </div>
        <textarea 
          value={diffAfter} 
          onChange={e => setDiffAfter(e.target.value)} 
          rows={14} 
          className='w-full mt-2 p-3 bg-[#0b0f1a] rounded-lg text-sm font-mono border border-white/10 text-green-400'
        />
      </motion.div>
    </div>
    <div className='mt-4 text-xs text-gray-400'>
      Review changes before replacing your server file. Always keep a backup.
    </div>
  </section>
)

const WelcomeScreen = ({ onGetStarted }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }} 
    animate={{ opacity: 1, scale: 1 }} 
    className='text-center py-16'
  >
    <div className='mb-8'>
      <div className='w-20 h-20 rounded-full bg-gradient-to-r from-kuro-green to-kuro-purple flex items-center justify-center mx-auto mb-6'>
        <Wand2 size={32} className='text-white' />
      </div>
      <h1 className='text-4xl font-bold text-white mb-4'>Welcome to Kuro Item Customizer</h1>
      <p className='text-gray-400 text-lg max-w-2xl mx-auto'>
        The ultimate tool for QBCore item management. Convert formats, build items, resize images, and compare changes with ease.
      </p>
    </div>
    
    <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-4xl mx-auto'>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className='bg-white/5 rounded-xl p-6 border border-white/10'
      >
        <FileCode size={24} className='text-kuro-green mx-auto mb-3' />
        <h3 className='text-white font-semibold mb-2'>Universal Converter</h3>
        <p className='text-gray-400 text-sm'>Convert between QB, OX, JSON, and pipe formats</p>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2 }}
        className='bg-white/5 rounded-xl p-6 border border-white/10'
      >
        <Hammer size={24} className='text-kuro-green mx-auto mb-3' />
        <h3 className='text-white font-semibold mb-2'>Item Builder</h3>
        <p className='text-gray-400 text-sm'>Create new items with smart suggestions</p>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3 }}
        className='bg-white/5 rounded-xl p-6 border border-white/10'
      >
        <ImageIcon size={24} className='text-kuro-green mx-auto mb-3' />
        <h3 className='text-white font-semibold mb-2'>Image Resizer</h3>
        <p className='text-gray-400 text-sm'>Batch resize with smart aspect ratio</p>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.4 }}
        className='bg-white/5 rounded-xl p-6 border border-white/10'
      >
        <GitCompare size={24} className='text-kuro-green mx-auto mb-3' />
        <h3 className='text-white font-semibold mb-2'>Diff Viewer</h3>
        <p className='text-gray-400 text-sm'>Compare before and after changes</p>
      </motion.div>
    </div>
    
    <motion.button 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.5 }}
      onClick={onGetStarted}
      className='px-8 py-4 rounded-xl bg-gradient-to-r from-kuro-green to-kuro-purple font-medium shadow-lg shadow-emerald-500/20 text-white hover:shadow-emerald-500/30 transition-all duration-200'
    >
      Get Started
    </motion.button>
  </motion.div>
)

export default function ItemCustomizer() {
  const [showWelcome, setShowWelcome] = useState(true)
  const [tab, setTab] = useState('converter')
  const [fileText, setFileText] = useState('')
  // Separate preview states for each tab
  const [converterOutput, setConverterOutput] = useState('')
  const [builderOutput, setBuilderOutput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [itemsFound, setItemsFound] = useState(0)
  const [format, setFormat] = useState('optimized')
  const fileInputRef = useRef(null)
  const [builder, setBuilder] = useState({ key: '', label: '', weight: 100, type: 'item', image: '', unique: false, useable: true, combinable: false, description: '' })
  const [inputKey, setInputKey] = useState('')
  const [builderFormat, setBuilderFormat] = useState('qb_block')
  const builderRef = useRef({ key: '', label: '', weight: 100, type: 'item', image: '', unique: false, useable: true, combinable: false, description: '' })
  const [images, setImages] = useState([])
  const [resizeProgress, setResizeProgress] = useState(0)
  const [processingImages, setProcessingImages] = useState(false)
  const [resizedPreviews, setResizedPreviews] = useState([])
  const [maintainRatio, setMaintainRatio] = useState(true)
  const [diffBefore, setDiffBefore] = useState('')
  const [diffAfter, setDiffAfter] = useState('')

  function readFileAsText(file) {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result)
      r.onerror = rej
      r.readAsText(file)
    })
  }

  const onBuilderNameChange = useCallback((val) => {
    setInputKey(val)
    builderRef.current = { ...builderRef.current, key: val }
    
    // Auto-populate fields based on item key
    if (val) {
      const { key, label } = toKey(val)
      const autoImage = `${key}.png`
      const autoDescription = label || PLACEHOLDER_DESC
      
      // Auto-detect type based on key patterns
      let autoType = 'item'
      if (key.includes('weapon') || key.includes('gun') || key.includes('rifle') || key.includes('pistol')) {
        autoType = 'weapon'
      } else if (key.includes('ammo') || key.includes('bullet') || key.includes('round')) {
        autoType = 'ammo'
      } else if (key.includes('drug') || key.includes('weed') || key.includes('coke') || key.includes('meth')) {
        autoType = 'drug'
      } else if (key.includes('food') || key.includes('burger') || key.includes('pizza') || key.includes('sandwich')) {
        autoType = 'food'
      } else if (key.includes('drink') || key.includes('water') || key.includes('soda') || key.includes('beer')) {
        autoType = 'drink'
      } else if (key.includes('clothing') || key.includes('shirt') || key.includes('pants') || key.includes('hat')) {
        autoType = 'clothing'
      } else if (key.includes('accessory') || key.includes('ring') || key.includes('watch') || key.includes('necklace')) {
        autoType = 'accessory'
      }
      
      // Auto-detect unique/useable/combinable based on type
      let autoUnique = false
      let autoUseable = true
      let autoCombinable = false
      
      if (autoType === 'weapon' || autoType === 'accessory') {
        autoUnique = true
        autoUseable = true
        autoCombinable = false
      } else if (autoType === 'ammo') {
        autoUnique = false
        autoUseable = false
        autoCombinable = true
      } else if (autoType === 'drug' || autoType === 'food' || autoType === 'drink') {
        autoUnique = false
        autoUseable = true
        autoCombinable = true
      }
      
      // Update builder with auto-populated values
      const updatedBuilder = {
        key: val,
        label: label,
        weight: builderRef.current.weight || 100,
        type: autoType,
        image: autoImage,
        unique: autoUnique,
        useable: autoUseable,
        combinable: autoCombinable,
        description: autoDescription
      }
      
      builderRef.current = updatedBuilder
      setBuilder(updatedBuilder)
    }
  }, [])

  const buildItem = useCallback(() => {
    const currentBuilder = builderRef.current
    const desc = currentBuilder.description || currentBuilder.label || PLACEHOLDER_DESC
    
    let output = ''
    
    if (builderFormat === 'qb_block') {
      // QB Block Format
      output = `['${currentBuilder.key}'] = { 
  name = '${currentBuilder.key}', 
  label = '${currentBuilder.label}', 
  weight = ${Number(currentBuilder.weight)||0}, 
  type = '${currentBuilder.type}', 
  image = '${currentBuilder.image}', 
  unique = ${currentBuilder.unique}, 
  useable = ${currentBuilder.useable}, 
  combinable = ${currentBuilder.combinable ? 'true' : 'nil'},
  shouldClose = true, 
  description = '${(desc||'').replace(/'/g, "\\'")}' 
}`
    } else if (builderFormat === 'optimized') {
      // Optimized Format
      output = `add_item('${currentBuilder.key}', '${currentBuilder.label}', ${Number(currentBuilder.weight)||0}, '${currentBuilder.type}', '${currentBuilder.image}', ${currentBuilder.unique}, ${currentBuilder.useable}, '${(desc||'').replace(/'/g, "\\'")}')`
    } else if (builderFormat === 'ox') {
      // OX Format
      output = `['${currentBuilder.key}'] = {
  label = '${currentBuilder.label}',
  weight = ${Number(currentBuilder.weight)||0},
  stack = ${!currentBuilder.unique},
  close = true,
  description = '${(desc||'').replace(/'/g, "\\'")}'
}`
    }
    
    setBuilderOutput(output)
    setDiffAfter(output)
  }, [builderFormat])

  const convert = useCallback(async () => {
    if (!fileText.trim()) return
    
    setProcessing(true)
    setProgress(0)
    
    try {
      const { items, out } = parseAndConvert(fileText, format)
      setItemsFound(items.length)
      setConverterOutput(out)
      setDiffBefore(fileText)
      setDiffAfter(out)
      setProgress(100)
    } catch (error) {
      console.error('Conversion error:', error)
      alert('Error converting items: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }, [fileText, format])

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    try {
      const text = await readFileAsText(file)
      setFileText(text)
      setDiffBefore(text)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error reading file: ' + error.message)
    }
  }, [])

  const downloadOutput = useCallback(() => {
    const currentOutput = tab === 'builder' ? builderOutput : converterOutput
    if (!currentOutput) return
    
    const blob = new Blob([currentOutput], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `items_${tab === 'builder' ? builderFormat : format}_${new Date().toISOString().slice(0, 10)}.lua`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [builderOutput, converterOutput, tab, builderFormat, format])

  const onDropImages = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target.files || [])
    const imgs = files.filter(f => f.type.startsWith('image/'))
    setImages(imgs)
  }, [])

  const handleResizeClick = useCallback(() => {
    if (images.length > 0) {
      processImages()
    } else {
      document.getElementById('imgIn')?.click()
    }
  }, [images.length])

  // Image processing functions
  async function processImages() {
    if (!images.length) {
      alert('Please select images first!')
      return
    }
    
    setProcessingImages(true)
    setResizeProgress(0)
    const total = images.length
    const previews = []
    
    try {
      for (let i = 0; i < images.length; i++) {
        const file = images[i]
        console.log(`Processing ${file.name}...`)
        
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`)
          continue
        }
        
        const dataUrl = await readFileAsDataURL(file)
        const resized = await resizeImageData(dataUrl, 100, 100, maintainRatio)
        
        previews.push({
          name: file.name,
          original: dataUrl,
          resized: resized,
          blob: dataURLToBlob(resized)
        })
        
        setResizeProgress(Math.round(((i + 1) / total) * 100))
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      setResizedPreviews(previews)
      if (previews.length > 0) {
        alert(`Successfully processed ${previews.length} images! Review and download below.`)
      } else {
        alert('No valid images were processed. Please ensure you selected image files.')
      }
    } catch (error) {
      console.error('Processing error:', error)
      alert('Error processing images: ' + error.message)
    } finally {
      setProcessingImages(false)
    }
  }

  function downloadAllResized() {
    if (!resizedPreviews.length) {
      alert('No processed images to download!')
      return
    }
    
    resizedPreviews.forEach((preview, index) => {
      setTimeout(() => {
        const url = URL.createObjectURL(preview.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `resized_${preview.name.replace(/\.[^/.]+$/, '.png')}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, index * 200)
    })
  }

  function downloadSingleResized(preview) {
    const url = URL.createObjectURL(preview.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resized_${preview.name.replace(/\.[^/.]+$/, '.png')}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Helper functions for image processing
  function readFileAsDataURL(file) {
    return new Promise((resolvePromise, rejectPromise) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolvePromise(reader.result))
      reader.addEventListener('error', () => rejectPromise(new Error('Failed to read file')))
      reader.readAsDataURL(file)
    })
  }

  function resizeImageData(dataUrl, width, height, maintainRatio = true) {
    return new Promise((resolvePromise, rejectPromise) => {
      const imageElement = new Image()
      imageElement.addEventListener('load', () => {
        try {
          const canvasElement = document.createElement('canvas')
          const canvasContext = canvasElement.getContext('2d')
          
          canvasElement.width = width
          canvasElement.height = height
          
          if (maintainRatio) {
            const aspectRatio = imageElement.width / imageElement.height
            let drawWidth = width
            let drawHeight = height
            
            if (aspectRatio > 1) {
              drawHeight = width / aspectRatio
            } else {
              drawWidth = height * aspectRatio
            }
            
            const x = (width - drawWidth) / 2
            const y = (height - drawHeight) / 2
            
            canvasContext.clearRect(0, 0, width, height)
            canvasContext.drawImage(imageElement, x, y, drawWidth, drawHeight)
          } else {
            canvasContext.drawImage(imageElement, 0, 0, width, height)
          }
          
          resolvePromise(canvasElement.toDataURL('image/png'))
        } catch (error) {
          rejectPromise(error)
        }
      })
      imageElement.addEventListener('error', () => rejectPromise(new Error('Failed to load image')))
      imageElement.src = dataUrl
    })
  }

  function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  if (showWelcome) {
    return <WelcomeScreen onGetStarted={() => setShowWelcome(false)} />
  }

  return (
    <div className='min-h-screen relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0b1220] via-[#0b0f1a] to-black text-gray-100'>
      {/* subtle grid overlay */}
      <div className='pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(transparent,black)]'>
        <div className='absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:32px_32px]' />
      </div>
      <div className='relative p-6 max-w-6xl mx-auto'>
        <Header />
        <Tabs tab={tab} setTab={setTab} />
        <main className='rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-5 shadow-xl shadow-black/30'>
          {tab === 'converter' && (
            <Converter 
              fileText={fileText}
              setFileText={setFileText}
              converterOutput={converterOutput}
              processing={processing}
              progress={progress}
              itemsFound={itemsFound}
              format={format}
              setFormat={setFormat}
              handleUpload={handleUpload}
              convert={convert}
              downloadOutput={downloadOutput}
            />
          )}
          {tab === 'builder' && (
            <Builder 
              inputKey={inputKey}
              builder={builder}
              setBuilder={setBuilder}
              onBuilderNameChange={onBuilderNameChange}
              buildItem={buildItem}
              builderOutput={builderOutput}
              setBuilderOutput={setBuilderOutput}
              builderFormat={builderFormat}
              setBuilderFormat={setBuilderFormat}
            />
          )}
          {tab === 'images' && (
            <ImagesTab 
              images={images}
              setImages={setImages}
              maintainRatio={maintainRatio}
              setMaintainRatio={setMaintainRatio}
              processingImages={processingImages}
              resizeProgress={resizeProgress}
              resizedPreviews={resizedPreviews}
              onDropImages={onDropImages}
              handleResizeClick={handleResizeClick}
              processImages={processImages}
              downloadAllResized={downloadAllResized}
              downloadSingleResized={downloadSingleResized}
            />
          )}
          {tab === 'diff' && (
            <DiffTab 
              diffBefore={diffBefore}
              diffAfter={diffAfter}
              setDiffBefore={setDiffBefore}
              setDiffAfter={setDiffAfter}
              converterOutput={converterOutput}
              builderOutput={builderOutput}
              tab={tab}
            />
          )}
        </main>
        <footer className='mt-6 text-xs text-gray-400 flex flex-wrap items-center gap-2'>
          <span>Made for QBCore item conversion.</span>
          <span className='opacity-50'>•</span>
          <span>No flashing animations (epilepsy‑safe).</span>
          <span className='opacity-50'>•</span>
          <span>Fav accent: <span className='text-kuro-green'>#55fa9a</span></span>
        </footer>
      </div>
    </div>
  )
}
