// CrisMD Renderer Script

// State
let tabs = [];
let activeTabId = null;
let recentFiles = [];
let zoomFactor = 1.0;
let currentSearchMatches = [];
let activeSearchIndex = -1;
let isEditing = false;
let editSnapshot = '';

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const openFileBtn = document.getElementById('open-file-btn');
const emptyOpenBtn = document.getElementById('empty-open-btn');
const recentFilesList = document.getElementById('recent-files-list');
const documentOutline = document.getElementById('document-outline');
const tabsContainer = document.getElementById('tabs-container');
const newTabBtn = document.getElementById('new-tab-btn');
const markdownBody = document.getElementById('markdown-body');
const emptyState = document.getElementById('empty-state');
const emptyOpenBtnInside = document.getElementById('empty-open-btn');

// Window controls
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

// Zoom controls
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomResetBtn = document.getElementById('zoom-reset-btn');
const zoomLevelSpan = document.getElementById('zoom-level');

// Search Controls
const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchPanel = document.getElementById('search-panel');
const searchInput = document.getElementById('search-input');
const searchResultsCount = document.getElementById('search-results-count');
const searchPrevBtn = document.getElementById('search-prev-btn');
const searchNextBtn = document.getElementById('search-next-btn');
const searchCloseBtn = document.getElementById('search-close-btn');

// Print Control
const printBtn = document.getElementById('print-btn');

// Edit Controls
const editToggleBtn = document.getElementById('edit-toggle-btn');
const editToolbar = document.getElementById('edit-toolbar');
const editSaveBtn = document.getElementById('edit-save-btn');
const editCancelBtn = document.getElementById('edit-cancel-btn');

// Theme Controls
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIconPath = document.getElementById('theme-icon-path');

// Initialize
function init() {
  loadRecentFiles();
  setupEventListeners();
  
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
  
  // Configure Marked Options
  if (window.marked) {
    window.marked.setOptions({
      gfm: true,
      breaks: true,
      pedantic: false
    });
  }

  // Check if a file was passed as startup argument
  window.electronAPI.getStartupFile().then(fileInfo => {
    if (fileInfo) {
      openFileContent(fileInfo.name, fileInfo.path, fileInfo.content);
    }
  });

  // Listen for file-open events from main process (e.g. double click when running)
  window.electronAPI.onOpenFile((filePath) => {
    window.electronAPI.readFile(filePath).then(result => {
      if (result.success) {
        openFileContent(result.name, result.path, result.content);
      } else {
        alert(`Failed to open file: ${result.error}`);
      }
    });
  });
}

// Event Listeners Setup
function setupEventListeners() {
  // Titlebar controls
  minBtn.addEventListener('click', () => window.electronAPI.minimize());
  maxBtn.addEventListener('click', () => window.electronAPI.maximize());
  closeBtn.addEventListener('click', () => window.electronAPI.close());

  // Sidebar toggle
  const toggleSidebar = () => {
    sidebar.classList.toggle('collapsed');
  };
  sidebarToggle.addEventListener('click', toggleSidebar);
  sidebarClose.addEventListener('click', toggleSidebar);

  // File open clicks
  const triggerOpenFile = () => {
    window.electronAPI.openFiles().then(files => {
      if (files && files.length > 0) {
        files.forEach(file => {
          openFileContent(file.name, file.path, file.content);
        });
      }
    });
  };
  openFileBtn.addEventListener('click', triggerOpenFile);
  newTabBtn.addEventListener('click', triggerOpenFile);
  if (emptyOpenBtn) emptyOpenBtn.addEventListener('click', triggerOpenFile);

  // Zoom events
  zoomInBtn.addEventListener('click', () => adjustZoom(0.1));
  zoomOutBtn.addEventListener('click', () => adjustZoom(-0.1));
  zoomResetBtn.addEventListener('click', () => resetZoom());

  // Print event
  printBtn.addEventListener('click', () => window.print());

  // Theme toggle event
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
    });
  }

  // Edit mode events
  editToggleBtn.addEventListener('click', () => {
    if (isEditing) {
      cancelEdit();
    } else {
      enterEditMode();
    }
  });
  editSaveBtn.addEventListener('click', saveEdit);
  editCancelBtn.addEventListener('click', cancelEdit);

  document.querySelectorAll('.edit-cmd-btn').forEach(btn => {
    // mousedown + preventDefault keeps focus and selection inside the editor
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.execCommand(btn.dataset.cmd, false, btn.dataset.value || null);
    });
  });

  // Search panel events
  searchToggleBtn.addEventListener('click', toggleSearchPanel);
  searchCloseBtn.addEventListener('click', hideSearchPanel);
  searchInput.addEventListener('input', () => performSearch(searchInput.value));
  searchNextBtn.addEventListener('click', () => navigateSearch(1));
  searchPrevBtn.addEventListener('click', () => navigateSearch(-1));
  
  // Search keyboard controls
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        navigateSearch(-1);
      } else {
        navigateSearch(1);
      }
    } else if (e.key === 'Escape') {
      hideSearchPanel();
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      triggerOpenFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      if (activeTabId) closeTab(activeTabId);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '=') { // Ctrl + Plus
      e.preventDefault();
      adjustZoom(0.1);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') { // Ctrl + Minus
      e.preventDefault();
      adjustZoom(-0.1);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') { // Ctrl + Zero
      e.preventDefault();
      resetZoom();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { // Ctrl + F
      e.preventDefault();
      showSearchPanel();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') { // Ctrl + E
      e.preventDefault();
      if (isEditing) {
        cancelEdit();
      } else {
        enterEditMode();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { // Ctrl + S
      e.preventDefault();
      if (isEditing) saveEdit();
    }
    if (e.key === 'Escape' && isEditing) {
      cancelEdit();
    }
  });

  // Drag and Drop support
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of files) {
        // File.path was removed in Electron 32+; resolve via webUtils in preload
        const filePath = window.electronAPI.getPathForFile(file);
        if (!filePath) continue;
        window.electronAPI.readFile(filePath).then(result => {
          if (result.success) {
            openFileContent(result.name, result.path, result.content);
          }
        });
      }
    }
  });
}

// Tab Management
function openFileContent(name, filePath, content) {
  if (!confirmLeaveEditMode()) return;

  // Check if already open
  const existingTab = tabs.find(t => t.path === filePath);
  if (existingTab) {
    switchTab(existingTab.id);
    return;
  }

  // Create new tab state
  const tabId = 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const newTab = {
    id: tabId,
    name: name,
    path: filePath,
    content: content,
    scrollY: 0
  };

  tabs.push(newTab);
  
  // Render the tab item
  renderTabElement(newTab);
  
  // Switch to it
  switchTab(tabId);
  
  // Save to recent files
  addRecentFile(name, filePath);
}

function renderTabElement(tab) {
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.id = tab.id;
  tabEl.title = tab.path; // Show path on hover
  
  const titleEl = document.createElement('span');
  titleEl.className = 'tab-title';
  titleEl.textContent = tab.name;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close';
  closeBtn.innerHTML = `
    <svg viewBox="0 0 10 10" width="8" height="8">
      <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.2"/>
      <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.2"/>
    </svg>
  `;
  
  tabEl.appendChild(titleEl);
  tabEl.appendChild(closeBtn);
  
  // Click to switch
  tabEl.addEventListener('click', (e) => {
    if (e.target.closest('.tab-close')) {
      e.stopPropagation();
      closeTab(tab.id);
    } else {
      switchTab(tab.id);
    }
  });
  
  tabsContainer.appendChild(tabEl);
}

function switchTab(tabId) {
  if (isEditing && tabId !== activeTabId && !confirmLeaveEditMode()) return;

  // Save scroll of old tab
  if (activeTabId) {
    const oldTab = tabs.find(t => t.id === activeTabId);
    if (oldTab) {
      oldTab.scrollY = document.getElementById('viewer-container').scrollTop;
    }
    const activeEl = document.getElementById(activeTabId);
    if (activeEl) activeEl.classList.remove('active');
  }

  activeTabId = tabId;
  const newTab = tabs.find(t => t.id === tabId);
  
  if (newTab) {
    // UI active classes
    const newActiveEl = document.getElementById(tabId);
    if (newActiveEl) newActiveEl.classList.add('active');
    
    // Scroll active tab into view in tabbar
    if (newActiveEl) {
      newActiveEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    // Hide empty state
    emptyState.classList.remove('empty-state-visible');
    
    // Render Markdown
    renderMarkdown(newTab.content);
    
    // Restore scroll position
    setTimeout(() => {
      document.getElementById('viewer-container').scrollTop = newTab.scrollY;
    }, 10);

    // Refresh Outline
    generateOutline();
    
    // Clear/refresh search
    if (!searchPanel.classList.contains('hidden')) {
      performSearch(searchInput.value);
    }
  } else {
    // Show empty state if no active tab
    activeTabId = null;
    markdownBody.innerHTML = '';
    emptyState.classList.add('empty-state-visible');
    documentOutline.innerHTML = '<div class="empty-outline-msg">No document loaded</div>';
    hideSearchPanel();
  }
}

function closeTab(tabId) {
  const tabIndex = tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  if (tabId === activeTabId && !confirmLeaveEditMode()) return;

  // Remove tab element from DOM
  const tabEl = document.getElementById(tabId);
  if (tabEl) tabEl.remove();

  // Remove from state
  tabs.splice(tabIndex, 1);

  // If closed active tab, switch to another
  if (activeTabId === tabId) {
    if (tabs.length > 0) {
      // Switch to adjacent tab
      const nextActiveIndex = Math.max(0, tabIndex - 1);
      switchTab(tabs[nextActiveIndex].id);
    } else {
      switchTab(null);
    }
  }
}

// Markdown Rendering
function sanitizeHtml(html) {
  // Markdown may embed raw HTML; strip anything executable before injecting
  return window.DOMPurify ? DOMPurify.sanitize(html) : html;
}

function renderMarkdown(markdownText) {
  if (!window.marked) {
    const pre = document.createElement('pre');
    pre.textContent = markdownText;
    markdownBody.innerHTML = '';
    markdownBody.appendChild(pre);
    return;
  }

  try {
    // Parse Markdown to HTML
    let htmlContent = sanitizeHtml(window.marked.parse(markdownText));
    markdownBody.innerHTML = htmlContent;
    
    // Enhance rendered HTML
    enhanceMarkdownDOM();
  } catch (err) {
    markdownBody.innerHTML = `<div class="error-msg">Error rendering markdown: ${err.message}</div>`;
  }
}

function enhanceMarkdownDOM() {
  // 1. Wrap checkboxes/lists cleanly
  const checkBoxes = markdownBody.querySelectorAll('input[type="checkbox"]');
  checkBoxes.forEach(cb => {
    cb.disabled = true; // View-only
    const li = cb.parentElement;
    if (li && li.tagName === 'LI') {
      li.classList.add('task-list-item');
    }
  });

  // 2. Add wrapper + copy button to all pre/code blocks
  const preBlocks = markdownBody.querySelectorAll('pre');
  preBlocks.forEach(pre => {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.title = 'Copy Code Block';
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14">
        <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
    `;
    
    copyBtn.addEventListener('click', () => {
      const code = pre.querySelector('code');
      const textToCopy = code ? code.innerText : pre.innerText;
      navigator.clipboard.writeText(textToCopy).then(() => {
        // Temporary success UI
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" style="color: #10b981;">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        `;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          `;
        }, 2000);
      });
    });
    
    wrapper.appendChild(copyBtn);
  });
}

// WYSIWYG Editing
let turndownService = null;

function getTurndown() {
  if (!turndownService && window.TurndownService) {
    turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-'
    });
    if (window.turndownPluginGfm) {
      turndownService.use(turndownPluginGfm.gfm);
    }
  }
  return turndownService;
}

function enterEditMode() {
  if (isEditing || !activeTabId || !window.marked || !getTurndown()) return;
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return;

  hideSearchPanel();

  // Re-render without viewer enhancements (copy buttons, wrappers) so the
  // edited DOM converts cleanly back to Markdown
  markdownBody.innerHTML = sanitizeHtml(window.marked.parse(tab.content));
  markdownBody.contentEditable = 'true';
  editSnapshot = markdownBody.innerHTML;

  isEditing = true;
  document.body.classList.add('editing');
  editToolbar.classList.remove('hidden');
  markdownBody.focus();
}

function exitEditMode() {
  isEditing = false;
  editSnapshot = '';
  markdownBody.contentEditable = 'false';
  document.body.classList.remove('editing');
  editToolbar.classList.add('hidden');

  const tab = tabs.find(t => t.id === activeTabId);
  if (tab) {
    renderMarkdown(tab.content);
    generateOutline();
  }
}

function saveEdit() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return;

  const markdown = getTurndown().turndown(markdownBody.innerHTML);
  window.electronAPI.saveFile(tab.path, markdown).then(result => {
    if (result && result.success) {
      tab.content = markdown;
      exitEditMode();
    } else {
      alert(`Failed to save file: ${result ? result.error : 'unknown error'}`);
    }
  });
}

function cancelEdit() {
  if (markdownBody.innerHTML !== editSnapshot && !confirm('Discard unsaved changes?')) {
    return;
  }
  exitEditMode();
}

// Returns false if the user chose to stay in edit mode
function confirmLeaveEditMode() {
  if (!isEditing) return true;
  if (markdownBody.innerHTML !== editSnapshot && !confirm('Discard unsaved changes?')) {
    return false;
  }
  exitEditMode();
  return true;
}

// Outline / Table of Contents
function generateOutline() {
  documentOutline.innerHTML = '';
  
  const headings = markdownBody.querySelectorAll('h1, h2, h3');
  if (headings.length === 0) {
    documentOutline.innerHTML = '<div class="empty-outline-msg">No headings in document</div>';
    return;
  }
  
  headings.forEach((heading, idx) => {
    // Generate heading ID if not present
    if (!heading.id) {
      heading.id = 'heading-' + idx;
    }
    
    const outlineItem = document.createElement('a');
    outlineItem.className = `outline-item ${heading.tagName.toLowerCase()}`;
    outlineItem.textContent = heading.innerText;
    outlineItem.href = '#' + heading.id;
    
    outlineItem.addEventListener('click', (e) => {
      e.preventDefault();
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    documentOutline.appendChild(outlineItem);
  });
}

// Zoom Management
function adjustZoom(delta) {
  zoomFactor = Math.min(Math.max(0.5, zoomFactor + delta), 3.0);
  applyZoom();
}

function resetZoom() {
  zoomFactor = 1.0;
  applyZoom();
}

function applyZoom() {
  // Round to nearest 10%
  const percentage = Math.round(zoomFactor * 100);
  zoomLevelSpan.textContent = `${percentage}%`;
  
  // Set css zoom property on markdown body
  markdownBody.style.zoom = zoomFactor;
}

// Find in Page (Search)
function showSearchPanel() {
  if (isEditing) return; // Highlight spans would get saved into the document
  searchPanel.classList.remove('hidden');
  searchInput.focus();
  searchInput.select();
  if (searchInput.value) {
    performSearch(searchInput.value);
  }
}

function hideSearchPanel() {
  searchPanel.classList.add('hidden');
  removeHighlights();
  currentSearchMatches = [];
  activeSearchIndex = -1;
  searchResultsCount.textContent = '0/0';
}

function toggleSearchPanel() {
  if (searchPanel.classList.contains('hidden')) {
    showSearchPanel();
  } else {
    hideSearchPanel();
  }
}

function removeHighlights() {
  const highlights = markdownBody.querySelectorAll('.search-highlight');
  highlights.forEach(span => {
    const parent = span.parentNode;
    if (parent) {
      const textNode = document.createTextNode(span.textContent);
      parent.replaceChild(textNode, span);
      parent.normalize(); // Merges adjacent text nodes
    }
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function performSearch(term) {
  removeHighlights();
  currentSearchMatches = [];
  activeSearchIndex = -1;
  
  if (!term || !activeTabId) {
    searchResultsCount.textContent = '0/0';
    return;
  }

  // Walk text nodes and highlight matches
  const walker = document.createTreeWalker(markdownBody, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue.trim()) {
      textNodes.push(node);
    }
  }
  
  let matchCount = 0;
  const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
  
  // Walk backwards to replace nodes without indexing errors
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const node = textNodes[i];
    const parent = node.parentNode;
    
    // Skip script blocks or nodes already inside highlight spans
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.classList.contains('search-highlight') || parent.closest('.code-copy-btn')) {
      continue;
    }
    
    const text = node.nodeValue;
    if (regex.test(text)) {
      regex.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }
        
        const span = document.createElement('span');
        span.className = 'search-highlight';
        span.textContent = match[0];
        fragment.appendChild(span);
        
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }
      
      parent.replaceChild(fragment, node);
    }
  }
  
  // Re-fetch all created highlight spans
  currentSearchMatches = Array.from(markdownBody.querySelectorAll('.search-highlight'));
  
  if (currentSearchMatches.length > 0) {
    activeSearchIndex = 0;
    highlightActiveMatch();
  } else {
    searchResultsCount.textContent = '0/0';
  }
}

function highlightActiveMatch() {
  // Clear old active highlight
  currentSearchMatches.forEach(el => el.classList.remove('search-highlight-active'));
  
  if (activeSearchIndex < 0 || activeSearchIndex >= currentSearchMatches.length) {
    return;
  }
  
  const activeEl = currentSearchMatches[activeSearchIndex];
  activeEl.classList.add('search-highlight-active');
  
  // Update count indicator
  searchResultsCount.textContent = `${activeSearchIndex + 1}/${currentSearchMatches.length}`;
  
  // Scroll into view
  activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function navigateSearch(direction) {
  if (currentSearchMatches.length === 0) return;
  
  activeSearchIndex += direction;
  if (activeSearchIndex >= currentSearchMatches.length) {
    activeSearchIndex = 0; // wrap to start
  } else if (activeSearchIndex < 0) {
    activeSearchIndex = currentSearchMatches.length - 1; // wrap to end
  }
  
  highlightActiveMatch();
}

// Recent Files Persistence
function loadRecentFiles() {
  try {
    recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
  } catch (e) {
    recentFiles = [];
  }
  renderRecentFiles();
}

function addRecentFile(name, filePath) {
  // Filter out existing
  recentFiles = recentFiles.filter(item => item.path !== filePath);
  
  // Add to top
  recentFiles.unshift({ name, path: filePath });
  
  // Keep only top 10
  if (recentFiles.length > 10) {
    recentFiles.pop();
  }
  
  localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
  renderRecentFiles();
}

function renderRecentFiles() {
  recentFilesList.innerHTML = '';
  
  if (recentFiles.length === 0) {
    recentFilesList.innerHTML = '<li class="empty-list-msg">No recent files</li>';
    return;
  }
  
  recentFiles.forEach(file => {
    const li = document.createElement('li');
    li.title = file.path;
    li.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" style="color: var(--accent);">
        <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
    `;
    const nameSpan = document.createElement('span');
    nameSpan.textContent = file.name;
    li.appendChild(nameSpan);
    
    li.addEventListener('click', () => {
      window.electronAPI.readFile(file.path).then(result => {
        if (result.success) {
          openFileContent(result.name, result.path, result.content);
        } else {
          alert(`Failed to open recent file: ${result.error}`);
          // Remove from list if file no longer exists
          recentFiles = recentFiles.filter(item => item.path !== file.path);
          localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
          renderRecentFiles();
        }
      });
    });
    
    recentFilesList.appendChild(li);
  });
}

// Theme Toggle Logic
function applyTheme(theme) {
  if (!themeToggleBtn || !themeIconPath) return;
  
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    // Show moon icon (option to switch to dark)
    themeIconPath.setAttribute('d', 'M12.3 22c-5.5 0-10-4.5-10-10 0-4.8 3.4-8.8 8-9.8.5-.1 1 .3.9.8-.1.5-.4 1-.4 1.5 0 4.4 3.6 8 8 8 .5 0 1-.1 1.5-.4.5-.1.9.4.8.9-.9 4.6-5 8-9.8 8z');
    themeToggleBtn.title = 'Switch to Dark Theme';
  } else {
    document.body.classList.remove('light-theme');
    // Show sun icon (option to switch to light)
    themeIconPath.setAttribute('d', 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z');
    themeToggleBtn.title = 'Switch to Light Theme';
  }
}

// Run Initialization
document.addEventListener('DOMContentLoaded', init);
