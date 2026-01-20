import React, { useRef, useEffect, useState } from 'react'
import '../css/RichTextEditor.css'

interface RichTextEditorProps {
  value: any // Portable Text block
  onChange: (block: any) => void
  placeholder?: string
  onDeleteBlock?: () => void
  onAddNewBlock?: (contentBeforeCursor: any, contentAfterCursor: any) => void
  onAddNewListItem?: (contentBeforeCursor: any, contentAfterCursor: any) => void
  autoFocus?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

export function RichTextEditor({ value, onChange, placeholder = 'Start writing...', onDeleteBlock, onAddNewBlock, onAddNewListItem, autoFocus = false, onFocus, onBlur }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 })
  const [isEmpty, setIsEmpty] = useState(true)

  // Convert Portable Text to HTML - preserve paragraph and list structure
  const portableTextToHtml = (block: any): string => {
    if (!block || !block.children || block.children.length === 0) return '<p><br></p>'
    
    const style = block.style || 'normal'
    const listItem = block.listItem // Sanity uses listItem property for lists
    const markDefs = block.markDefs || []
    
    // Create a map of mark keys to mark definitions for quick lookup
    const markDefMap = new Map<string, any>()
    markDefs.forEach((def: any) => {
      if (def._key) {
        markDefMap.set(def._key, def)
      }
    })
    
    // Helper function to apply marks to text
    const applyMarks = (text: string, marks: string[]): string => {
      if (!text) return text
      
      // Apply marks in reverse order (outermost first)
      marks.reverse().forEach((mark: string) => {
        if (mark === 'strong') {
          text = `<strong>${text}</strong>`
        } else if (mark === 'em') {
          text = `<em>${text}</em>`
        } else if (mark === 'underline') {
          text = `<u>${text}</u>`
        } else {
          // Check if it's a link mark (references a markDef)
          const markDef = markDefMap.get(mark)
          if (markDef && markDef._type === 'link' && markDef.href) {
            text = `<a href="${markDef.href}" target="_blank" rel="noopener noreferrer">${text}</a>`
          }
        }
      })
      return text
    }
    
    // Check if this is a list item (Sanity uses listItem property, but also check legacy style)
    const isListItem = listItem === 'bullet' || listItem === 'number' || style === 'bullet' || style === 'number'
    
    // Check if we have stored list HTML in a special format
    let fullText = ''
    block.children.forEach((child: any) => {
      fullText += child.text || ''
    })
    
    // Check for list HTML markers (from our editor)
    if (fullText.includes('__LIST_HTML_UL__') || fullText.includes('__LIST_HTML_OL__')) {
      // Extract the stored list HTML
      const listMarker = fullText.includes('__LIST_HTML_UL__') ? '__LIST_HTML_UL__' : '__LIST_HTML_OL__'
      const startIndex = fullText.indexOf(listMarker) + listMarker.length
      const endIndex = fullText.lastIndexOf(listMarker)
      
      if (startIndex > 0 && endIndex > startIndex) {
        const listHtml = fullText.substring(startIndex, endIndex)
        // Return the list HTML directly
        return listHtml
      }
    }
    
    // Handle Sanity's list item format (bullet or number style)
    // Note: We don't wrap in ul/ol here because PostEditor groups consecutive list items
    if (isListItem) {
      // Build the list item content with marks
      let listItemHtml = ''
      block.children.forEach((child: any) => {
        let text = child.text || ''
        // Convert newlines to <br> within list items
        text = text.replace(/\n/g, '<br>')
        if (text) {
          // Apply marks including links
          const marks = child.marks || []
          text = applyMarks(text, marks)
          listItemHtml += text
        }
      })
      
      // Return as a list item (PostEditor will wrap consecutive items in ul/ol)
      return `<li>${listItemHtml || '<br>'}</li>`
    }
    
    // Split by double newlines to identify paragraphs
    const textParagraphs = fullText.split(/\n\n+/)
    
    // Process each paragraph with proper formatting marks
    const paragraphHtmls = textParagraphs.map((paraText, paraIndex) => {
      if (!paraText.trim() && paraIndex === 0 && textParagraphs.length === 1) {
        return '' // Empty paragraph
      }
      
      // Calculate the position of this paragraph in the full text
      let paraStartPos = 0
      for (let i = 0; i < paraIndex; i++) {
        paraStartPos += textParagraphs[i].length
        if (i < textParagraphs.length - 1) {
          paraStartPos += 2 // +2 for \n\n separator
        }
      }
      const paraEndPos = paraStartPos + paraText.length
      
      // Build HTML for this paragraph with marks
      let paraHtml = ''
      let currentPos = 0
      
      block.children.forEach((child: any) => {
        const childText = child.text || ''
        const childStart = currentPos
        const childEnd = currentPos + childText.length
        
        // Check if this child contributes to current paragraph
        if (childEnd > paraStartPos && childStart < paraEndPos) {
          // Extract the relevant part, excluding \n\n separators
          const startInChild = Math.max(0, paraStartPos - childStart)
          const endInChild = Math.min(childText.length, paraEndPos - childStart)
          let text = childText.substring(startInChild, endInChild)
          
          // Remove any \n\n that might be at the start or end (from separators)
          text = text.replace(/^\n\n+/, '').replace(/\n\n+$/, '')
          
          // Convert remaining single newlines to <br>
          text = text.replace(/\n/g, '<br>')
          
          if (text) {
            // Apply marks including links
            const marks = child.marks || []
            text = applyMarks(text, marks)
            paraHtml += text
          }
        }
        
        currentPos = childEnd
      })
      
      return paraHtml || '<br>'
    })
    
    // Wrap each paragraph with the appropriate block style
    const wrappedParagraphs = paragraphHtmls.map(paraHtml => {
      if (style === 'h1') return `<h1>${paraHtml || '<br>'}</h1>`
      else if (style === 'h2') return `<h2>${paraHtml || '<br>'}</h2>`
      else if (style === 'h3') return `<h3>${paraHtml || '<br>'}</h3>`
      else if (style === 'blockquote') return `<blockquote>${paraHtml || '<br>'}</blockquote>`
      else return `<p>${paraHtml || '<br>'}</p>`
    })
    
    return wrappedParagraphs.length > 0 ? wrappedParagraphs.join('') : '<p><br></p>'
  }

  // Convert HTML to Portable Text - preserve paragraph structure
  const htmlToPortableText = (html: string, currentBlock: any): any => {
    if (!html || html.trim() === '' || html === '<br>' || html === '<p><br></p>' || html === '<p></p>') {
      return {
        ...currentBlock,
        children: [{
          _type: 'span',
          _key: currentBlock.children?.[0]?._key || `span-${Date.now()}`,
          text: '',
          marks: [],
        }],
        markDefs: currentBlock?.markDefs || [],
      }
    }

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    // Process all top-level block elements (p, h1, h2, h3, blockquote)
    // Detect the style from the first block element - this preserves heading styles
    let style = currentBlock?.style || 'normal' // Preserve existing style by default
    const blockElements: Element[] = []
    
    // Collect all block-level elements (including lists)
    for (let i = 0; i < tempDiv.children.length; i++) {
      const child = tempDiv.children[i]
      const tagName = child.tagName.toLowerCase()
      if (['p', 'h1', 'h2', 'h3', 'blockquote', 'div', 'ul', 'ol'].includes(tagName)) {
        blockElements.push(child)
        // Use the first block element's style to determine the block style
        // This ensures headings are preserved
        if (blockElements.length === 1) {
          if (tagName === 'h1') style = 'h1'
          else if (tagName === 'h2') style = 'h2'
          else if (tagName === 'h3') style = 'h3'
          else if (tagName === 'blockquote') style = 'blockquote'
          else if (tagName === 'ul' || tagName === 'ol') style = 'normal' // Lists use normal style
          else if (tagName === 'p' || tagName === 'div') style = 'normal'
        }
      }
    }
    
    // Track link markDefs - map href to mark key
    const linkMap = new Map<string, string>()
    const markDefs: any[] = []
    let markDefCounter = 0
    
    // Extract text and marks from a single element
    const extractTextAndMarksFromElement = (element: Element): Array<{ text: string, marks: string[] }> => {
      const result: Array<{ text: string, marks: string[] }> = []
      
      const processNode = (node: Node, inheritedMarks: string[] = []): void => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || ''
          if (text) {
            result.push({ text, marks: [...inheritedMarks] })
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          const marks = [...inheritedMarks]
          
          const tag = element.tagName.toLowerCase()
          if (tag === 'strong' || tag === 'b') marks.push('strong')
          else if (tag === 'em' || tag === 'i') marks.push('em')
          else if (tag === 'u') marks.push('underline')
          else if (tag === 'a') {
            // Handle link
            const href = (element as HTMLAnchorElement).href || ''
            if (href) {
              // Check if we already have a markDef for this href
              let linkKey = linkMap.get(href)
              if (!linkKey) {
                // Create new markDef
                linkKey = `link-${Date.now()}-${markDefCounter++}`
                linkMap.set(href, linkKey)
                markDefs.push({
                  _type: 'link',
                  _key: linkKey,
                  href: href,
                })
              }
              marks.push(linkKey)
            }
          }
          
          // Process child nodes
          for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i]
            if (child.nodeType === Node.TEXT_NODE) {
              const text = child.textContent || ''
              if (text) {
                result.push({ text, marks: [...marks] })
              }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const childElement = child as Element
              if (childElement.tagName.toLowerCase() === 'br') {
                // Convert <br> to newline character
                result.push({ text: '\n', marks: [...marks] })
              } else {
                processNode(child, marks)
              }
            }
          }
        }
      }
      
      processNode(element)
      return result
    }
    
    // Process all block elements, preserving list structure
    const allTextParts: Array<{ text: string, marks: string[] }> = []
    
    blockElements.forEach((blockEl, index) => {
      const tagName = blockEl.tagName.toLowerCase()
      
      // Handle lists specially - preserve their HTML structure
      if (tagName === 'ul' || tagName === 'ol') {
        // Store the entire list HTML as-is with a marker
        const listHtml = blockEl.outerHTML
        const listMarker = tagName === 'ul' ? '__LIST_HTML_UL__' : '__LIST_HTML_OL__'
        
        if (index > 0) {
          allTextParts.push({ text: '\n\n', marks: [] })
        }
        // Store the list HTML with a marker so we can restore it
        allTextParts.push({ text: `${listMarker}${listHtml}${listMarker}`, marks: [] })
      } else {
        // Regular block elements
        if (index > 0) {
          // Add newline between blocks to preserve paragraph separation
          allTextParts.push({ text: '\n\n', marks: [] })
        }
        allTextParts.push(...extractTextAndMarksFromElement(blockEl))
      }
    })
    
    // If no block elements, process the div directly
    if (blockElements.length === 0) {
      allTextParts.push(...extractTextAndMarksFromElement(tempDiv))
    }
    
    if (allTextParts.length === 0) {
      return {
        ...currentBlock,
        style: style,
        children: [{
          _type: 'span',
          _key: currentBlock.children?.[0]?._key || `span-${Date.now()}`,
          text: '',
          marks: [],
        }],
        markDefs: markDefs.length > 0 ? markDefs : (currentBlock?.markDefs || []),
      }
    }
    
    // Combine text parts with same marks
    const children: any[] = []
    let currentText = ''
    let currentMarks: string[] = []
    
    allTextParts.forEach((part, index) => {
      const marksKey = JSON.stringify(part.marks.sort())
      const currentMarksKey = JSON.stringify(currentMarks.sort())
      
      if (marksKey === currentMarksKey && index > 0) {
        currentText += part.text
      } else {
        if (currentText) {
          children.push({
            _type: 'span',
            _key: `span-${Date.now()}-${children.length}`,
            text: currentText,
            marks: currentMarks,
          })
        }
        currentText = part.text
        currentMarks = part.marks
      }
    })
    
    if (currentText) {
      children.push({
        _type: 'span',
        _key: `span-${Date.now()}-${children.length}`,
        text: currentText,
        marks: currentMarks,
      })
    }
    
    // Preserve existing markDefs that are still referenced, and add new ones
    const existingMarkDefs = currentBlock?.markDefs || []
    const existingMarkDefMap = new Map<string, any>()
    existingMarkDefs.forEach((def: any) => {
      if (def._key) {
        existingMarkDefMap.set(def._key, def)
      }
    })
    
    // Collect all mark keys used in children
    const usedMarkKeys = new Set<string>()
    children.forEach((child: any) => {
      (child.marks || []).forEach((mark: string) => {
        usedMarkKeys.add(mark)
      })
    })
    
    // Keep existing markDefs that are still referenced
    const preservedMarkDefs = existingMarkDefs.filter((def: any) => 
      def._key && usedMarkKeys.has(def._key)
    )
    
    // Combine preserved and new markDefs
    const finalMarkDefs = [...preservedMarkDefs]
    markDefs.forEach((newDef: any) => {
      if (!finalMarkDefs.find((d: any) => d._key === newDef._key)) {
        finalMarkDefs.push(newDef)
      }
    })
    
    return {
      ...currentBlock,
      style: style,
      children: children.length > 0 ? children : [{
        _type: 'span',
        _key: currentBlock.children?.[0]?._key || `span-${Date.now()}`,
        text: '',
        marks: [],
      }],
      markDefs: finalMarkDefs,
    }
  }

  // Update editor content when value changes
  useEffect(() => {
    if (editorRef.current && !isFocused) {
      const html = portableTextToHtml(value)
      // Only update if content actually changed to avoid cursor issues
      const currentHtml = editorRef.current.innerHTML.trim()
      const newHtml = html.trim()
      if (currentHtml !== newHtml) {
        // Preserve selection if possible
        const selection = window.getSelection()
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null
        
        editorRef.current.innerHTML = html || '<p><br></p>'
        
        // Restore selection if it was within the editor
        if (range && selection) {
          try {
            selection.removeAllRanges()
            selection.addRange(range)
          } catch (e) {
            // Selection might be invalid, ignore
          }
        }
      }
      checkIfEmpty()
    }
  }, [value, isFocused, portableTextToHtml])
  
  // Ensure editor always has at least a paragraph and check if empty
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML.trim() === '') {
        editorRef.current.innerHTML = '<p><br></p>'
      }
      checkIfEmpty()
    }
  }, [])

  // Auto-focus when autoFocus prop is true
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      // Wait for next tick to ensure DOM is ready
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus()
          // Move cursor to the beginning of the first block element (paragraph or list item)
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            // Check for list item first (for list items), then paragraph (for regular blocks)
            const firstElement = editorRef.current.querySelector('li') || editorRef.current.querySelector('p')
            if (firstElement) {
              range.setStart(firstElement, 0)
              range.collapse(true)
              selection.removeAllRanges()
              selection.addRange(range)
            } else {
              // Fallback: set cursor at the beginning of the editor
              range.setStart(editorRef.current, 0)
              range.collapse(true)
              selection.removeAllRanges()
              selection.addRange(range)
            }
          }
        }
      }, 0)
    }
  }, [autoFocus])

  const updateToolbarPosition = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed && editorRef.current) {
      const range = selection.getRangeAt(0)
      
      // Check if selection is within the editor
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        setShowFloatingToolbar(false)
        return
      }
      
      const rect = range.getBoundingClientRect()
      const editorRect = editorRef.current.getBoundingClientRect()
      
      if (editorRect && rect && editorRef.current) {
        // Position toolbar above the selection, centered
        const toolbarWidth = 500 // Approximate width
        const top = rect.top - editorRect.top - 50
        const editorWidth = editorRef.current.offsetWidth || editorRect.width
        const left = Math.max(10, Math.min(
          rect.left - editorRect.left + (rect.width / 2) - (toolbarWidth / 2),
          editorWidth - toolbarWidth - 10
        ))
        
        setToolbarPosition({
          top: Math.max(-30, top), // Ensure it's not too high
          left: left,
        })
        setShowFloatingToolbar(true)
      }
    } else {
      setShowFloatingToolbar(false)
    }
  }

  // Check if content is empty
  const checkIfEmpty = () => {
    if (!editorRef.current) return false
    const text = editorRef.current.textContent?.trim() || ''
    const html = editorRef.current.innerHTML.trim()
    const isContentEmpty = text === '' || html === '' || html === '<p><br></p>' || html === '<p></p>' || html === '<br>' || html === '<br/>'
    setIsEmpty(isContentEmpty)
    return isContentEmpty
  }

  const handleInput = () => {
    if (editorRef.current && isFocused) {
      const html = editorRef.current.innerHTML
      const updatedBlock = htmlToPortableText(html, value)
      onChange(updatedBlock)
    }
    checkIfEmpty()
    updateToolbarPosition()
  }
  
  const handleBlur = () => {
    // Use setTimeout to ensure we capture the final HTML state
    setTimeout(() => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML
        // Only update if we're actually losing focus (not clicking toolbar)
        if (!toolbarRef.current?.contains(document.activeElement)) {
          const updatedBlock = htmlToPortableText(html, value)
          onChange(updatedBlock)
        }
      }
      setIsFocused(false)
      setTimeout(() => {
        if (!editorRef.current?.contains(document.activeElement) && 
            !toolbarRef.current?.contains(document.activeElement)) {
          setShowFloatingToolbar(false)
        }
      }, 200)
    }, 0)
  }

  const handleSelectionChange = () => {
    updateToolbarPosition()
  }

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [])

  const handleFormat = (command: string, value?: string) => {
    // Preserve selection before applying format
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    
    // Save selection
    const savedRange = range.cloneRange()
    
    try {
      if (command === 'formatBlock' && value) {
        // Handle block-level formatting
        const selectedContent = range.extractContents()
        
        let wrapper: HTMLElement
        if (value === '<h1>') wrapper = document.createElement('h1')
        else if (value === '<h2>') wrapper = document.createElement('h2')
        else if (value === '<h3>') wrapper = document.createElement('h3')
        else if (value === '<blockquote>') wrapper = document.createElement('blockquote')
        else wrapper = document.createElement('p')
        
        wrapper.appendChild(selectedContent)
        range.insertNode(wrapper)
        
        // Move cursor after the wrapper
        range.setStartAfter(wrapper)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        // Restore selection before applying command
        selection.removeAllRanges()
        selection.addRange(savedRange)
        document.execCommand(command, false, value)
      }
      
      // Restore focus and update
      setTimeout(() => {
        editorRef.current?.focus()
        handleInput()
      }, 0)
    } catch (err) {
      console.error('Error applying format:', err)
      // Restore selection on error
      selection.removeAllRanges()
      selection.addRange(savedRange)
    }
  }

  const handleBlockStyle = (style: string) => {
    if (!editorRef.current) return
    
    const currentStyle = value?.style || 'normal'
    const newStyle = currentStyle === style ? 'normal' : style
    
    // Preserve selection
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const savedRange = range.cloneRange()
    
    try {
      const commonAncestor = range.commonAncestorContainer
      
      // Find the current block element
      let blockElement = commonAncestor.nodeType === Node.ELEMENT_NODE 
        ? commonAncestor as HTMLElement 
        : commonAncestor.parentElement
      
      while (blockElement && blockElement !== editorRef.current && !['H1', 'H2', 'H3', 'BLOCKQUOTE', 'DIV', 'P'].includes(blockElement.tagName)) {
        blockElement = blockElement.parentElement
      }
      
      if (blockElement && blockElement !== editorRef.current) {
        const content = blockElement.innerHTML
        let newElement: HTMLElement
        
        if (newStyle === 'h1') newElement = document.createElement('h1')
        else if (newStyle === 'h2') newElement = document.createElement('h2')
        else if (newStyle === 'h3') newElement = document.createElement('h3')
        else if (newStyle === 'blockquote') newElement = document.createElement('blockquote')
        else newElement = document.createElement('p')
        
        newElement.innerHTML = content
        blockElement.parentNode?.replaceChild(newElement, blockElement)
        
        // Restore selection
        setTimeout(() => {
          selection.removeAllRanges()
          selection.addRange(savedRange)
          editorRef.current?.focus()
          handleInput()
        }, 0)
      }
    } catch (err) {
      console.error('Error applying block style:', err)
      selection.removeAllRanges()
      selection.addRange(savedRange)
    }
  }

  const getBlockStyle = () => {
    return value?.style || 'normal'
  }

  const isFormatActive = (format: string) => {
    try {
      return document.queryCommandState(format)
    } catch {
      return false
    }
  }

  const isInList = (listType: 'ul' | 'ol') => {
    try {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return false
      
      const range = selection.getRangeAt(0)
      let node: Node | null = range.commonAncestorContainer
      
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (element.tagName === 'UL' && listType === 'ul') return true
          if (element.tagName === 'OL' && listType === 'ol') return true
        }
        node = node.parentNode
      }
      return false
    } catch {
      return false
    }
  }

  const handleList = (command: 'insertUnorderedList' | 'insertOrderedList') => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const savedRange = range.cloneRange()
    
    try {
      // Check if we're already in a list
      let listElement: HTMLElement | null = null
      let node: Node | null = range.commonAncestorContainer
      
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (element.tagName === 'UL' || element.tagName === 'OL') {
            listElement = element as HTMLElement
            break
          }
        }
        node = node.parentNode
      }
      
      if (listElement) {
        // If we're in a list, remove the list formatting
        document.execCommand('outdent', false)
      } else {
        // Create a new list
        selection.removeAllRanges()
        selection.addRange(savedRange)
        document.execCommand(command, false)
      }
      
      setTimeout(() => {
        editorRef.current?.focus()
        handleInput()
      }, 0)
    } catch (err) {
      console.error('Error applying list:', err)
      selection.removeAllRanges()
      selection.addRange(savedRange)
    }
  }

  const FloatingToolbar = () => {
    if (!showFloatingToolbar) return null

    return (
      <div
        ref={toolbarRef}
        className="rich-text-floating-toolbar"
        style={{
          position: 'absolute',
          top: `${toolbarPosition.top}px`,
          left: `${toolbarPosition.left}px`,
        }}
        onMouseDown={(e) => {
          // Don't prevent default - allow clicks to work
          e.stopPropagation()
        }}
      >
        <button
          type="button"
          className={`toolbar-button ${isFormatActive('bold') ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleFormat('bold')
          }}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`toolbar-button ${isFormatActive('italic') ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleFormat('italic')
          }}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`toolbar-button ${isFormatActive('underline') ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleFormat('underline')
          }}
          title="Underline"
        >
          <u>U</u>
        </button>
        <div className="toolbar-separator"></div>
        <button
          type="button"
          className={`toolbar-button ${getBlockStyle() === 'h1' ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleBlockStyle('h1')
          }}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          className={`toolbar-button ${getBlockStyle() === 'h2' ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleBlockStyle('h2')
          }}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          className={`toolbar-button ${getBlockStyle() === 'h3' ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleBlockStyle('h3')
          }}
          title="Heading 3"
        >
          H3
        </button>
        <div className="toolbar-separator"></div>
        <button
          type="button"
          className={`toolbar-button ${getBlockStyle() === 'blockquote' ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleBlockStyle('blockquote')
          }}
          title="Quote"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
          </svg>
        </button>
        <button
          type="button"
          className={`toolbar-button ${isInList('ul') ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleList('insertUnorderedList')
          }}
          title="Bullet List"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <button
          type="button"
          className={`toolbar-button ${isInList('ol') ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleList('insertOrderedList')
          }}
          title="Numbered List"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <line x1="4" y1="6" x2="4" y2="6" strokeWidth="2"></line>
            <line x1="4" y1="12" x2="4" y2="12" strokeWidth="2"></line>
            <line x1="4" y1="18" x2="4" y2="18" strokeWidth="2"></line>
          </svg>
        </button>
        <div className="toolbar-separator"></div>
        <button
          type="button"
          className={`toolbar-button ${(() => {
            try {
              const selection = window.getSelection()
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                let node: Node | null = range.commonAncestorContainer
                while (node && node !== editorRef.current) {
                  if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'A') {
                    return 'active'
                  }
                  node = node.parentNode
                }
              }
              return ''
            } catch {
              return ''
            }
          })()}`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            
            const selection = window.getSelection()
            if (!selection || selection.rangeCount === 0) return
            
            const range = selection.getRangeAt(0)
            
            // Check if selection is inside a link
            let linkElement: HTMLAnchorElement | null = null
            let node: Node | null = range.commonAncestorContainer
            while (node && node !== editorRef.current) {
              if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'A') {
                linkElement = node as HTMLAnchorElement
                break
              }
              node = node.parentNode
            }
            
            if (linkElement) {
              // Editing existing link - allow edit or remove
              const currentUrl = linkElement.href || ''
              const action = prompt(`Edit link URL (leave empty to remove):`, currentUrl)
              if (action === null) {
                // User cancelled
                return
              } else if (action === '') {
                // Remove link
                document.execCommand('unlink', false)
              } else {
                // Update link
                linkElement.href = action
                handleInput()
              }
            } else {
              // Create new link
              const url = prompt('Enter URL:')
              if (url) {
                handleFormat('createLink', url)
              }
            }
          }}
          title="Link"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="rich-text-editor">
      <div
        ref={editorRef}
        contentEditable
        className={`rich-text-content ${isEmpty && !isFocused ? 'is-empty' : ''}`}
        onInput={(e) => {
          // Ensure content is wrapped in paragraphs
          if (editorRef.current) {
            const children = Array.from(editorRef.current.childNodes)
            if (children.length === 0 || (children.length === 1 && children[0].nodeType === Node.TEXT_NODE)) {
              // Wrap in paragraph if needed
              const p = document.createElement('p')
              while (editorRef.current.firstChild) {
                p.appendChild(editorRef.current.firstChild)
              }
              editorRef.current.appendChild(p)
            }
          }
          handleInput()
        }}
        onFocus={() => {
          setIsFocused(true)
          setTimeout(() => checkIfEmpty(), 0)
          if (onFocus) {
            onFocus()
          }
        }}
        onBlur={(e) => {
          handleBlur()
          if (onBlur) {
            // Use setTimeout to allow menu clicks to register before blur
            setTimeout(() => {
              if (onBlur) {
                onBlur()
              }
            }, 200)
          }
        }}
        onMouseUp={updateToolbarPosition}
        onClick={(e) => {
          // Prevent link navigation when clicking links in the editor
          // Allow Ctrl/Cmd+Click to open links in new tab
          const target = e.target as HTMLElement
          if (target.tagName === 'A' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            // Select the link text for editing
            const selection = window.getSelection()
            if (selection) {
              const range = document.createRange()
              range.selectNodeContents(target)
              selection.removeAllRanges()
              selection.addRange(range)
              updateToolbarPosition()
            }
          }
        }}
        onKeyDown={(e) => {
          // Handle Backspace/Delete when content is empty to delete the block
          if ((e.key === 'Backspace' || e.key === 'Delete') && onDeleteBlock && editorRef.current) {
            const text = editorRef.current.textContent?.trim() || ''
            const html = editorRef.current.innerHTML.trim()
            const isEmpty = text === '' || html === '' || html === '<p><br></p>' || html === '<p></p>' || html === '<br>' || html === '<br/>'
            
            if (isEmpty) {
              e.preventDefault()
              onDeleteBlock()
              return
            }
          }
          
          // Handle Enter key to create new paragraphs or list items
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              
              // Check if current block is a list item (by checking listItem property)
              const isListItem = value?.listItem === 'bullet' || value?.listItem === 'number' || value?.style === 'bullet' || value?.style === 'number'
              
              // Also check DOM for list items (for backward compatibility)
              let listItem: HTMLElement | null = null
              let listElement: HTMLElement | null = null
              let node: Node | null = range.commonAncestorContainer
              
              while (node && node !== editorRef.current) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element
                  if (element.tagName === 'LI') {
                    listItem = element as HTMLElement
                    let parent = element.parentElement
                    while (parent && parent !== editorRef.current) {
                      if (parent.tagName === 'UL' || parent.tagName === 'OL') {
                        listElement = parent as HTMLElement
                        break
                      }
                      parent = parent.parentElement
                    }
                    break
                  }
                }
                node = node.parentNode
              }
              
              // If we're in a list item (either by property or DOM), handle it specially
              if (isListItem && onAddNewListItem && editorRef.current) {
                try {
                  // Check if the current list item is empty
                  const currentText = editorRef.current.textContent?.trim() || ''
                  const currentHtml = editorRef.current.innerHTML.trim()
                  const isEmpty = currentText === '' || currentHtml === '' || currentHtml === '<br>' || currentHtml === '<br/>' || currentHtml === '<li><br></li>' || currentHtml === '<li></li>'
                  
                  // If list item is empty, create a regular paragraph block instead
                  if (isEmpty && onAddNewBlock) {
                    // Remove listItem properties to create a regular paragraph
                    const emptyBlock = {
                      _type: 'block',
                      _key: value._key,
                      style: 'normal',
                      children: [{
                        _type: 'span',
                        _key: `span-${Date.now()}`,
                        text: '',
                        marks: [],
                      }],
                      markDefs: value.markDefs || [],
                    }
                    
                    const newParagraphBlock = {
                      _type: 'block',
                      _key: `block-${Date.now()}`,
                      style: 'normal',
                      children: [{
                        _type: 'span',
                        _key: `span-${Date.now()}`,
                        text: '',
                        marks: [],
                      }],
                      markDefs: value.markDefs || [],
                    }
                    
                    // Update current block to remove list item properties
                    onChange(emptyBlock)
                    
                    // Create new paragraph block
                    onAddNewBlock(emptyBlock, newParagraphBlock)
                    
                    return
                  }
                  
                  // Split content at cursor position
                  const rangeBefore = range.cloneRange()
                  rangeBefore.setStart(editorRef.current, 0)
                  rangeBefore.setEnd(range.startContainer, range.startOffset)
                  
                  const rangeAfter = range.cloneRange()
                  rangeAfter.setStart(range.endContainer, range.endOffset)
                  rangeAfter.setEnd(editorRef.current, editorRef.current.childNodes.length)
                  
                  const beforeContents = rangeBefore.cloneContents()
                  const afterContents = rangeAfter.cloneContents()
                  
                  const beforeContainer = document.createElement('div')
                  const afterContainer = document.createElement('div')
                  
                  beforeContainer.appendChild(beforeContents)
                  afterContainer.appendChild(afterContents)
                  
                  const htmlBefore = beforeContainer.innerHTML.trim()
                  const htmlAfter = afterContainer.innerHTML.trim()
                  
                  // Check if content before cursor is empty
                  const beforeText = beforeContainer.textContent?.trim() || ''
                  const beforeIsEmpty = beforeText === '' || htmlBefore === '' || htmlBefore === '<br>' || htmlBefore === '<br/>'
                  
                  // If content before cursor is empty, create a regular paragraph instead
                  if (beforeIsEmpty && onAddNewBlock) {
                    // Remove listItem properties from current block
                    const emptyBlock = {
                      _type: 'block',
                      _key: value._key,
                      style: 'normal',
                      children: [{
                        _type: 'span',
                        _key: `span-${Date.now()}`,
                        text: '',
                        marks: [],
                      }],
                      markDefs: value.markDefs || [],
                    }
                    
                    // Convert content after cursor to a regular paragraph
                    const newParagraphBlock = htmlAfter ? htmlToPortableText(htmlAfter, {
                      _type: 'block',
                      _key: `block-${Date.now()}`,
                      style: 'normal',
                      children: [],
                      markDefs: value.markDefs || [],
                    }) : {
                      _type: 'block',
                      _key: `block-${Date.now()}`,
                      style: 'normal',
                      children: [{
                        _type: 'span',
                        _key: `span-${Date.now()}`,
                        text: '',
                        marks: [],
                      }],
                      markDefs: value.markDefs || [],
                    }
                    
                    // Ensure it's a regular paragraph (no listItem)
                    newParagraphBlock.listItem = undefined
                    newParagraphBlock.level = undefined
                    
                    // Update current block to remove list item properties
                    onChange(emptyBlock)
                    
                    // Create new paragraph block
                    onAddNewBlock(emptyBlock, newParagraphBlock)
                    
                    return
                  }
                  
                  // Convert HTML to portable text blocks
                  const listItemType = value.listItem || (value.style === 'bullet' ? 'bullet' : value.style === 'number' ? 'number' : 'bullet')
                  const listItemLevel = value.level || 1 // Preserve level or default to 1
                  
                  const blockBefore = htmlBefore ? htmlToPortableText(htmlBefore, {
                    ...value,
                    listItem: listItemType,
                    style: 'normal', // Ensure style is normal for list items
                    level: listItemLevel,
                  }) : {
                    _type: 'block',
                    _key: value._key,
                    style: 'normal',
                    listItem: listItemType,
                    level: listItemLevel,
                    children: [{
                      _type: 'span',
                      _key: `span-${Date.now()}`,
                      text: '',
                      marks: [],
                    }],
                    markDefs: value.markDefs || [],
                  }
                  
                  // Ensure blockBefore has listItem property and normal style
                  blockBefore.listItem = listItemType
                  blockBefore.style = 'normal'
                  blockBefore.level = listItemLevel
                  
                  const blockAfter = htmlAfter ? htmlToPortableText(htmlAfter, {
                    ...value,
                    _key: `block-${Date.now()}`,
                    listItem: listItemType,
                    style: 'normal', // Ensure style is normal for list items
                    level: listItemLevel,
                  }) : {
                    _type: 'block',
                    _key: `block-${Date.now()}`,
                    style: 'normal',
                    listItem: listItemType,
                    level: listItemLevel,
                    children: [{
                      _type: 'span',
                      _key: `span-${Date.now()}`,
                      text: '',
                      marks: [],
                    }],
                    markDefs: value.markDefs || [],
                  }
                  
                  // Ensure blockAfter has listItem property and normal style
                  blockAfter.listItem = listItemType
                  blockAfter.style = 'normal'
                  blockAfter.level = listItemLevel
                  
                  // Update current block with content before cursor
                  onChange(blockBefore)
                  
                  // Create new list item block with content after cursor
                  onAddNewListItem(blockBefore, blockAfter)
                  
                  return
                } catch (err) {
                  console.error('Error splitting list item:', err)
                }
              }
              
              // Handle DOM-based list items (for backward compatibility)
              if (listItem && listElement) {
                // Check if current list item is empty (only contains <br> or is empty)
                const listItemText = listItem.textContent?.trim() || ''
                const listItemHtml = listItem.innerHTML.trim()
                const isEmpty = listItemText === '' || listItemHtml === '' || listItemHtml === '<br>' || listItemHtml === '<br/>'
                
                if (isEmpty) {
                  // If list item is empty, remove it and create a paragraph after the list
                  const newP = document.createElement('p')
                  newP.innerHTML = ''
                  
                  // Insert paragraph after the list
                  if (listElement.parentNode) {
                    listElement.parentNode.insertBefore(newP, listElement.nextSibling)
                  } else if (editorRef.current) {
                    editorRef.current.appendChild(newP)
                  }
                  
                  // Remove the empty list item
                  listItem.remove()
                  
                  // If list is now empty, remove it too
                  if (listElement.children.length === 0) {
                    listElement.remove()
                  }
                  
                  // Move cursor to new paragraph
                  range.setStart(newP, 0)
                  range.collapse(true)
                  selection.removeAllRanges()
                  selection.addRange(range)
                } else {
                  // We're inside a list with content, create a new list item
                  const newLi = document.createElement('li')
                  newLi.innerHTML = '<br>'
                  
                  // Insert after current list item
                  if (listItem.parentNode === listElement) {
                    listElement.insertBefore(newLi, listItem.nextSibling)
                  } else {
                    // If listItem is nested, insert at the same level
                    listItem.parentNode?.insertBefore(newLi, listItem.nextSibling)
                  }
                  
                  // Move cursor to new list item
                  range.setStart(newLi, 0)
                  range.collapse(true)
                  selection.removeAllRanges()
                  selection.addRange(range)
                }
              } else {
                // Not in a list - create a new separate block instead of a new paragraph
                if (onAddNewBlock && editorRef.current) {
                  try {
                    // Find the paragraph containing the cursor
                    let p: HTMLElement | null = range.commonAncestorContainer as HTMLElement
                    if (p.nodeType !== Node.ELEMENT_NODE) {
                      p = p.parentElement
                    }
                    while (p && p.tagName !== 'P' && p.tagName !== 'H1' && p.tagName !== 'H2' && p.tagName !== 'H3' && p.tagName !== 'BLOCKQUOTE' && p !== editorRef.current) {
                      p = p.parentElement
                    }
                    
                    if (p) {
                      // Get all paragraphs
                      const allParagraphs = Array.from(editorRef.current.querySelectorAll('p, h1, h2, h3, blockquote'))
                      const currentPIndex = allParagraphs.indexOf(p)
                      
                      // Split content: everything before cursor position goes to current block, everything after goes to new block
                      const rangeBefore = range.cloneRange()
                      rangeBefore.setStart(editorRef.current, 0)
                      rangeBefore.setEnd(range.startContainer, range.startOffset)
                      
                      const rangeAfter = range.cloneRange()
                      rangeAfter.setStart(range.endContainer, range.endOffset)
                      rangeAfter.setEnd(editorRef.current, editorRef.current.childNodes.length)
                      
                      // Clone contents (don't extract to avoid DOM modification)
                      const beforeContents = rangeBefore.cloneContents()
                      const afterContents = rangeAfter.cloneContents()
                      
                      // Create temporary containers
                      const beforeContainer = document.createElement('div')
                      const afterContainer = document.createElement('div')
                      
                      beforeContainer.appendChild(beforeContents)
                      afterContainer.appendChild(afterContents)
                      
                      const htmlBefore = beforeContainer.innerHTML.trim()
                      const htmlAfter = afterContainer.innerHTML.trim()
                      
                      // Convert HTML to portable text blocks
                      const blockBefore = htmlBefore ? htmlToPortableText(htmlBefore, value) : {
                        _type: 'block',
                        _key: value._key,
                        style: 'normal',
                        children: [{
                          _type: 'span',
                          _key: `span-${Date.now()}`,
                          text: '',
                          marks: [],
                        }],
                        markDefs: value.markDefs || [],
                      }
                      
                      const blockAfter = htmlAfter ? htmlToPortableText(htmlAfter, value) : {
                        _type: 'block',
                        _key: `block-${Date.now()}`,
                        style: 'normal',
                        children: [{
                          _type: 'span',
                          _key: `span-${Date.now()}`,
                          text: '',
                          marks: [],
                        }],
                        markDefs: value.markDefs || [],
                      }
                      
                      // Update current block with content before cursor
                      onChange(blockBefore)
                      
                      // Create new block with content after cursor
                      onAddNewBlock(blockBefore, blockAfter)
                      
                      return
                    }
                  } catch (err) {
                    console.error('Error splitting content:', err)
                  }
                }
                
                // Fallback: create a new paragraph if onAddNewBlock is not provided
                let p: HTMLElement | null = range.commonAncestorContainer as HTMLElement
                if (p.nodeType !== Node.ELEMENT_NODE) {
                  p = p.parentElement
                }
                while (p && p.tagName !== 'P' && p.tagName !== 'H1' && p.tagName !== 'H2' && p.tagName !== 'H3' && p.tagName !== 'BLOCKQUOTE' && p !== editorRef.current) {
                  p = p.parentElement
                }
                
                // Create new paragraph
                const newP = document.createElement('p')
                newP.innerHTML = '<br>'
                
                if (p && p.parentNode) {
                  p.parentNode.insertBefore(newP, p.nextSibling)
                } else if (editorRef.current) {
                  editorRef.current.appendChild(newP)
                }
                
                // Move cursor to new paragraph
                range.setStart(newP, 0)
                range.collapse(true)
                selection.removeAllRanges()
                selection.addRange(range)
              }
              
              setTimeout(() => {
                handleInput()
              }, 0)
            }
          }
        }}
        onKeyUp={(e) => {
          if (e.key !== 'Enter') {
            updateToolbarPosition()
          }
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      {isEmpty && !isFocused && (
        <div className="rich-text-placeholder-overlay">
          {placeholder}
        </div>
      )}
      <FloatingToolbar />
    </div>
  )
}

