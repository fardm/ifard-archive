/* Bases to HTML - Type-Aware Interactive Engine */
(function() {
  'use strict';

  var dataEl = document.getElementById('base-data');
  if (!dataEl) return;

  var baseData;
  try {
    baseData = JSON.parse(dataEl.textContent || '{}');
  } catch (e) {
    console.error('Failed to parse base-data JSON:', e);
    return;
  }

  var base = baseData.base;
  var items = baseData.items;
  var exportScope = baseData.exportScope || 'full';
  if (!base || !items) return;

  var storagePrefix = 'b2h_' + (base.title || 'default') + '_';

  // Global settings state
  var currentTheme = localStorage.getItem('b2h_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var currentWidth = localStorage.getItem('b2h_width') || 'normal';
  var defaultExportedFont = (document.documentElement && document.documentElement.getAttribute('data-font')) || 'system-sans';
  var savedFont = localStorage.getItem('b2h_font');
  var currentFont = savedFont || defaultExportedFont;

  // Base state
  var currentViewIdx = 0;
  var savedViewIdx = localStorage.getItem(storagePrefix + 'view_idx');
  if (savedViewIdx !== null && !isNaN(Number(savedViewIdx)) && Number(savedViewIdx) < base.views.length) {
    currentViewIdx = Number(savedViewIdx);
  }

  var searchQuery = '';
  var globalFilterTree = { type: 'group', conjunction: 'and', children: [] };
  var viewFilterTree = { type: 'group', conjunction: 'and', children: [] };
  var activePillDropdown = null;
  var activeSortRules = [];
  var activeGroupRule = null;
  var activeOrder = [];

  // Property types dictionary from export
  var propertyTypes = base.propertyTypes || {};

  // Standard operators by type (aligned with Obsidian Bases UI)
  var OPERATORS_BY_TYPE = {
    text: [
      { id: 'is', label: 'is' },
      { id: 'is_not', label: 'is not' },
      { id: 'contains', label: 'contains' },
      { id: 'does_not_contain', label: 'does not contain' },
      { id: 'starts_with', label: 'starts with' },
      { id: 'does_not_start_with', label: 'does not start with' },
      { id: 'ends_with', label: 'ends with' },
      { id: 'does_not_end_with', label: 'does not end with' },
      { id: 'matches', label: 'matches regex' },
      { id: 'does_not_match', label: 'does not match regex' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ],
    number: [
      { id: '=', label: '=' },
      { id: '!=', label: '≠' },
      { id: '>', label: '>' },
      { id: '<', label: '<' },
      { id: '>=', label: '≥' },
      { id: '<=', label: '≤' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ],
    date: [
      { id: 'is', label: 'is' },
      { id: 'is_not', label: 'is not' },
      { id: 'is_before', label: 'is before' },
      { id: 'is_after', label: 'is after' },
      { id: 'is_on_or_before', label: 'is on or before' },
      { id: 'is_on_or_after', label: 'is on or after' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ],
    checkbox: [
      { id: 'is_checked', label: 'is checked', noValue: true },
      { id: 'is_not_checked', label: 'is not checked', noValue: true },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ],
    list: [
      { id: 'contains', label: 'contains' },
      { id: 'does_not_contain', label: 'does not contain' },
      { id: 'contains_any', label: 'contains any of' },
      { id: 'contains_all', label: 'contains all of' },
      { id: 'does_not_contain_any', label: 'does not contain any of' },
      { id: 'does_not_contain_all', label: 'does not contain all of' },
      { id: 'has_tag', label: 'has tag' },
      { id: 'is', label: 'is' },
      { id: 'is_not', label: 'is not' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ],
    link: [
      { id: 'is', label: 'is' },
      { id: 'is_not', label: 'is not' },
      { id: 'contains', label: 'contains' },
      { id: 'does_not_contain', label: 'does not contain' },
      { id: 'starts_with', label: 'starts with' },
      { id: 'ends_with', label: 'ends with' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ]
  };

  // Helper to create Lucide SVG element referencing <defs>
  function createIconSvg(name, extraClass) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', extraClass ? 'b2h-icon ' + extraClass : 'b2h-icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#lucide-' + name);
    svg.appendChild(use);
    return svg;
  }

  // DOM Elements
  var htmlRoot = document.documentElement;
  var viewSelect = document.getElementById('viewSelect');
  var searchInput = document.getElementById('searchInput');
  var searchClearBtn = document.getElementById('searchClearBtn');

  // Popover Buttons & Elements
  var sortToggleBtn = document.getElementById('sortToggleBtn');
  var sortPopover = document.getElementById('sortPopover');
  var sortRulesList = document.getElementById('sortRulesList');
  var addSortBtn = document.getElementById('addSortBtn');
  var sortCountBadge = document.getElementById('sortCountBadge');

  var groupToggleBtn = document.getElementById('groupToggleBtn');
  var groupPopover = document.getElementById('groupPopover');
  var groupRulesList = document.getElementById('groupRulesList');
  var addGroupBtn = document.getElementById('addGroupBtn');

  var filterToggleBtn = document.getElementById('filterToggleBtn');
  var filterPopover = document.getElementById('filterPopover');
  var filterRulesList = document.getElementById('filterRulesList');
  var filterCountBadge = document.getElementById('filterCountBadge');

  var propertiesToggleBtn = document.getElementById('propertiesToggleBtn');
  var propertiesPopover = document.getElementById('propertiesPopover');
  var propertiesList = document.getElementById('propertiesList');

  var contentContainer = document.getElementById('contentContainer');
  var itemCountBadge = document.getElementById('itemCountBadge');

  // Settings Drawer Elements
  var settingsBtn = document.getElementById('settingsBtn');
  var settingsDrawer = document.getElementById('settingsDrawer');
  var drawerCloseBtn = document.getElementById('drawerCloseBtn');
  var modalOverlay = document.getElementById('modalOverlay');
  var themeLightBtn = document.getElementById('themeLightBtn');
  var themeDarkBtn = document.getElementById('themeDarkBtn');
  var widthFullBtn = document.getElementById('widthFullBtn');
  var widthNormalBtn = document.getElementById('widthNormalBtn');
  var widthNarrowBtn = document.getElementById('widthNarrowBtn');
  var fontSelect = document.getElementById('fontSelect');

  // Note Modal Elements
  var noteModal = document.getElementById('noteModal');
  var modalTitle = document.getElementById('modalTitle');
  var modalCloseBtn = document.getElementById('modalCloseBtn');
  var modalProperties = document.getElementById('modalProperties');
  var modalMarkdownContent = document.getElementById('modalMarkdownContent');

  // Initialize Global Preferences
  applyTheme(currentTheme);
  applyWidth(currentWidth);
  applyFont(currentFont);

  // Initialize View
  initView(currentViewIdx);

  // Setup Popovers toggling
  setupPopoverToggles();

  // Search input events
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchClearBtn) {
        if (searchQuery) searchClearBtn.classList.add('visible');
        else searchClearBtn.classList.remove('visible');
      }
      renderCards();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', function() {
      searchInput.value = '';
      searchQuery = '';
      searchClearBtn.classList.remove('visible');
      renderCards();
    });
  }

  if (viewSelect) {
    viewSelect.addEventListener('change', function(e) {
      currentViewIdx = Number(e.target.value);
      localStorage.setItem(storagePrefix + 'view_idx', String(currentViewIdx));
      initView(currentViewIdx);
    });
  }

  // Settings Handlers
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeSettings);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function() {
      closeSettings();
      closeNoteModal();
      closeAllPopovers();
    });
  }
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeNoteModal);

  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSettings();
      closeNoteModal();
      closeAllPopovers();
    }
  });

  if (themeLightBtn) themeLightBtn.addEventListener('click', function() { applyTheme('light'); });
  if (themeDarkBtn) themeDarkBtn.addEventListener('click', function() { applyTheme('dark'); });
  if (widthFullBtn) widthFullBtn.addEventListener('click', function() { applyWidth('full'); });
  if (widthNormalBtn) widthNormalBtn.addEventListener('click', function() { applyWidth('normal'); });
  if (widthNarrowBtn) widthNarrowBtn.addEventListener('click', function() { applyWidth('narrow'); });
  if (fontSelect) {
    fontSelect.addEventListener('change', function(e) { applyFont(e.target.value); });
  }

  // =========================================================================
  // Popover Handlers
  // =========================================================================

  function setupPopoverToggles() {
    var popoverPairs = [
      { btn: sortToggleBtn, popover: sortPopover },
      { btn: groupToggleBtn, popover: groupPopover },
      { btn: filterToggleBtn, popover: filterPopover },
      { btn: propertiesToggleBtn, popover: propertiesPopover }
    ];

    popoverPairs.forEach(function(pair) {
      if (!pair.btn || !pair.popover) return;
      pair.btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var wasOpen = pair.popover.classList.contains('open');
        closeAllPopovers();
        if (!wasOpen) {
          pair.popover.classList.add('open');
          pair.btn.classList.add('active');
        }
      });

      pair.popover.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    });

    document.addEventListener('click', function() {
      closeActivePillDropdown();
      closeAllPopovers();
    });

    if (addSortBtn) {
      addSortBtn.addEventListener('click', function() {
        var allProps = getAllAvailablePropertyKeys();
        var defaultProp = allProps[0] || 'file.name';
        activeSortRules.push({ property: defaultProp, direction: 'DESC' });
        saveSortState();
        renderSortPopover();
        renderCards();
      });
    }

    if (addGroupBtn) {
      addGroupBtn.addEventListener('click', function() {
        var allProps = getAllAvailablePropertyKeys();
        var defaultProp = allProps[0] || 'file.name';
        activeGroupRule = { property: defaultProp, direction: 'DESC' };
        saveGroupState();
        renderGroupPopover();
        renderCards();
      });
    }
  }

  function closeActivePillDropdown() {
    if (activePillDropdown && activePillDropdown.parentNode) {
      activePillDropdown.parentNode.removeChild(activePillDropdown);
    }
    activePillDropdown = null;
  }

  function closeAllPopovers() {
    closeActivePillDropdown();
    [sortPopover, groupPopover, filterPopover, propertiesPopover].forEach(function(pop) {
      if (pop) pop.classList.remove('open');
    });
    updateToolbarActiveStates();
  }

  function updateToolbarActiveStates() {
    if (sortToggleBtn) {
      var isSortOpen = sortPopover && sortPopover.classList.contains('open');
      var hasSorts = activeSortRules.length > 0;
      sortToggleBtn.classList.toggle('active', isSortOpen || hasSorts);
      if (sortCountBadge) {
        if (hasSorts) {
          sortCountBadge.textContent = String(activeSortRules.length);
          sortCountBadge.style.display = 'inline-block';
        } else {
          sortCountBadge.style.display = 'none';
        }
      }
    }

    if (groupToggleBtn) {
      var isGroupOpen = groupPopover && groupPopover.classList.contains('open');
      var hasGroup = Boolean(activeGroupRule && activeGroupRule.property);
      groupToggleBtn.classList.toggle('active', isGroupOpen || hasGroup);
    }

    if (filterToggleBtn) {
      var isFilterOpen = filterPopover && filterPopover.classList.contains('open');
      var filterCount = countFilterRules(globalFilterTree) + countFilterRules(viewFilterTree);
      var hasFilters = filterCount > 0;
      filterToggleBtn.classList.toggle('active', isFilterOpen || hasFilters);
      if (filterCountBadge) {
        if (hasFilters) {
          filterCountBadge.textContent = String(filterCount);
          filterCountBadge.style.display = 'inline-block';
        } else {
          filterCountBadge.style.display = 'none';
        }
      }
    }

    if (propertiesToggleBtn) {
      var isPropsOpen = propertiesPopover && propertiesPopover.classList.contains('open');
      propertiesToggleBtn.classList.toggle('active', isPropsOpen);
    }
  }

  // =========================================================================
  // View Initialization & LocalStorage
  // =========================================================================

  function initView(viewIdx) {
    var view = base.views[viewIdx];
    if (!view) return;

    currentViewIdx = viewIdx;
    if (viewSelect) viewSelect.value = String(viewIdx);

    // Update main container attributes for CSS targeting
    var mainEl = document.querySelector('main.main-content');
    if (mainEl && view) {
      mainEl.setAttribute('data-view-id', view.id || ('view-' + viewIdx));
      mainEl.setAttribute('data-view-name', view.name || ('View ' + (viewIdx + 1)));
      mainEl.setAttribute('data-view-type', view.type || 'cards');
    }

    var cardSize = view.cardSize || 180;
    var rawRatio = typeof view.imageAspectRatio === 'number' && view.imageAspectRatio > 0 ? view.imageAspectRatio : 1.5;
    var cssRatio = 1 / rawRatio;
    var imageFit = view.imageFit || 'cover';

    htmlRoot.style.setProperty('--card-size', cardSize + 'px');
    htmlRoot.style.setProperty('--aspect-ratio', String(rawRatio));
    htmlRoot.style.setProperty('--css-aspect-ratio', String(cssRatio));
    htmlRoot.style.setProperty('--image-fit', imageFit);

    var viewKey = view.id ? ('v_' + view.id) : ('view_' + viewIdx);

    // 1. Sort state
    var savedSorts = localStorage.getItem(storagePrefix + viewKey + '_sorts');
    if (savedSorts) {
      try { activeSortRules = JSON.parse(savedSorts) || []; } catch (e) { activeSortRules = []; }
    } else if (Array.isArray(view.sort) && view.sort.length > 0) {
      activeSortRules = view.sort.map(function(s) {
        return { property: s.property, direction: (s.direction || 'DESC').toUpperCase() };
      });
    } else {
      activeSortRules = [];
    }

    // 2. Group state
    var savedGroup = localStorage.getItem(storagePrefix + viewKey + '_group');
    if (savedGroup) {
      try { activeGroupRule = JSON.parse(savedGroup); } catch (e) { activeGroupRule = null; }
    } else if (view.groupBy && view.groupBy.property) {
      activeGroupRule = { property: view.groupBy.property, direction: (view.groupBy.direction || 'DESC').toUpperCase() };
    } else {
      activeGroupRule = null;
    }

    // 3. Filter state (All views + This view)
    var currentGlobalSig = JSON.stringify(base.filters || null);
    var savedGlobalSig = localStorage.getItem(storagePrefix + 'global_filters_sig');
    var savedGlobalFilters = localStorage.getItem(storagePrefix + 'global_filters');
    if (savedGlobalFilters && savedGlobalSig === currentGlobalSig) {
      try {
        var parsedGlobal = JSON.parse(savedGlobalFilters);
        globalFilterTree = (parsedGlobal && parsedGlobal.type === 'group' && Array.isArray(parsedGlobal.children))
          ? parsedGlobal
          : parseInitialSingleFilter(base.filters);
      } catch (e) {
        globalFilterTree = parseInitialSingleFilter(base.filters);
      }
    } else {
      globalFilterTree = parseInitialSingleFilter(base.filters);
      if (savedGlobalSig !== currentGlobalSig) {
        localStorage.removeItem(storagePrefix + 'global_filters');
        localStorage.setItem(storagePrefix + 'global_filters_sig', currentGlobalSig);
      }
    }

    var savedFilters = localStorage.getItem(storagePrefix + viewKey + '_filters');
    if (savedFilters) {
      try {
        var parsedSaved = JSON.parse(savedFilters);
        if (parsedSaved && parsedSaved.type === 'group' && Array.isArray(parsedSaved.children)) {
          viewFilterTree = parsedSaved;
        } else if (Array.isArray(parsedSaved)) {
          viewFilterTree = migrateFlatFilterRules(parsedSaved);
        } else {
          viewFilterTree = parseInitialSingleFilter(view.filters);
        }
      } catch (e) {
        viewFilterTree = parseInitialSingleFilter(view.filters);
      }
    } else {
      viewFilterTree = parseInitialSingleFilter(view.filters);
    }

    // 4. Properties order state
    var savedOrder = localStorage.getItem(storagePrefix + viewKey + '_order');
    if (savedOrder) {
      try { activeOrder = JSON.parse(savedOrder) || []; } catch (e) { activeOrder = []; }
    } else if (Array.isArray(view.order) && view.order.length > 0) {
      activeOrder = view.order.slice();
    } else if (view.type === 'table') {
      activeOrder = getAllAvailablePropertyKeys();
    } else {
      activeOrder = getAllAvailablePropertyKeys().slice(0, 4);
    }

    if (propertiesToggleBtn) {
      var propSpan = propertiesToggleBtn.querySelector('span');
      if (propSpan) {
        propSpan.textContent = 'Properties';
      }
    }
    var propPopoverHeader = document.querySelector('#propertiesPopover .popover-header');
    if (propPopoverHeader) {
      propPopoverHeader.textContent = 'Properties';
    }

    searchQuery = '';
    if (searchInput) searchInput.value = '';

    renderSortPopover();
    renderGroupPopover();
    renderFilterPopover();
    renderPropertiesPopover();
    renderCards();
    updateToolbarActiveStates();
  }

  function countFilterRules(node) {
    if (!node) return 0;
    if (node.type === 'rule' || node.type === 'expression') return 1;
    if (node.type === 'group' && Array.isArray(node.children)) {
      return node.children.reduce(function(sum, child) { return sum + countFilterRules(child); }, 0);
    }
    return 0;
  }

  function migrateFlatFilterRules(flatRules) {
    if (!Array.isArray(flatRules) || flatRules.length === 0) {
      return { type: 'group', conjunction: 'and', children: [] };
    }
    var hasOr = flatRules.some(function(r, i) { return i > 0 && r && r.conjunction === 'or'; });
    var hasAnd = flatRules.some(function(r, i) { return i > 0 && (!r || r.conjunction !== 'or'); });
    var conj = (hasOr && !hasAnd) ? 'or' : 'and';
    return {
      type: 'group',
      conjunction: conj,
      children: flatRules.map(function(r) {
        return {
          type: 'rule',
          property: normalizePropertyName(r.property || 'file.name'),
          operator: r.operator || 'is',
          value: r.value !== undefined ? r.value : ''
        };
      })
    };
  }

  function normalizePropertyName(raw) {
    if (!raw) return 'file.name';
    var clean = String(raw).trim();
    var bracketMatch = clean.match(/^(?:note)?\[(["'])(.*?)\1\]$/);
    if (bracketMatch && bracketMatch[2] !== undefined) {
      clean = bracketMatch[2];
    } else if (clean.indexOf('note.') === 0) {
      clean = clean.slice('note.'.length);
    }
    if (clean === 'file.tag') return 'file.tags';
    if (clean === 'name') return 'file.name';
    if (clean === 'folder') return 'file.folder';
    return clean;
  }

  function getOperatorsForProperty(propName, pType) {
    var list = (OPERATORS_BY_TYPE[pType] || OPERATORS_BY_TYPE.text).slice();
    if (propName === 'file.folder' || propName === 'file.path') {
      list.splice(2, 0,
        { id: 'in_folder', label: 'in folder' },
        { id: 'not_in_folder', label: 'not in folder' }
      );
    }
    return list;
  }

  function splitTopLevelCommasClient(str) {
    var result = [];
    var depth = 0;
    var inQuote = null;
    var current = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (inQuote) {
        current += ch;
        if (ch === inQuote && str[i - 1] !== '\\') inQuote = null;
      } else if (ch === '"' || ch === "'") {
        inQuote = ch;
        current += ch;
      } else if (ch === '(' || ch === '[' || ch === '{') {
        depth++;
        current += ch;
      } else if (ch === ')' || ch === ']' || ch === '}') {
        depth--;
        current += ch;
      } else if (ch === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim().length > 0) result.push(current.trim());
    return result;
  }

  function findTopLevelComparisonClient(expr) {
    var operators = ['==', '!=', '>=', '<=', '>', '<'];
    var depth = 0;
    var inQuote = null;
    for (var i = 0; i < expr.length; i++) {
      var ch = expr[i];
      if (inQuote) {
        if (ch === inQuote && expr[i - 1] !== '\\') inQuote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inQuote = ch;
        continue;
      }
      if (ch === '(' || ch === '[' || ch === '{') { depth++; continue; }
      if (ch === ')' || ch === ']' || ch === '}') { depth--; continue; }
      if (depth === 0) {
        for (var o = 0; o < operators.length; o++) {
          var op = operators[o];
          if (expr.slice(i, i + op.length) === op) {
            return {
              left: expr.slice(0, i).trim(),
              op: op,
              right: expr.slice(i + op.length).trim()
            };
          }
        }
      }
    }
    return null;
  }

  function parseLiteralValueClient(rawVal) {
    var s = String(rawVal || '').trim();
    var dateMatch = s.match(/^date\((["'])(.*?)\1\)$/);
    if (dateMatch) return dateMatch[2];
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null' || s === 'undefined') return '';
    if (s !== '' && !isNaN(Number(s))) return Number(s);
    return s;
  }

  function parseStringFilterExpression(rawExpr) {
    var original = String(rawExpr || '').trim();
    if (!original) return null;

    var str = original;
    var isNegated = false;
    while (str.startsWith('!') && !str.startsWith('!=')) {
      isNegated = !isNegated;
      str = str.slice(1).trim();
    }

    // Method call: target.method(args)
    var methodMatch = str.match(/^((?:note)?\[["'].*?["']\]|[\w.-]+)\.(\w+)\(([\s\S]*)\)$/);
    if (methodMatch) {
      var rawTarget = methodMatch[1];
      var methodName = methodMatch[2];
      var argsStr = methodMatch[3];
      var parsedArgs = argsStr.trim() ? splitTopLevelCommasClient(argsStr).map(parseLiteralValueClient) : [];
      var propName = normalizePropertyName(rawTarget);

      if (rawTarget === 'file' && methodName === 'hasTag') {
        var tags = parsedArgs.map(function(a) { return String(a).replace(/^#/, ''); });
        if (tags.length > 1) {
          return {
            type: 'rule',
            property: 'file.tags',
            operator: isNegated ? 'does_not_contain_any' : 'contains_any',
            value: tags.join(', ')
          };
        }
        return {
          type: 'rule',
          property: 'file.tags',
          operator: isNegated ? 'does_not_contain' : 'has_tag',
          value: tags[0] || ''
        };
      }

      if (rawTarget === 'file' && methodName === 'inFolder') {
        return {
          type: 'rule',
          property: 'file.folder',
          operator: isNegated ? 'not_in_folder' : 'in_folder',
          value: parsedArgs[0] !== undefined ? String(parsedArgs[0]) : ''
        };
      }

      if (rawTarget === 'file' && methodName === 'hasLink') {
        return {
          type: 'rule',
          property: 'file.links',
          operator: isNegated ? 'does_not_contain' : 'contains',
          value: parsedArgs[0] !== undefined ? String(parsedArgs[0]) : ''
        };
      }

      if (rawTarget === 'file' && methodName === 'hasProperty') {
        return {
          type: 'rule',
          property: normalizePropertyName(parsedArgs[0] || ''),
          operator: isNegated ? 'is_empty' : 'is_not_empty',
          value: ''
        };
      }

      if (methodName === 'isEmpty') {
        return {
          type: 'rule',
          property: propName,
          operator: isNegated ? 'is_not_empty' : 'is_empty',
          value: ''
        };
      }

      if (methodName === 'startsWith') {
        return {
          type: 'rule',
          property: propName,
          operator: isNegated ? 'does_not_start_with' : 'starts_with',
          value: parsedArgs[0] !== undefined ? String(parsedArgs[0]) : ''
        };
      }

      if (methodName === 'endsWith') {
        return {
          type: 'rule',
          property: propName,
          operator: isNegated ? 'does_not_end_with' : 'ends_with',
          value: parsedArgs[0] !== undefined ? String(parsedArgs[0]) : ''
        };
      }

      if (methodName === 'matches') {
        return {
          type: 'rule',
          property: propName,
          operator: isNegated ? 'does_not_match' : 'matches',
          value: parsedArgs[0] !== undefined ? String(parsedArgs[0]) : ''
        };
      }

      if (methodName === 'containsAny') {
        return {
          type: 'rule',
          property: propName,
          operator: isNegated ? 'does_not_contain_any' : 'contains_any',
          value: parsedArgs.join(', ')
        };
      }

      if (methodName === 'containsAll') {
        return {
          type: 'rule',
          property: propName,
          operator: isNegated ? 'does_not_contain_all' : 'contains_all',
          value: parsedArgs.join(', ')
        };
      }

      if (methodName === 'contains' || methodName === 'hasTag') {
        var valStr = parsedArgs[0] !== undefined ? String(parsedArgs[0]) : '';
        var isTag = propName === 'file.tags' || propName === 'tags' || propName.toLowerCase().indexOf('tag') !== -1;
        return {
          type: 'rule',
          property: propName,
          operator: isNegated ? 'does_not_contain' : (isTag && methodName === 'hasTag' ? 'has_tag' : 'contains'),
          value: isTag ? valStr.replace(/^#/, '') : valStr
        };
      }
    }

    // Binary comparison: left op right
    var comp = findTopLevelComparisonClient(str);
    if (comp) {
      var leftProp = normalizePropertyName(comp.left);
      // Only map as a simple rule if left side looks like a property identifier
      if (/^(?:(?:note)?\[["'].*?["']\]|[\w.-]+)$/.test(comp.left)) {
        var pType = getPropertyType(leftProp);
        var val = parseLiteralValueClient(comp.right);
        var op = comp.op;
        if (isNegated) {
          if (op === '==') op = '!=';
          else if (op === '!=') op = '==';
          else if (op === '>') op = '<=';
          else if (op === '<') op = '>=';
          else if (op === '>=') op = '<';
          else if (op === '<=') op = '>';
        }

        var mappedOp;
        if (pType === 'checkbox') {
          var boolVal = val === true || String(val).toLowerCase() === 'true';
          mappedOp = (op === '==' ? boolVal : !boolVal) ? 'is_checked' : 'is_not_checked';
          val = '';
        } else if (pType === 'number' || (typeof val === 'number' && pType !== 'date')) {
          mappedOp = op === '==' ? '=' : op;
        } else if (pType === 'date') {
          if (op === '==') mappedOp = 'is';
          else if (op === '!=') mappedOp = 'is_not';
          else if (op === '<') mappedOp = 'is_before';
          else if (op === '>') mappedOp = 'is_after';
          else if (op === '<=') mappedOp = 'is_on_or_before';
          else if (op === '>=') mappedOp = 'is_on_or_after';
          else mappedOp = 'is';
        } else {
          mappedOp = op === '==' ? 'is' : (op === '!=' ? 'is_not' : op);
        }

        return {
          type: 'rule',
          property: leftProp,
          operator: mappedOp,
          value: val
        };
      }
    }

    // Bare property truthiness: e.g. "done" or "!archived"
    if (/^(?:(?:note)?\[["'].*?["']\]|[\w.-]+)$/.test(str)) {
      var bareProp = normalizePropertyName(str);
      var bareType = getPropertyType(bareProp);
      return {
        type: 'rule',
        property: bareProp,
        operator: bareType === 'checkbox'
          ? (isNegated ? 'is_not_checked' : 'is_checked')
          : (isNegated ? 'is_empty' : 'is_not_empty'),
        value: ''
      };
    }

    // Fallback: preserve arbitrary expression so it is never silently dropped
    return {
      type: 'expression',
      expression: original
    };
  }

  function parseFilterNode(node) {
    if (!node) return null;
    if (typeof node === 'string') {
      return parseStringFilterExpression(node);
    }
    if (Array.isArray(node)) {
      var arrChildren = node.map(parseFilterNode).filter(Boolean);
      return { type: 'group', conjunction: 'and', children: arrChildren };
    }
    if (typeof node === 'object') {
      if (Array.isArray(node.and)) {
        return { type: 'group', conjunction: 'and', children: node.and.map(parseFilterNode).filter(Boolean) };
      }
      if (Array.isArray(node.or)) {
        return { type: 'group', conjunction: 'or', children: node.or.map(parseFilterNode).filter(Boolean) };
      }
      if (node.not !== undefined) {
        var notArr = Array.isArray(node.not) ? node.not : [node.not];
        return { type: 'group', conjunction: 'not', children: notArr.map(parseFilterNode).filter(Boolean) };
      }
    }
    return null;
  }

  function parseInitialSingleFilter(rawFilter) {
    var root = { type: 'group', conjunction: 'and', children: [] };
    if (!rawFilter) return root;
    var parsed = parseFilterNode(rawFilter);
    if (!parsed) return root;
    if (parsed.type === 'group') return parsed;
    root.children.push(parsed);
    return root;
  }

  function getViewStorageKey() {
    var view = base.views[currentViewIdx];
    return view && view.id ? ('v_' + view.id) : ('view_' + currentViewIdx);
  }

  function saveSortState() {
    localStorage.setItem(storagePrefix + getViewStorageKey() + '_sorts', JSON.stringify(activeSortRules));
    updateToolbarActiveStates();
  }

  function saveGroupState() {
    localStorage.setItem(storagePrefix + getViewStorageKey() + '_group', JSON.stringify(activeGroupRule));
    updateToolbarActiveStates();
  }

  function saveGlobalFilterState() {
    localStorage.setItem(storagePrefix + 'global_filters', JSON.stringify(globalFilterTree));
    localStorage.setItem(storagePrefix + 'global_filters_sig', JSON.stringify(base.filters || null));
    updateToolbarActiveStates();
  }

  function saveViewFilterState() {
    localStorage.setItem(storagePrefix + getViewStorageKey() + '_filters', JSON.stringify(viewFilterTree));
    updateToolbarActiveStates();
  }

  function saveOrderState() {
    localStorage.setItem(storagePrefix + getViewStorageKey() + '_order', JSON.stringify(activeOrder));
  }

  // =========================================================================
  // Property Helpers & Types
  // =========================================================================

  function getAllAvailablePropertyKeys() {
    var set = new Set();
    set.add('file.name');
    set.add('file.path');
    set.add('file.folder');
    set.add('file.ext');
    set.add('file.tags');
    set.add('file.links');
    set.add('tags');

    Object.keys(propertyTypes).forEach(function(k) {
      set.add(k);
    });

    items.forEach(function(it) {
      if (it.properties) {
        Object.keys(it.properties).forEach(function(k) { set.add(k); });
      }
      if (it.computedFormulas) {
        Object.keys(it.computedFormulas).forEach(function(k) { set.add('formula.' + k); });
      }
    });

    return Array.from(set);
  }

  function getPropertyMetadata(propName) {
    var clean = normalizePropertyName(propName);
    if (propertyTypes[clean]) return propertyTypes[clean];
    if (propertyTypes[propName]) return propertyTypes[propName];

    var type = 'text';
    var icon = 'type';

    if (clean === 'file' || clean === 'file.name' || clean === 'file.path' || clean === 'file.ext') {
      type = 'text';
      icon = 'file-text';
    } else if (clean === 'file.folder') {
      type = 'text';
      icon = 'folder';
    } else if (clean === 'file.ctime' || clean === 'file.mtime') {
      type = 'date';
      icon = 'calendar';
    } else if (clean === 'file.size') {
      type = 'number';
      icon = 'hash';
    } else if (clean === 'file.links') {
      type = 'list';
      icon = 'link';
    } else if (clean === 'tags' || clean === 'file.tags') {
      type = 'list';
      icon = 'tag';
    } else if (clean.startsWith('formula.')) {
      type = 'text';
      icon = 'calculator';
    } else {
      // Infer from actual item values instead of hardcoded property names
      for (var i = 0; i < items.length; i++) {
        var v = getItemValue(items[i], clean);
        if (v !== undefined && v !== null && v !== '') {
          if (typeof v === 'boolean') { type = 'checkbox'; icon = 'check-square'; }
          else if (typeof v === 'number') { type = 'number'; icon = 'hash'; }
          else if (Array.isArray(v)) { type = 'list'; icon = 'list'; }
          else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) { type = 'date'; icon = 'calendar'; }
          else if (typeof v === 'string' && v.trim().startsWith('[[') && v.trim().endsWith(']]')) { type = 'link'; icon = 'link'; }
          break;
        }
      }
    }

    return { id: clean, name: clean, type: type, icon: icon };
  }

  function getPropertyType(propName) {
    return getPropertyMetadata(propName).type;
  }

  function getDirectionLabels(propName) {
    var type = getPropertyType(propName);
    if (type === 'number') {
      return { asc: '0 → 1', desc: '1 → 0' };
    }
    if (type === 'date') {
      return { asc: 'Oldest → Newest', desc: 'Newest → Oldest' };
    }
    return { asc: 'A → Z', desc: 'Z → A' };
  }

  function getItemValue(item, propPath) {
    if (!propPath) return undefined;
    var clean = normalizePropertyName(propPath);
    if (clean === 'file.name' || clean === 'name' || clean === 'file') return item.title;
    if (clean === 'file.path') return item.path;
    if (clean === 'file.folder' || clean === 'folder') return item.folder;
    if (clean === 'file.ext') return item.ext || 'md';
    if (clean === 'file.ctime') return item.ctime;
    if (clean === 'file.mtime') return item.mtime;
    if (clean === 'file.size') return item.size;
    if (clean === 'file.links') return item.links || [];
    if (clean === 'file.tags' || clean === 'file.tag') {
      if (item.tags && Array.isArray(item.tags)) return item.tags;
      if (item.properties && item.properties.tags) {
        return Array.isArray(item.properties.tags) ? item.properties.tags : [item.properties.tags];
      }
      return [];
    }
    if (clean === 'tags') {
      if (item.properties) {
        var fmTags = item.properties.tags !== undefined ? item.properties.tags : item.properties.tag;
        if (fmTags !== undefined && fmTags !== null) {
          if (Array.isArray(fmTags)) return fmTags;
          if (typeof fmTags === 'string') {
            return fmTags.split(/[\s,]+/).map(function(t) { return t.replace(/^#/, '').trim(); }).filter(Boolean);
          }
          return [String(fmTags).replace(/^#/, '').trim()].filter(Boolean);
        }
      }
      return [];
    }
    if (clean.startsWith('formula.')) {
      var fName = clean.slice('formula.'.length);
      return item.computedFormulas ? item.computedFormulas[fName] : undefined;
    }
    if (clean.startsWith('note.')) {
      var p = clean.slice('note.'.length);
      return item.properties ? item.properties[p] : undefined;
    }
    if (item.properties && clean in item.properties) {
      return item.properties[clean];
    }
    if (item.computedFormulas && clean in item.computedFormulas) {
      return item.computedFormulas[clean];
    }
    return undefined;
  }

  // =========================================================================
  // Popover Renders (Sort, Group, Filter, Properties)
  // =========================================================================

  function renderSortPopover() {
    if (!sortRulesList) return;
    sortRulesList.innerHTML = '';

    var allProps = getAllAvailablePropertyKeys();

    activeSortRules.forEach(function(rule, idx) {
      var row = document.createElement('div');
      row.className = 'popover-rule-row';
      row.setAttribute('draggable', 'true');

      // Drag Handle with Lucide grip icon
      var dragHandle = document.createElement('span');
      dragHandle.className = 'drag-handle';
      dragHandle.title = 'Drag to reorder';
      dragHandle.appendChild(createIconSvg('grip-vertical', 'b2h-icon-drag'));
      row.appendChild(dragHandle);

      // Pill container
      var pill = document.createElement('div');
      pill.className = 'popover-rule-pill';

      // Property Icon
      var meta = getPropertyMetadata(rule.property);
      var propIconSpan = document.createElement('span');
      propIconSpan.className = 'pill-icon';
      propIconSpan.appendChild(createIconSvg(meta.icon || 'type', 'b2h-icon-xs'));
      pill.appendChild(propIconSpan);

      // Property Select
      var propSelect = document.createElement('select');
      propSelect.className = 'pill-select';
      allProps.forEach(function(p) {
        var m = getPropertyMetadata(p);
        var opt = document.createElement('option');
        opt.value = p;
        opt.textContent = m.name;
        if (p === rule.property) opt.selected = true;
        propSelect.appendChild(opt);
      });

      propSelect.addEventListener('change', function(e) {
        rule.property = e.target.value;
        saveSortState();
        renderSortPopover();
        renderCards();
      });
      pill.appendChild(propSelect);

      var divider = document.createElement('span');
      divider.className = 'pill-divider';
      pill.appendChild(divider);

      // Direction Select
      var dirSelect = document.createElement('select');
      dirSelect.className = 'pill-select';
      var dirLabels = getDirectionLabels(rule.property);

      var optDesc = document.createElement('option');
      optDesc.value = 'DESC';
      optDesc.textContent = dirLabels.desc + ' ↕';
      if (rule.direction === 'DESC') optDesc.selected = true;
      dirSelect.appendChild(optDesc);

      var optAsc = document.createElement('option');
      optAsc.value = 'ASC';
      optAsc.textContent = dirLabels.asc + ' ↕';
      if (rule.direction === 'ASC') optAsc.selected = true;
      dirSelect.appendChild(optAsc);

      dirSelect.addEventListener('change', function(e) {
        rule.direction = e.target.value;
        saveSortState();
        renderCards();
      });
      pill.appendChild(dirSelect);

      row.appendChild(pill);

      // Delete Button with Lucide trash icon
      var delBtn = document.createElement('button');
      delBtn.className = 'popover-rule-delete';
      delBtn.title = 'Remove sort rule';
      delBtn.appendChild(createIconSvg('trash', 'b2h-icon-sm'));
      delBtn.addEventListener('click', function() {
        activeSortRules.splice(idx, 1);
        saveSortState();
        renderSortPopover();
        renderCards();
      });
      row.appendChild(delBtn);

      // Drag and Drop
      setupDragDrop(row, idx, activeSortRules, function() {
        saveSortState();
        renderSortPopover();
        renderCards();
      });

      sortRulesList.appendChild(row);
    });

    updateToolbarActiveStates();
  }

  function renderGroupPopover() {
    if (!groupRulesList) return;
    groupRulesList.innerHTML = '';

    if (!activeGroupRule || !activeGroupRule.property) {
      var emptyMsg = document.createElement('p');
      emptyMsg.style.fontSize = '0.85rem';
      emptyMsg.style.color = 'var(--text-muted)';
      emptyMsg.style.margin = '0.25rem 0';
      emptyMsg.textContent = 'No active grouping.';
      groupRulesList.appendChild(emptyMsg);
      if (addGroupBtn) addGroupBtn.style.display = 'inline-flex';
      updateToolbarActiveStates();
      return;
    }

    if (addGroupBtn) addGroupBtn.style.display = 'none';

    var allProps = getAllAvailablePropertyKeys();
    var row = document.createElement('div');
    row.className = 'popover-rule-row';

    var pill = document.createElement('div');
    pill.className = 'popover-rule-pill';

    // Property Icon
    var meta = getPropertyMetadata(activeGroupRule.property);
    var propIconSpan = document.createElement('span');
    propIconSpan.className = 'pill-icon';
    propIconSpan.appendChild(createIconSvg(meta.icon || 'type', 'b2h-icon-xs'));
    pill.appendChild(propIconSpan);

    // Property Select
    var propSelect = document.createElement('select');
    propSelect.className = 'pill-select';
    allProps.forEach(function(p) {
      var m = getPropertyMetadata(p);
      var opt = document.createElement('option');
      opt.value = p;
      opt.textContent = m.name;
      if (p === activeGroupRule.property) opt.selected = true;
      propSelect.appendChild(opt);
    });

    propSelect.addEventListener('change', function(e) {
      activeGroupRule.property = e.target.value;
      saveGroupState();
      renderGroupPopover();
      renderCards();
    });
    pill.appendChild(propSelect);

    var divider = document.createElement('span');
    divider.className = 'pill-divider';
    pill.appendChild(divider);

    // Direction Select
    var dirSelect = document.createElement('select');
    dirSelect.className = 'pill-select';
    var dirLabels = getDirectionLabels(activeGroupRule.property);

    var optDesc = document.createElement('option');
    optDesc.value = 'DESC';
    optDesc.textContent = dirLabels.desc + ' ↕';
    if (activeGroupRule.direction === 'DESC') optDesc.selected = true;
    dirSelect.appendChild(optDesc);

    var optAsc = document.createElement('option');
    optAsc.value = 'ASC';
    optAsc.textContent = dirLabels.asc + ' ↕';
    if (activeGroupRule.direction === 'ASC') optAsc.selected = true;
    dirSelect.appendChild(optAsc);

    dirSelect.addEventListener('change', function(e) {
      activeGroupRule.direction = e.target.value;
      saveGroupState();
      renderCards();
    });
    pill.appendChild(dirSelect);

    row.appendChild(pill);

    // Delete Button (Remove grouping) with Lucide trash icon
    var delBtn = document.createElement('button');
    delBtn.className = 'popover-rule-delete';
    delBtn.title = 'Remove grouping';
    delBtn.appendChild(createIconSvg('trash', 'b2h-icon-sm'));
    delBtn.addEventListener('click', function() {
      activeGroupRule = null;
      saveGroupState();
      renderGroupPopover();
      renderCards();
    });
    row.appendChild(delBtn);

    groupRulesList.appendChild(row);
    updateToolbarActiveStates();
  }

  function normalizeOperatorAlias(op, pType) {
    if (pType === 'number') {
      if (op === 'is') return '=';
      if (op === 'is_not') return '!=';
    } else {
      if (op === '=') return 'is';
      if (op === '!=') return 'is_not';
    }
    return op;
  }

  function createSearchablePillSelect(opts) {
    var wrapper = document.createElement('div');
    wrapper.className = 'pill-select-wrapper';

    var currentOpt = null;
    for (var i = 0; i < opts.options.length; i++) {
      if (opts.options[i].value === opts.value) {
        currentOpt = opts.options[i];
        break;
      }
    }

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pill-select pill-select-trigger';
    trigger.setAttribute('data-value', opts.value || '');

    var labelSpan = document.createElement('span');
    labelSpan.textContent = currentOpt ? currentOpt.label : (opts.value || '');
    trigger.appendChild(labelSpan);

    var chevronSpan = document.createElement('span');
    chevronSpan.className = 'pill-select-chevron';
    chevronSpan.textContent = '↕';
    trigger.appendChild(chevronSpan);

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      var wasSame = activePillDropdown && activePillDropdown._trigger === trigger;
      closeActivePillDropdown();
      if (wasSame) return;

      var menu = document.createElement('div');
      menu.className = 'pill-dropdown-menu';
      menu._trigger = trigger;
      menu.addEventListener('click', function(ev) { ev.stopPropagation(); });

      // Search input at top of dropdown
      var searchWrap = document.createElement('div');
      searchWrap.className = 'pill-dropdown-search-wrap';
      searchWrap.appendChild(createIconSvg('search', 'b2h-icon-xs'));

      var searchBox = document.createElement('input');
      searchBox.type = 'text';
      searchBox.className = 'pill-dropdown-search';
      searchBox.placeholder = 'Search...';
      searchWrap.appendChild(searchBox);
      menu.appendChild(searchWrap);

      var listEl = document.createElement('div');
      listEl.className = 'pill-dropdown-options';
      menu.appendChild(listEl);

      function renderOptions(filterText) {
        listEl.innerHTML = '';
        var q = String(filterText || '').trim().toLowerCase();
        var filtered = opts.options.filter(function(o) {
          return !q || o.label.toLowerCase().indexOf(q) !== -1 || String(o.value).toLowerCase().indexOf(q) !== -1;
        });

        if (filtered.length === 0) {
          var emptyEl = document.createElement('div');
          emptyEl.className = 'pill-dropdown-empty';
          emptyEl.textContent = 'No matches';
          listEl.appendChild(emptyEl);
          return;
        }

        filtered.forEach(function(o) {
          var itemBtn = document.createElement('button');
          itemBtn.type = 'button';
          itemBtn.className = 'pill-dropdown-option' + (o.value === opts.value ? ' selected' : '');
          if (o.icon) {
            itemBtn.appendChild(createIconSvg(o.icon, 'b2h-icon-xs'));
          }
          var txt = document.createElement('span');
          txt.textContent = o.label;
          itemBtn.appendChild(txt);
          itemBtn.addEventListener('click', function(ev) {
            ev.stopPropagation();
            closeActivePillDropdown();
            opts.onChange(o.value);
          });
          listEl.appendChild(itemBtn);
        });
      }

      searchBox.addEventListener('input', function(ev) {
        renderOptions(ev.target.value);
      });
      searchBox.addEventListener('keydown', function(ev) {
        if (ev.key === 'Escape') {
          closeActivePillDropdown();
        } else if (ev.key === 'Enter') {
          var firstOpt = listEl.querySelector('.pill-dropdown-option');
          if (firstOpt) firstOpt.click();
        }
      });

      renderOptions('');

      if (typeof trigger.getBoundingClientRect === 'function') {
        var rect = trigger.getBoundingClientRect();
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.left = rect.left + 'px';
      }

      if (document.body && document.body.appendChild) {
        document.body.appendChild(menu);
      } else {
        wrapper.appendChild(menu);
      }
      activePillDropdown = menu;
      if (typeof searchBox.focus === 'function') searchBox.focus();
    });

    wrapper.appendChild(trigger);
    return {
      el: wrapper,
      value: opts.value,
      trigger: trigger
    };
  }

  function renderFilterPopover() {
    if (!filterRulesList) return;
    filterRulesList.innerHTML = '';

    if (!globalFilterTree || globalFilterTree.type !== 'group') {
      globalFilterTree = { type: 'group', conjunction: 'and', children: [] };
    }
    if (!viewFilterTree || viewFilterTree.type !== 'group') {
      viewFilterTree = { type: 'group', conjunction: 'and', children: [] };
    }

    var allProps = getAllAvailablePropertyKeys();

    // Section 1: All views (global Base filters)
    var globalSection = document.createElement('div');
    globalSection.className = 'filter-scope-section';
    globalSection.setAttribute('data-scope', 'all-views');
    var globalHeader = document.createElement('div');
    globalHeader.className = 'filter-scope-header';
    globalHeader.textContent = 'All views';
    globalSection.appendChild(globalHeader);
    renderFilterGroupNode(globalFilterTree, globalSection, true, null, -1, allProps, saveGlobalFilterState);
    filterRulesList.appendChild(globalSection);

    // Section 2: This view (view-specific filters)
    var viewSection = document.createElement('div');
    viewSection.className = 'filter-scope-section';
    viewSection.setAttribute('data-scope', 'this-view');
    var viewHeader = document.createElement('div');
    viewHeader.className = 'filter-scope-header';
    viewHeader.textContent = 'This view';
    viewSection.appendChild(viewHeader);
    renderFilterGroupNode(viewFilterTree, viewSection, true, null, -1, allProps, saveViewFilterState);
    filterRulesList.appendChild(viewSection);

    updateToolbarActiveStates();
  }

  function renderFilterGroupNode(groupNode, container, isRoot, parentGroup, indexInParent, allProps, onSave) {
    var box = document.createElement('div');
    box.className = isRoot ? 'filter-group-box' : 'filter-group-box filter-group-nested';

    // Group conjunction header (All / Any / None)
    var header = document.createElement('div');
    header.className = 'filter-group-header';

    var conjSelect = document.createElement('select');
    conjSelect.className = 'filter-group-conjunction-select';
    [
      { id: 'and', label: 'All the following are true' },
      { id: 'or', label: 'Any of the following are true' },
      { id: 'not', label: 'None of the following are true' }
    ].forEach(function(optDef) {
      var opt = document.createElement('option');
      opt.value = optDef.id;
      opt.textContent = optDef.label;
      if ((groupNode.conjunction || 'and') === optDef.id) opt.selected = true;
      conjSelect.appendChild(opt);
    });
    conjSelect.addEventListener('change', function(e) {
      groupNode.conjunction = e.target.value;
      onSave();
      renderFilterPopover();
      renderCards();
    });
    header.appendChild(conjSelect);

    if (!isRoot && parentGroup) {
      var delGroupBtn = document.createElement('button');
      delGroupBtn.className = 'popover-rule-delete';
      delGroupBtn.title = 'Remove filter group';
      delGroupBtn.appendChild(createIconSvg('trash', 'b2h-icon-sm'));
      delGroupBtn.addEventListener('click', function() {
        parentGroup.children.splice(indexInParent, 1);
        onSave();
        renderFilterPopover();
        renderCards();
      });
      header.appendChild(delGroupBtn);
    }

    box.appendChild(header);

    var childrenContainer = document.createElement('div');
    childrenContainer.className = 'filter-group-children';

    (groupNode.children || []).forEach(function(child, idx) {
      if (child.type === 'group') {
        renderFilterGroupNode(child, childrenContainer, false, groupNode, idx, allProps, onSave);
        return;
      }

      var row = document.createElement('div');
      row.className = 'popover-rule-row';
      row.setAttribute('draggable', 'true');

      // Prefix (where for row 0, group conjunction for row > 0)
      if (idx === 0) {
        var whereLabel = document.createElement('span');
        whereLabel.className = 'filter-conjunction-btn';
        whereLabel.textContent = groupNode.conjunction === 'not' ? 'not' : 'where';
        whereLabel.style.cursor = 'default';
        row.appendChild(whereLabel);
      } else {
        var conjBtn = document.createElement('button');
        conjBtn.className = 'filter-conjunction-btn';
        conjBtn.textContent = groupNode.conjunction || 'and';
        conjBtn.title = 'Toggle AND / OR';
        conjBtn.addEventListener('click', function() {
          groupNode.conjunction = (groupNode.conjunction === 'or') ? 'and' : 'or';
          onSave();
          renderFilterPopover();
          renderCards();
        });
        row.appendChild(conjBtn);
      }

      if (child.type === 'expression') {
        var exprPill = document.createElement('div');
        exprPill.className = 'popover-rule-pill filter-expression-pill';
        exprPill.textContent = child.expression || '';
        row.appendChild(exprPill);

        var delExprBtn = document.createElement('button');
        delExprBtn.className = 'popover-rule-delete';
        delExprBtn.title = 'Remove filter';
        delExprBtn.appendChild(createIconSvg('trash', 'b2h-icon-sm'));
        delExprBtn.addEventListener('click', function() {
          groupNode.children.splice(idx, 1);
          onSave();
          renderFilterPopover();
          renderCards();
        });
        row.appendChild(delExprBtn);

        childrenContainer.appendChild(row);
        return;
      }

      var rule = child;
      rule.property = normalizePropertyName(rule.property);

      // Pill container
      var pill = document.createElement('div');
      pill.className = 'popover-rule-pill';

      // Property Icon
      var meta = getPropertyMetadata(rule.property);
      var propIconSpan = document.createElement('span');
      propIconSpan.className = 'pill-icon';
      propIconSpan.appendChild(createIconSvg(meta.icon || 'type', 'b2h-icon-xs'));
      pill.appendChild(propIconSpan);

      // 1. Property Select (Searchable)
      var propOptions = allProps.slice();
      if (rule.property && propOptions.indexOf(rule.property) === -1) {
        propOptions.push(rule.property);
      }
      var propSelectCtrl = createSearchablePillSelect({
        value: rule.property,
        options: propOptions.map(function(p) {
          var m = getPropertyMetadata(p);
          return { value: p, label: m.name, icon: m.icon || 'type' };
        }),
        onChange: function(newProp) {
          rule.property = newProp;
          var pTypeNew = getPropertyType(rule.property);
          var opListNew = getOperatorsForProperty(rule.property, pTypeNew);
          rule.operator = normalizeOperatorAlias(rule.operator, pTypeNew);
          var stillValid = opListNew.some(function(o) { return o.id === rule.operator; });
          if (!stillValid && opListNew[0]) {
            rule.operator = opListNew[0].id;
          }
          onSave();
          renderFilterPopover();
          renderCards();
        }
      });
      pill.appendChild(propSelectCtrl.el);

      var divider1 = document.createElement('span');
      divider1.className = 'pill-divider';
      pill.appendChild(divider1);

      // 2. Operator Select (Searchable)
      var pType = getPropertyType(rule.property);
      var opList = getOperatorsForProperty(rule.property, pType);
      rule.operator = normalizeOperatorAlias(rule.operator, pType);

      var currentOpDef = null;
      opList.forEach(function(opDef) {
        if (opDef.id === rule.operator) currentOpDef = opDef;
      });
      if (!currentOpDef && rule.operator) {
        currentOpDef = { id: rule.operator, label: rule.operator };
        opList = opList.concat([currentOpDef]);
      } else if (!currentOpDef && opList[0]) {
        currentOpDef = opList[0];
        rule.operator = currentOpDef.id;
      }

      var opSelectCtrl = createSearchablePillSelect({
        value: rule.operator,
        options: opList.map(function(o) { return { value: o.id, label: o.label }; }),
        onChange: function(newOp) {
          rule.operator = newOp;
          onSave();
          renderFilterPopover();
          renderCards();
        }
      });
      pill.appendChild(opSelectCtrl.el);

      // 3. Value Input (if operator requires value)
      if (currentOpDef && !currentOpDef.noValue) {
        var divider2 = document.createElement('span');
        divider2.className = 'pill-divider';
        pill.appendChild(divider2);

        var valInput = document.createElement('input');
        valInput.className = 'pill-input';

        if (pType === 'number') {
          valInput.type = 'number';
          valInput.value = (rule.value !== undefined && rule.value !== null) ? String(rule.value) : '';
        } else if (pType === 'date') {
          valInput.type = 'date';
          valInput.value = rule.value || '';
        } else {
          valInput.type = 'text';
          valInput.placeholder = 'Value...';
          valInput.value = (rule.value !== undefined && rule.value !== null) ? String(rule.value) : '';
        }

        valInput.addEventListener('input', function(e) {
          rule.value = pType === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
          onSave();
          renderCards();
        });
        pill.appendChild(valInput);
      }

      row.appendChild(pill);

      // Delete Button with Lucide trash icon
      var delBtn = document.createElement('button');
      delBtn.className = 'popover-rule-delete';
      delBtn.title = 'Remove filter';
      delBtn.appendChild(createIconSvg('trash', 'b2h-icon-sm'));
      delBtn.addEventListener('click', function() {
        groupNode.children.splice(idx, 1);
        onSave();
        renderFilterPopover();
        renderCards();
      });
      row.appendChild(delBtn);

      setupDragDrop(row, idx, groupNode.children, function() {
        onSave();
        renderFilterPopover();
        renderCards();
      });

      childrenContainer.appendChild(row);
    });

    box.appendChild(childrenContainer);

    var groupActions = document.createElement('div');
    groupActions.className = 'popover-add-actions';

    var addRuleBtn = document.createElement('button');
    addRuleBtn.className = 'popover-add-btn';
    addRuleBtn.appendChild(createIconSvg('plus', 'b2h-icon-xs'));
    addRuleBtn.appendChild(document.createTextNode(' Add filter'));
    addRuleBtn.addEventListener('click', function() {
      var defaultProp = allProps[0] || 'file.name';
      var pTypeDef = getPropertyType(defaultProp);
      var opListDef = getOperatorsForProperty(defaultProp, pTypeDef);
      groupNode.children.push({
        type: 'rule',
        property: defaultProp,
        operator: opListDef[0] ? opListDef[0].id : 'is',
        value: ''
      });
      onSave();
      renderFilterPopover();
      renderCards();
    });
    groupActions.appendChild(addRuleBtn);

    var addGroupNestedBtn = document.createElement('button');
    addGroupNestedBtn.className = 'popover-add-btn';
    addGroupNestedBtn.appendChild(createIconSvg('plus', 'b2h-icon-xs'));
    addGroupNestedBtn.appendChild(document.createTextNode(' Add filter group'));
    addGroupNestedBtn.addEventListener('click', function() {
      var defaultProp = allProps[0] || 'file.name';
      var pTypeDef = getPropertyType(defaultProp);
      var opListDef = getOperatorsForProperty(defaultProp, pTypeDef);
      groupNode.children.push({
        type: 'group',
        conjunction: 'and',
        children: [
          {
            type: 'rule',
            property: defaultProp,
            operator: opListDef[0] ? opListDef[0].id : 'is',
            value: ''
          }
        ]
      });
      onSave();
      renderFilterPopover();
      renderCards();
    });
    groupActions.appendChild(addGroupNestedBtn);

    box.appendChild(groupActions);

    container.appendChild(box);
  }

  function renderPropertiesPopover() {
    if (!propertiesList) return;
    propertiesList.innerHTML = '';

    var allProps = getAllAvailablePropertyKeys();

    allProps.forEach(function(prop) {
      var meta = getPropertyMetadata(prop);
      var isVisible = activeOrder.includes(prop);

      var row = document.createElement('div');
      row.className = 'property-visibility-row';

      var left = document.createElement('div');
      left.className = 'property-visibility-left';

      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'property-visibility-toggle';
      chk.checked = isVisible;
      chk.addEventListener('change', function() {
        if (chk.checked) {
          if (!activeOrder.includes(prop)) activeOrder.push(prop);
        } else {
          activeOrder = activeOrder.filter(function(p) { return p !== prop; });
        }
        saveOrderState();
        renderCards();
      });

      var label = document.createElement('span');
      label.textContent = meta.name;

      left.appendChild(chk);
      left.appendChild(createIconSvg(meta.icon || 'type', 'b2h-icon-xs'));
      left.appendChild(label);
      row.appendChild(left);

      propertiesList.appendChild(row);
    });
  }

  // Generic Drag & Drop setup
  var draggedRowIdx = null;

  function setupDragDrop(rowEl, index, arrayRef, onReorder) {
    rowEl.addEventListener('dragstart', function(e) {
      draggedRowIdx = index;
      rowEl.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      }
    });

    rowEl.addEventListener('dragend', function() {
      rowEl.classList.remove('dragging');
      draggedRowIdx = null;
    });

    rowEl.addEventListener('dragover', function(e) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });

    rowEl.addEventListener('drop', function(e) {
      e.preventDefault();
      if (draggedRowIdx === null || draggedRowIdx === index) return;
      var movedItem = arrayRef.splice(draggedRowIdx, 1)[0];
      if (movedItem) {
        arrayRef.splice(index, 0, movedItem);
        onReorder();
      }
    });
  }

  // =========================================================================
  // Filtering & Sorting Evaluators
  // =========================================================================

  function passesFilterRules(item) {
    return evaluateFilterNode(item, globalFilterTree) && evaluateFilterNode(item, viewFilterTree);
  }

  function evaluateFilterNode(item, node) {
    if (!node) return true;
    if (node.type === 'group') {
      var children = node.children || [];
      if (children.length === 0) return true;
      var conj = node.conjunction || 'and';
      if (conj === 'or') {
        return children.some(function(child) { return evaluateFilterNode(item, child); });
      }
      if (conj === 'not') {
        return !children.some(function(child) { return evaluateFilterNode(item, child); });
      }
      return children.every(function(child) { return evaluateFilterNode(item, child); });
    }
    if (node.type === 'expression') {
      return evaluateClientExpression(item, node.expression);
    }
    return evaluateSingleFilterRule(item, node);
  }

  function evaluateClientExpression(item, rawExpr) {
    var expr = String(rawExpr || '').trim();
    if (!expr) return true;
    while (expr.startsWith('(') && expr.endsWith(')')) {
      expr = expr.slice(1, -1).trim();
    }
    var orParts = expr.split('||');
    if (orParts.length > 1) {
      return orParts.some(function(p) { return evaluateClientExpression(item, p); });
    }
    var andParts = expr.split('&&');
    if (andParts.length > 1) {
      return andParts.every(function(p) { return evaluateClientExpression(item, p); });
    }
    var parsed = parseStringFilterExpression(expr);
    if (parsed && parsed.type === 'rule') {
      return evaluateSingleFilterRule(item, parsed);
    }
    return true;
  }

  function evaluateSingleFilterRule(item, rule) {
    var rawVal = getItemValue(item, rule.property);
    var pType = getPropertyType(rule.property);
    var op = rule.operator;
    var target = rule.value;

    if (op === 'is_empty') {
      if (rawVal === undefined || rawVal === null || rawVal === '') return true;
      if (Array.isArray(rawVal) && rawVal.length === 0) return true;
      return false;
    }
    if (op === 'is_not_empty') {
      if (rawVal === undefined || rawVal === null || rawVal === '') return false;
      if (Array.isArray(rawVal) && rawVal.length === 0) return false;
      return true;
    }

    if (op === 'is_checked') {
      return rawVal === true || String(rawVal).toLowerCase() === 'true';
    }
    if (op === 'is_not_checked') {
      return !(rawVal === true || String(rawVal).toLowerCase() === 'true');
    }

    if (op === 'in_folder' || op === 'not_in_folder') {
      var folderTarget = String(target != null ? target : '').replace(/^\/+|\/+$/g, '').toLowerCase();
      var itemFolder = String(rawVal != null ? rawVal : '').replace(/^\/+|\/+$/g, '').toLowerCase();
      var inFolder = folderTarget === '' ? itemFolder === '' : (itemFolder === folderTarget || itemFolder.indexOf(folderTarget + '/') === 0);
      return op === 'in_folder' ? inFolder : !inFolder;
    }

    if (pType === 'number' || (typeof target === 'number' && (op === '=' || op === '!=' || op === '>' || op === '<' || op === '>=' || op === '<='))) {
      var numVal = Number(rawVal);
      var numTarget = Number(target);
      if (rawVal === undefined || rawVal === null || rawVal === '' || isNaN(numVal) || isNaN(numTarget)) {
        return op === '!=' ? true : false;
      }

      if (op === '=' || op === 'is') return numVal === numTarget;
      if (op === '!=' || op === 'is_not') return numVal !== numTarget;
      if (op === '>') return numVal > numTarget;
      if (op === '<') return numVal < numTarget;
      if (op === '>=') return numVal >= numTarget;
      if (op === '<=') return numVal <= numTarget;
      return true;
    }

    if (pType === 'date') {
      var resolveDateStr = function(v) {
        if (v === 'today()') return new Date().toISOString().slice(0, 10);
        if (v === 'now()') return new Date().toISOString();
        return v;
      };
      var rv = resolveDateStr(rawVal);
      var tv = resolveDateStr(target);
      var dateVal = rv ? new Date(String(rv)).getTime() : NaN;
      var dateTarget = tv ? new Date(String(tv)).getTime() : NaN;
      if (isNaN(dateVal) || isNaN(dateTarget)) {
        return op === 'is_not' ? true : false;
      }

      var d1 = new Date(dateVal).toISOString().slice(0, 10);
      var d2 = new Date(dateTarget).toISOString().slice(0, 10);
      if (op === 'is' || op === '=') return d1 === d2;
      if (op === 'is_not' || op === '!=') return d1 !== d2;
      if (op === 'is_before' || op === '<') return dateVal < dateTarget;
      if (op === 'is_after' || op === '>') return dateVal > dateTarget;
      if (op === 'is_on_or_before' || op === '<=') return dateVal <= dateTarget;
      if (op === 'is_on_or_after' || op === '>=') return dateVal >= dateTarget;
      return true;
    }

    if (pType === 'list' || Array.isArray(rawVal)) {
      var isTagProp = rule.property === 'file.tags' || rule.property === 'tags' || rule.property.toLowerCase().indexOf('tag') !== -1;
      var rawTargetStr = String(target != null ? target : '').toLowerCase();
      var searchStr = isTagProp ? rawTargetStr.replace(/^#/, '') : rawTargetStr;

      var rawList = Array.isArray(rawVal) ? rawVal : (rawVal != null && rawVal !== '' ? [rawVal] : []);
      var arr = rawList.map(function(x) {
        var s = String(x).toLowerCase();
        return isTagProp ? s.replace(/^#/, '') : s;
      });

      if (op === 'is' || op === '=') {
        return arr.some(function(it) { return it === searchStr; });
      }
      if (op === 'is_not' || op === '!=') {
        return !arr.some(function(it) { return it === searchStr; });
      }
      if (op === 'contains' || op === 'has_tag') {
        return arr.some(function(it) {
          return it === searchStr || (isTagProp && it.indexOf(searchStr + '/') === 0) || it.indexOf(searchStr) !== -1;
        });
      }
      if (op === 'does_not_contain') {
        return !arr.some(function(it) {
          return it === searchStr || (isTagProp && it.indexOf(searchStr + '/') === 0) || it.indexOf(searchStr) !== -1;
        });
      }
      if (op === 'contains_any') {
        var tokensAny = searchStr.split(/[\s,]+/).filter(Boolean);
        return tokensAny.some(function(tok) {
          return arr.some(function(it) { return it === tok || it.indexOf(tok) !== -1; });
        });
      }
      if (op === 'contains_all') {
        var tokensAll = searchStr.split(/[\s,]+/).filter(Boolean);
        return tokensAll.every(function(tok) {
          return arr.some(function(it) { return it === tok || it.indexOf(tok) !== -1; });
        });
      }
      if (op === 'does_not_contain_any') {
        var tokensNone = searchStr.split(/[\s,]+/).filter(Boolean);
        return !tokensNone.some(function(tok) {
          return arr.some(function(it) { return it === tok || it.indexOf(tok) !== -1; });
        });
      }
      if (op === 'does_not_contain_all') {
        var tokensNotAll = searchStr.split(/[\s,]+/).filter(Boolean);
        return !tokensNotAll.every(function(tok) {
          return arr.some(function(it) { return it === tok || it.indexOf(tok) !== -1; });
        });
      }
      return true;
    }

    // Default: text / link
    var strVal = String(rawVal != null ? rawVal : '').toLowerCase();
    var strTarget = String(target != null ? target : '').toLowerCase();

    if (op === 'is' || op === '=') return strVal === strTarget;
    if (op === 'is_not' || op === '!=') return strVal !== strTarget;
    if (op === 'contains') return strVal.includes(strTarget);
    if (op === 'does_not_contain') return !strVal.includes(strTarget);
    if (op === 'starts_with') return strVal.startsWith(strTarget);
    if (op === 'does_not_start_with') return !strVal.startsWith(strTarget);
    if (op === 'ends_with') return strVal.endsWith(strTarget);
    if (op === 'does_not_end_with') return !strVal.endsWith(strTarget);
    if (op === 'matches' || op === 'does_not_match') {
      try {
        var rx = new RegExp(String(target != null ? target : ''), 'i');
        var matched = rx.test(String(rawVal != null ? rawVal : ''));
        return op === 'matches' ? matched : !matched;
      } catch (e) {
        return false;
      }
    }
    if (op === '>') return strVal > strTarget;
    if (op === '<') return strVal < strTarget;
    if (op === '>=') return strVal >= strTarget;
    if (op === '<=') return strVal <= strTarget;

    return true;
  }

  // =========================================================================
  // Card Rendering Engine
  // =========================================================================

  function renderCards() {
    if (!contentContainer) return;
    var view = base.views[currentViewIdx];
    if (!view) return;

    // Filter items
    var filtered = items.filter(passesFilterRules);

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(function(it) {
        if (it.title.toLowerCase().includes(searchQuery)) return true;
        if (it.tags && it.tags.some(function(t) { return t.toLowerCase().includes(searchQuery); })) return true;
        var propValues = Object.values(it.properties || {});
        for (var i = 0; i < propValues.length; i++) {
          if (String(propValues[i]).toLowerCase().includes(searchQuery)) return true;
        }
        return false;
      });
    }

    // Multi-level sorting
    if (activeSortRules.length > 0) {
      filtered.sort(function(a, b) {
        for (var i = 0; i < activeSortRules.length; i++) {
          var rule = activeSortRules[i];
          var valA = getItemValue(a, rule.property);
          var valB = getItemValue(b, rule.property);
          var isAsc = rule.direction.toUpperCase() === 'ASC';
          var cmp = compareValuesClient(valA, valB, isAsc);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    if (itemCountBadge) {
      itemCountBadge.textContent = filtered.length + ' item' + (filtered.length === 1 ? '' : 's');
    }

    contentContainer.innerHTML = '';

    if (filtered.length === 0) {
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.innerHTML = '<h3>No items found</h3><p>Try adjusting your search or filters.</p>';
      contentContainer.appendChild(emptyDiv);
      return;
    }

    var viewType = (view.type || 'cards').toLowerCase();
    if (viewType === 'table') {
      renderTableView(contentContainer, filtered, view);
    } else {
      renderGalleryCards(contentContainer, filtered, view);
    }
  }

  function renderGalleryCards(contentContainer, filtered, view) {
    // Grouping
    if (activeGroupRule && activeGroupRule.property) {
      var groupProp = activeGroupRule.property;
      var isGroupAsc = activeGroupRule.direction.toUpperCase() === 'ASC';

      var groups = new Map();
      filtered.forEach(function(it) {
        var keyVal = getItemValue(it, groupProp);
        var isValEmpty = keyVal === undefined || keyVal === null || keyVal === '' || (Array.isArray(keyVal) && keyVal.length === 0);
        var keyStr = isValEmpty ? 'Uncategorized' : (Array.isArray(keyVal) ? keyVal.join(', ') : String(keyVal));
        if (!groups.has(keyStr)) groups.set(keyStr, []);
        groups.get(keyStr).push(it);
      });

      var sortedKeys = Array.from(groups.keys()).sort(function(a, b) {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return compareValuesClient(a, b, isGroupAsc);
      });

      sortedKeys.forEach(function(grpKey) {
        var grpItems = groups.get(grpKey);
        if (!grpItems) return;
        var grpSection = document.createElement('section');
        grpSection.className = 'group-section bases-group';
        grpSection.setAttribute('data-group-value', grpKey);

        var grpHeader = document.createElement('div');
        grpHeader.className = 'group-header bases-group-header';
        grpHeader.innerHTML = '<span class="group-title bases-group-title">' + escapeHtml(grpKey) + '</span><span class="group-count bases-group-count">' + grpItems.length + '</span>';
        grpSection.appendChild(grpHeader);

        var grid = document.createElement('div');
        grid.className = 'cards-grid bases-cards-grid';
        grpItems.forEach(function(item) {
          grid.appendChild(createCardElement(item));
        });
        grpSection.appendChild(grid);

        contentContainer.appendChild(grpSection);
      });
    } else {
      var grid = document.createElement('div');
      grid.className = 'cards-grid bases-cards-grid';
      filtered.forEach(function(item) {
        grid.appendChild(createCardElement(item));
      });
      contentContainer.appendChild(grid);
    }
  }

  // =========================================================================
  // Table View & Summarize Engine
  // =========================================================================

  function renderTableView(container, itemsList, view) {
    var cols = (activeOrder && activeOrder.length > 0) ? activeOrder : getAllAvailablePropertyKeys();
    if (cols.length === 0) cols = ['file.name'];

    var viewSummaries = view.summaries || {};
    var colSizes = view.columnSize || {};

    if (activeGroupRule && activeGroupRule.property) {
      var groupProp = activeGroupRule.property;
      var isGroupAsc = activeGroupRule.direction.toUpperCase() === 'ASC';

      var groups = new Map();
      itemsList.forEach(function(it) {
        var keyVal = getItemValue(it, groupProp);
        var isValEmpty = keyVal === undefined || keyVal === null || keyVal === '' || (Array.isArray(keyVal) && keyVal.length === 0);
        var keyStr = isValEmpty ? 'Uncategorized' : (Array.isArray(keyVal) ? keyVal.join(', ') : String(keyVal));
        if (!groups.has(keyStr)) groups.set(keyStr, []);
        groups.get(keyStr).push(it);
      });

      var sortedKeys = Array.from(groups.keys()).sort(function(a, b) {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return compareValuesClient(a, b, isGroupAsc);
      });

      sortedKeys.forEach(function(grpKey) {
        var grpItems = groups.get(grpKey);
        if (!grpItems) return;

        var grpSection = document.createElement('section');
        grpSection.className = 'group-section bases-group bases-table-group-section';
        grpSection.setAttribute('data-group-value', grpKey);

        var grpHeader = document.createElement('div');
        grpHeader.className = 'group-header bases-group-header';
        grpHeader.innerHTML = '<span class="group-title bases-group-title">' + escapeHtml(grpKey) + '</span><span class="group-count bases-group-count">' + grpItems.length + '</span>';
        grpSection.appendChild(grpHeader);

        var tableWrapper = createTableElement(grpItems, cols, colSizes, viewSummaries, true, grpKey);
        grpSection.appendChild(tableWrapper);

        container.appendChild(grpSection);
      });

      // Overall grand summary if multiple groups exist and summaries are configured
      if (sortedKeys.length > 1 && hasAnySummaries(cols, viewSummaries)) {
        var grandSummarySection = document.createElement('div');
        grandSummarySection.className = 'bases-table-wrapper bases-grand-summary-wrapper';
        var grandTable = document.createElement('table');
        grandTable.className = 'bases-table';
        var grandFoot = createTableSummaryFoot(itemsList, cols, colSizes, viewSummaries, 'Grand Total');
        grandTable.appendChild(grandFoot);
        grandSummarySection.appendChild(grandTable);
        container.appendChild(grandSummarySection);
      }
    } else {
      var tableWrapper = createTableElement(itemsList, cols, colSizes, viewSummaries, false);
      container.appendChild(tableWrapper);
    }
  }

  function createTableElement(itemsList, cols, colSizes, viewSummaries, isGrouped, groupKey) {
    var wrapper = document.createElement('div');
    wrapper.className = 'bases-table-wrapper';

    var table = document.createElement('table');
    table.className = 'bases-table';

    // 1. Table Header (thead)
    var thead = document.createElement('thead');
    thead.className = 'bases-thead';
    var headerRow = document.createElement('tr');
    headerRow.className = 'bases-tr bases-th-row';

    cols.forEach(function(col) {
      var th = document.createElement('th');
      th.className = 'bases-th';
      th.setAttribute('data-column', col);

      var width = getColumnWidth(col, colSizes);
      if (width) {
        th.style.width = width + 'px';
        th.style.minWidth = width + 'px';
      }

      var thContent = document.createElement('div');
      thContent.className = 'th-content';

      var meta = getPropertyMetadata(col);
      var iconSpan = document.createElement('span');
      iconSpan.className = 'th-icon';
      iconSpan.appendChild(createIconSvg(meta.icon || 'type', 'b2h-icon-xs'));
      thContent.appendChild(iconSpan);

      var nameSpan = document.createElement('span');
      nameSpan.className = 'th-name';
      nameSpan.textContent = getPropertyDisplayName(col);
      nameSpan.setAttribute('dir', 'auto');
      thContent.appendChild(nameSpan);

      // Sort indicator
      var sortRule = activeSortRules.find(function(s) { return s.property === col; });
      if (sortRule) {
        var sortIconSpan = document.createElement('span');
        sortIconSpan.className = 'th-sort-icon';
        var isAsc = sortRule.direction.toUpperCase() === 'ASC';
        sortIconSpan.appendChild(createIconSvg(isAsc ? 'arrow-up' : 'arrow-down', 'b2h-icon-xs'));
        thContent.appendChild(sortIconSpan);
      }

      th.appendChild(thContent);

      // Interactive Column Header Sorting
      th.addEventListener('click', function() {
        toggleColumnSort(col);
      });

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 2. Table Body (tbody)
    var tbody = document.createElement('tbody');
    tbody.className = 'bases-tbody';

    itemsList.forEach(function(item) {
      var tr = document.createElement('tr');
      tr.className = 'bases-tr';
      if (item.id) tr.setAttribute('data-item-id', item.id);

      cols.forEach(function(col) {
        var td = document.createElement('td');
        td.className = 'bases-td';
        td.setAttribute('data-column', col);

        var val = getItemValue(item, col);
        var meta = getPropertyMetadata(col);

        if (col === 'file.name' || col === 'name' || col === 'file') {
          if (exportScope !== 'bases-only') {
            var titleLink = document.createElement('a');
            titleLink.className = 'table-cell-title';
            titleLink.href = 'javascript:void(0);';
            titleLink.appendChild(createIconSvg('file-text', 'b2h-icon-xs'));
            var titleText = document.createElement('span');
            titleText.textContent = item.title;
            titleText.setAttribute('dir', 'auto');
            titleLink.appendChild(titleText);
            titleLink.addEventListener('click', function(ev) {
              ev.preventDefault();
              openNoteModal(item);
            });
            td.appendChild(titleLink);
          } else {
            var titleSpan = document.createElement('span');
            titleSpan.className = 'table-cell-title table-cell-title-static';
            titleSpan.appendChild(createIconSvg('file-text', 'b2h-icon-xs'));
            var titleTextStatic = document.createElement('span');
            titleTextStatic.textContent = item.title;
            titleTextStatic.setAttribute('dir', 'auto');
            titleSpan.appendChild(titleTextStatic);
            td.appendChild(titleSpan);
          }
        } else if (meta.type === 'checkbox' || typeof val === 'boolean') {
          var boolSpan = document.createElement('span');
          boolSpan.className = val ? 'table-bool-checked' : 'table-bool-unchecked';
          boolSpan.appendChild(createIconSvg(val ? 'check' : 'x', 'b2h-icon-xs'));
          td.appendChild(boolSpan);
        } else if (meta.type === 'list' || Array.isArray(val)) {
          var arr = Array.isArray(val) ? val : (val ? [String(val)] : []);
          arr.forEach(function(tagItem) {
            var tagPill = document.createElement('span');
            tagPill.className = 'bases-tag-pill';
            tagPill.textContent = String(tagItem);
            tagPill.setAttribute('dir', 'auto');
            td.appendChild(tagPill);
          });
        } else if (meta.type === 'number' || typeof val === 'number') {
          var numSpan = document.createElement('span');
          numSpan.className = 'table-num';
          numSpan.textContent = (val !== undefined && val !== null) ? String(val) : '';
          td.appendChild(numSpan);
        } else if (meta.type === 'date') {
          var dateSpan = document.createElement('span');
          dateSpan.className = 'table-date';
          dateSpan.textContent = (val !== undefined && val !== null) ? String(val) : '';
          td.appendChild(dateSpan);
        } else if (col.includes('starRating') || (typeof val === 'string' && val.includes('★'))) {
          var starSpan = document.createElement('span');
          starSpan.className = 'card-rating';
          starSpan.textContent = String(val);
          td.appendChild(starSpan);
        } else {
          var textSpan = document.createElement('span');
          textSpan.textContent = (val !== undefined && val !== null) ? String(val) : '';
          textSpan.setAttribute('dir', 'auto');
          td.appendChild(textSpan);
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    // 3. Table Footer (tfoot) - Computed Summarize Row
    if (hasAnySummaries(cols, viewSummaries)) {
      var tfoot = createTableSummaryFoot(itemsList, cols, colSizes, viewSummaries, isGrouped ? 'Group Summary' : null, groupKey);
      table.appendChild(tfoot);
    }

    wrapper.appendChild(table);
    return wrapper;
  }

  function hasAnySummaries(cols, viewSummaries) {
    if (!viewSummaries) return false;
    for (var i = 0; i < cols.length; i++) {
      if (getColumnSummaryRule(cols[i], viewSummaries)) return true;
    }
    return false;
  }

  function getColumnSummaryRule(col, viewSummaries) {
    if (!viewSummaries) return null;
    if (viewSummaries[col]) return viewSummaries[col];
    var cleanCol = col.replace(/^formula[.]/, '').replace(/^note[.]/, '');
    if (viewSummaries[cleanCol]) return viewSummaries[cleanCol];
    return null;
  }

  function createTableSummaryFoot(itemsList, cols, colSizes, viewSummaries, groupLabel, groupKey) {
    var tfoot = document.createElement('tfoot');
    tfoot.className = 'bases-tfoot';

    var tr = document.createElement('tr');
    tr.className = 'bases-tr bases-summary-row';

    cols.forEach(function(col, idx) {
      var td = document.createElement('td');
      td.className = 'bases-td bases-summary-cell';
      td.setAttribute('data-column', col);

      var width = getColumnWidth(col, colSizes);
      if (width) {
        td.style.width = width + 'px';
        td.style.minWidth = width + 'px';
      }

      var rule = getColumnSummaryRule(col, viewSummaries);
      if (rule) {
        var summaryResult = null;
        var view = base.views[currentViewIdx];
        if (view && view.staticSummaries) {
          var cleanCol = col.replace(/^formula[.]/, '').replace(/^note[.]/, '');
          if (groupLabel && groupKey && view.staticSummaries.groups && view.staticSummaries.groups[groupKey]) {
            var grpDict = view.staticSummaries.groups[groupKey];
            summaryResult = grpDict[col] || grpDict[cleanCol];
          } else if (!groupLabel || groupLabel === 'Grand Total') {
            if (view.staticSummaries.grand) {
              summaryResult = view.staticSummaries.grand[col] || view.staticSummaries.grand[cleanCol];
            }
          }
        }
        if (!summaryResult) {
          summaryResult = calculateSummary(rule, col, itemsList);
        }

        var content = document.createElement('div');
        content.className = 'summary-content';

        if (summaryResult.label) {
          var labelSpan = document.createElement('span');
          labelSpan.className = 'summary-type-label';
          labelSpan.textContent = summaryResult.label;
          content.appendChild(labelSpan);
        }

        var valSpan = document.createElement('span');
        valSpan.className = 'summary-result-value';
        valSpan.textContent = String(summaryResult.value != null ? summaryResult.value : '-');
        valSpan.setAttribute('dir', 'auto');
        content.appendChild(valSpan);

        td.appendChild(content);
      } else if (idx === 0 && groupLabel) {
        var groupLabelSpan = document.createElement('span');
        groupLabelSpan.className = 'summary-type-label';
        groupLabelSpan.textContent = groupLabel;
        td.appendChild(groupLabelSpan);
      }

      tr.appendChild(td);
    });

    tfoot.appendChild(tr);
    return tfoot;
  }

  function calculateSummary(rule, col, itemsList) {
    var rawVals = [];
    var filledVals = [];
    var numVals = [];
    var boolVals = [];

    itemsList.forEach(function(it) {
      var v = getItemValue(it, col);
      rawVals.push(v);
      if (v !== undefined && v !== null && v !== '') {
        filledVals.push(v);
        var n = Number(v);
        if (!isNaN(n) && typeof v !== 'boolean') {
          numVals.push(n);
        }
        if (typeof v === 'boolean') {
          boolVals.push(v);
        }
      }
    });

    // Check if rule refers to a top-level summary formula
    var ruleStr = String(rule).trim();
    var isCustomFormula = false;
    if (base.summaries && base.summaries[ruleStr]) {
      ruleStr = String(base.summaries[ruleStr]).trim();
      isCustomFormula = true;
    } else if (
      ruleStr.startsWith('values') ||
      ruleStr.includes('values.') ||
      ruleStr.startsWith('(') ||
      findTopLevelBinaryOp(ruleStr, ['+', '-', '*', '/']) !== null
    ) {
      isCustomFormula = true;
    }

    var lowerRule = ruleStr.toLowerCase();

    // 1. Built-in obsidian summary functions
    if (!isCustomFormula) {
      if (lowerRule === 'count') {
        return { label: 'Count', value: itemsList.length };
      }
      if (lowerRule === 'filled') {
        return { label: 'Filled', value: filledVals.length };
      }
      if (lowerRule === 'empty') {
        return { label: 'Empty', value: itemsList.length - filledVals.length };
      }
      if (lowerRule === 'unique') {
        var uniq = new Set(filledVals.map(function(x) { return Array.isArray(x) ? x.join(',') : String(x); }));
        return { label: 'Unique', value: uniq.size };
      }
      if (lowerRule === 'checked') {
        var checkedCount = boolVals.filter(function(b) { return b === true; }).length;
        return { label: 'Checked', value: checkedCount };
      }
      if (lowerRule === 'unchecked') {
        var uncheckedCount = boolVals.filter(function(b) { return b === false; }).length;
        return { label: 'Unchecked', value: uncheckedCount };
      }
      if (lowerRule === 'sum') {
        var s = numVals.reduce(function(acc, n) { return acc + n; }, 0);
        return { label: 'Sum', value: Number.isInteger(s) ? s : Math.round(s * 100) / 100 };
      }
      if (lowerRule === 'average' || lowerRule === 'mean' || lowerRule === 'avg') {
        if (numVals.length === 0) return { label: 'Average', value: '-' };
        var sumVal = numVals.reduce(function(acc, n) { return acc + n; }, 0);
        var avg = sumVal / numVals.length;
        return { label: 'Average', value: Math.round(avg * 100) / 100 };
      }
      if (lowerRule === 'median') {
        if (numVals.length === 0) return { label: 'Median', value: '-' };
        var sorted = numVals.slice().sort(function(a, b) { return a - b; });
        var mid = Math.floor(sorted.length / 2);
        var med = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        return { label: 'Median', value: Math.round(med * 100) / 100 };
      }
      if (lowerRule === 'min') {
        if (numVals.length > 0) {
          return { label: 'Min', value: Math.min.apply(null, numVals) };
        }
        if (filledVals.length > 0) {
          var sortedVals = filledVals.slice().sort();
          return { label: 'Min', value: sortedVals[0] };
        }
        return { label: 'Min', value: '-' };
      }
      if (lowerRule === 'max') {
        if (numVals.length > 0) {
          return { label: 'Max', value: Math.max.apply(null, numVals) };
        }
        if (filledVals.length > 0) {
          var sortedValsMax = filledVals.slice().sort();
          return { label: 'Max', value: sortedValsMax[sortedValsMax.length - 1] };
        }
        return { label: 'Max', value: '-' };
      }
      if (lowerRule === 'range') {
        if (numVals.length > 0) {
          var min = Math.min.apply(null, numVals);
          var max = Math.max.apply(null, numVals);
          var diff = max - min;
          return { label: 'Range', value: Number.isInteger(diff) ? diff : Math.round(diff * 100) / 100 };
        }
        return { label: 'Range', value: '-' };
      }
    }

    // 2. Custom formula evaluation
    try {
      var customResult = evaluateCustomSummaryFormula(ruleStr, rawVals);
      return { label: '', value: customResult };
    } catch (e) {
      console.warn('Failed to evaluate custom summary formula:', ruleStr, e);
      return { label: '', value: '-' };
    }
  }

  function findMatchingClosingParen(str, openIdx) {
    var depth = 0;
    var inQuote = null;
    for (var i = openIdx; i < str.length; i++) {
      var char = str[i];
      if (inQuote) {
        if (char === inQuote && str[i - 1] !== '\\') {
          inQuote = null;
        }
        continue;
      }
      if (char === '"' || char === "'") {
        inQuote = char;
        continue;
      }
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  function applyMethodOnValue(current, callStr) {
    if (!callStr) return current;
    var match = callStr.match(/^(\w+)(?:\((.*)\))?$/);
    if (!match) return current;

    var methodName = match[1];
    var argStr = match[2] !== undefined ? match[2] : '';

    if (Array.isArray(current)) {
      if (methodName === 'flat') {
        var flattened = [];
        for (var j = 0; j < current.length; j++) {
          var item = current[j];
          if (Array.isArray(item)) {
            for (var k = 0; k < item.length; k++) {
              if (item[k] !== null && item[k] !== undefined && item[k] !== '') flattened.push(item[k]);
            }
          } else if (item !== null && item !== undefined && item !== '') {
            flattened.push(item);
          }
        }
        return flattened;
      } else if (methodName === 'unique') {
        var seen = new Set();
        return current.filter(function(x) {
          var s = String(x);
          if (seen.has(s)) return false;
          seen.add(s);
          return true;
        });
      } else if (methodName === 'filter') {
        var predExpr = argStr.trim();
        return current.filter(function(it) {
          return Boolean(evaluateSummaryItemExpression(predExpr, it));
        });
      } else if (methodName === 'map') {
        var mapExpr = argStr.trim();
        return current
          .map(function(it) { return evaluateSummaryItemExpression(mapExpr, it); })
          .filter(function(x) { return x !== null && x !== undefined && x !== ''; });
      } else if (methodName === 'length' || methodName === 'count' || methodName === 'size') {
        return current.length;
      } else if (methodName === 'sum') {
        var sumNums = current.map(Number).filter(function(n) { return !isNaN(n); });
        var s = sumNums.reduce(function(a, b) { return a + b; }, 0);
        return Number.isInteger(s) ? s : Math.round(s * 10000) / 10000;
      } else if (methodName === 'mean' || methodName === 'avg' || methodName === 'average') {
        var meanNums = current.map(Number).filter(function(n) { return !isNaN(n); });
        if (meanNums.length === 0) {
          return 0;
        } else {
          var avg = meanNums.reduce(function(a, b) { return a + b; }, 0) / meanNums.length;
          return Math.round(avg * 100) / 100;
        }
      } else if (methodName === 'median') {
        var medNums = current.map(Number).filter(function(n) { return !isNaN(n); }).sort(function(a, b) { return a - b; });
        if (medNums.length === 0) {
          return 0;
        } else {
          var mid = Math.floor(medNums.length / 2);
          return medNums.length % 2 !== 0 ? (medNums[mid] || 0) : (((medNums[mid - 1] || 0) + (medNums[mid] || 0)) / 2);
        }
      } else if (methodName === 'min') {
        var minNums = current.map(Number).filter(function(n) { return !isNaN(n); });
        return minNums.length > 0 ? Math.min.apply(null, minNums) : 0;
      } else if (methodName === 'max') {
        var maxNums = current.map(Number).filter(function(n) { return !isNaN(n); });
        return maxNums.length > 0 ? Math.max.apply(null, maxNums) : 0;
      } else if (methodName === 'join') {
        var sep = argStr.replace(/^["']/, '').replace(/["']$/, '') || ', ';
        return current.map(function(x) { return String(x != null ? x : ''); }).join(sep);
      }
    } else {
      if (
        typeof current === 'string' &&
        !isNaN(Number(current)) &&
        (methodName === 'round' || methodName === 'toFixed' || methodName === 'floor' || methodName === 'ceil')
      ) {
        current = Number(current);
      }

      if (typeof current === 'number') {
        if (methodName === 'round') {
          var decimals = argStr.trim() ? parseInt(argStr.trim(), 10) : 0;
          var factor = Math.pow(10, isNaN(decimals) ? 0 : decimals);
          return Math.round(current * factor) / factor;
        } else if (methodName === 'toFixed') {
          var fixDecimals = argStr.trim() ? parseInt(argStr.trim(), 10) : 0;
          return current.toFixed(isNaN(fixDecimals) ? 0 : fixDecimals);
        } else if (methodName === 'floor') {
          return Math.floor(current);
        } else if (methodName === 'ceil') {
          return Math.ceil(current);
        } else if (methodName === 'abs') {
          return Math.abs(current);
        } else if (methodName === 'toString') {
          return String(current);
        }
      } else if (typeof current === 'string') {
        if (methodName === 'length' || methodName === 'count' || methodName === 'size') {
          return current.length;
        } else if (methodName === 'replace') {
          var repArgs = splitTopLevelCommas(argStr);
          var pattern = (repArgs[0] || '').trim();
          var replacement = (repArgs[1] || '').trim().replace(/^["']/, '').replace(/["']$/, '');
          var regMatch = pattern.match(/^\/(.*)\// + '([gimsuy]*)$');
          if (regMatch) {
            try {
              var reg = new RegExp(regMatch[1] || '', regMatch[2]);
              return current.replace(reg, replacement);
            } catch (e) {
              // ignore
            }
          } else {
            pattern = pattern.replace(/^["']/, '').replace(/["']$/, '');
            return current.replace(pattern, replacement);
          }
        } else if (methodName === 'toLowerCase') {
          return current.toLowerCase();
        } else if (methodName === 'toUpperCase') {
          return current.toUpperCase();
        } else if (methodName === 'trim') {
          return current.trim();
        }
      }
    }
    return current;
  }

  function evaluateCustomSummaryFormula(formula, rawVals) {
    var trimmed = formula.trim();

    // 1. Check for top-level binary operations (+, -)
    var addSubMatch = findTopLevelBinaryOp(trimmed, ['+', '-']);
    if (addSubMatch) {
      var leftVal = evaluateCustomSummaryFormula(addSubMatch.left, rawVals);
      var rightVal = evaluateCustomSummaryFormula(addSubMatch.right, rawVals);
      if (addSubMatch.op === '+') {
        if (typeof leftVal === 'string' || typeof rightVal === 'string') {
          return String(leftVal != null ? leftVal : '') + String(rightVal != null ? rightVal : '');
        }
        var numLeft = Number(leftVal);
        var numRight = Number(rightVal);
        if (!isNaN(numLeft) && !isNaN(numRight)) {
          var sum = numLeft + numRight;
          return Number.isInteger(sum) ? sum : Math.round(sum * 10000) / 10000;
        }
        return String(leftVal != null ? leftVal : '') + String(rightVal != null ? rightVal : '');
      } else if (addSubMatch.op === '-') {
        var numLeftSub = Number(leftVal);
        var numRightSub = Number(rightVal);
        if (!isNaN(numLeftSub) && !isNaN(numRightSub)) {
          var diff = numLeftSub - numRightSub;
          return Number.isInteger(diff) ? diff : Math.round(diff * 10000) / 10000;
        }
        return '-';
      }
    }

    // 2. Check for top-level binary operations (*, /, %)
    var mulDivMatch = findTopLevelBinaryOp(trimmed, ['*', '/', '%']);
    if (mulDivMatch) {
      var leftValMul = evaluateCustomSummaryFormula(mulDivMatch.left, rawVals);
      var rightValMul = evaluateCustomSummaryFormula(mulDivMatch.right, rawVals);
      var numLeftM = Number(leftValMul);
      var numRightM = Number(rightValMul);
      if (!isNaN(numLeftM) && !isNaN(numRightM)) {
        var res = 0;
        if (mulDivMatch.op === '*') {
          res = numLeftM * numRightM;
        } else if (mulDivMatch.op === '/') {
          if (numRightM === 0) return 0;
          res = numLeftM / numRightM;
        } else if (mulDivMatch.op === '%') {
          if (numRightM === 0) return 0;
          res = numLeftM % numRightM;
        }
        return Number.isInteger(res) ? res : Math.round(res * 10000) / 10000;
      }
      return '-';
    }

    // 3. Parenthesized expression starting with '(' e.g. (values.sum() / 60).round()
    if (trimmed.startsWith('(')) {
      var closeParenIdx = findMatchingClosingParen(trimmed, 0);
      if (closeParenIdx !== -1) {
        var inner = trimmed.slice(1, closeParenIdx).trim();
        var tail = trimmed.slice(closeParenIdx + 1).trim();
        var result = evaluateCustomSummaryFormula(inner, rawVals);
        if (tail.startsWith('.')) {
          var calls = splitPipelineCalls(tail.slice(1));
          for (var c = 0; c < calls.length; c++) {
            result = applyMethodOnValue(result, calls[c]);
          }
        }
        if (typeof result === 'number' || typeof result === 'boolean') {
          return result;
        }
        if (typeof result === 'string') {
          return result;
        }
        if (Array.isArray(result)) {
          return result.map(function(x) { return String(x != null ? x : ''); }).join(' ');
        }
        return String(result != null ? result : '-');
      }
    }

    // 4. String literal
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // 5. Number literal
    if (!isNaN(Number(trimmed)) && trimmed !== '') {
      return Number(trimmed);
    }

    // 6. Boolean or null
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null' || trimmed === 'undefined') return '';

    // 7. Pipeline starting with 'values'
    var callsP = splitPipelineCalls(trimmed);
    if (callsP.length === 0 || callsP[0] !== 'values') {
      return trimmed;
    }

    var current = rawVals.slice();
    for (var p = 1; p < callsP.length; p++) {
      var callStrP = callsP[p];
      if (!callStrP) continue;
      current = applyMethodOnValue(current, callStrP);
    }

    if (Array.isArray(current)) {
      return current.map(function(x) { return String(x != null ? x : ''); }).join(' ');
    }
    if (typeof current === 'number' || typeof current === 'boolean') {
      return current;
    }
    return String(current != null ? current : '-');
  }

  function evaluateSummaryItemExpression(rawExpr, itemValue) {
    var expr = rawExpr.trim();
    if (!expr) return null;

    if (expr.startsWith('if(') && expr.endsWith(')')) {
      var inner = expr.slice(3, -1);
      var args = splitTopLevelCommas(inner);
      if (args.length >= 2) {
        var cond = evaluateSummaryItemExpression(args[0] || '', itemValue);
        if (Boolean(cond)) {
          return evaluateSummaryItemExpression(args[1] || '', itemValue);
        } else if (args[2]) {
          return evaluateSummaryItemExpression(args[2], itemValue);
        }
        return null;
      }
    }

    var opMatch = findTopLevelComparison(expr);
    if (opMatch) {
      var left = evaluateSummaryItemExpression(opMatch.left, itemValue);
      var right = evaluateSummaryItemExpression(opMatch.right, itemValue);
      switch (opMatch.op) {
        case '==': return String(left) === String(right);
        case '!=': return String(left) !== String(right);
        case '>=': return Number(left) >= Number(right);
        case '<=': return Number(left) <= Number(right);
        case '>': return Number(left) > Number(right);
        case '<': return Number(left) < Number(right);
      }
    }

    var replaceMatch = expr.match(/^value\.replace\((.*)\)$/);
    if (replaceMatch) {
      var repArgs = splitTopLevelCommas(replaceMatch[1] || '');
      var pattern = (repArgs[0] || '').trim();
      var replacement = (repArgs[1] || '').trim().replace(/^["']/, '').replace(/["']$/, '');
      var str = String(itemValue != null ? itemValue : '');

      var regexMatch = pattern.match(/^\/(.*)\/([gimsuy]*)$/);
      if (regexMatch) {
        try {
          var reg = new RegExp(regexMatch[1] || '', regexMatch[2]);
          return str.replace(reg, replacement);
        } catch (e) {
          return str;
        }
      } else {
        pattern = pattern.replace(/^["']/, '').replace(/["']$/, '');
        return str.replace(pattern, replacement);
      }
    }

    var arrayContainsMatch = expr.match(/^(\[.*\])\.(?:contains|includes)\((.*)\)$/);
    if (arrayContainsMatch) {
      var arrayLiteralStr = arrayContainsMatch[1] || '';
      var innerArg = (arrayContainsMatch[2] || '').trim();
      var valToFind = innerArg === 'value' ? itemValue : evaluateSummaryItemExpression(innerArg, itemValue);

      try {
        var parsedArray = JSON.parse(arrayLiteralStr.replace(/'/g, '"'));
        var cleanFind = String(valToFind != null ? valToFind : '').toLowerCase().replace(/^#/, '');
        return parsedArray.some(function(x) {
          return String(x).toLowerCase().replace(/^#/, '') === cleanFind;
        });
      } catch (e) {
        return false;
      }
    }

    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    if (!isNaN(Number(expr)) && expr !== '') {
      return Number(expr);
    }

    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null' || expr === 'undefined') return null;

    if (expr === 'value') {
      return itemValue;
    }

    return expr;
  }

  function splitPipelineCalls(expr) {
    var calls = [];
    var depth = 0;
    var inQuote = null;
    var current = '';

    for (var i = 0; i < expr.length; i++) {
      var char = expr[i];
      if (inQuote) {
        current += char;
        if (char === inQuote && expr[i - 1] !== '\\') {
          inQuote = null;
        }
        continue;
      }
      if (char === '"' || char === "'") {
        inQuote = char;
        current += char;
        continue;
      }
      if (char === '(' || char === '[' || char === '{') {
        depth++;
        current += char;
        continue;
      }
      if (char === ')' || char === ']' || char === '}') {
        depth--;
        current += char;
        continue;
      }
      if (char === '.' && depth === 0) {
        if (current.trim()) calls.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) calls.push(current.trim());
    return calls;
  }

  function findTopLevelBinaryOp(expr, ops) {
    var depth = 0;
    var inQuote = null;
    var lastMatch = null;

    for (var i = 0; i < expr.length; i++) {
      var char = expr[i];
      if (inQuote) {
        if (char === inQuote && expr[i - 1] !== '\\') {
          inQuote = null;
        }
        continue;
      }
      if (char === '"' || char === "'") {
        inQuote = char;
        continue;
      }
      if (char === '(' || char === '[' || char === '{') {
        depth++;
        continue;
      }
      if (char === ')' || char === ']' || char === '}') {
        depth--;
        continue;
      }
      if (depth === 0) {
        for (var j = 0; j < ops.length; j++) {
          var op = ops[j];
          if (expr.slice(i, i + op.length) === op) {
            var left = expr.slice(0, i).trim();
            if (left.length === 0 && (op === '+' || op === '-')) {
              continue;
            }
            lastMatch = {
              index: i,
              left: left,
              op: op,
              right: expr.slice(i + op.length).trim()
            };
          }
        }
      }
    }
    return lastMatch;
  }

  function getColumnWidth(col, colSizes) {
    if (!colSizes) return null;
    if (colSizes[col]) return colSizes[col];
    var cleanCol = col.replace(/^formula[.]/, '').replace(/^note[.]/, '');
    if (colSizes[cleanCol]) return colSizes[cleanCol];
    return null;
  }

  function getPropertyDisplayName(col) {
    if (col === 'file.name' || col === 'name' || col === 'file') return 'Name';
    var clean = col.replace(/^formula[.]/, '').replace(/^note[.]/, '');
    var meta = getPropertyMetadata(col);
    return (meta && meta.name && meta.name !== col) ? meta.name : clean;
  }

  function toggleColumnSort(col) {
    var existingIdx = activeSortRules.findIndex(function(s) { return s.property === col; });
    if (existingIdx === -1) {
      activeSortRules.push({ property: col, direction: 'ASC' });
    } else if (activeSortRules[existingIdx].direction.toUpperCase() === 'ASC') {
      activeSortRules[existingIdx].direction = 'DESC';
    } else {
      activeSortRules.splice(existingIdx, 1);
    }
    saveSortState();
    renderSortPopover();
    renderCards();
  }

  function createCardElement(item) {
    var card = document.createElement('div');
    card.className = 'base-card bases-card';
    if (item.id) card.setAttribute('data-item-id', item.id);
    if (item.title) card.setAttribute('data-item-title', item.title);

    var imgWrapper = document.createElement('div');
    imgWrapper.className = 'card-image-wrapper bases-card-image-wrapper';

    var imgSrc = item.coverImageBase64 || item.coverAssetRelativePath || item.coverImage;
    if (imgSrc) {
      var img = document.createElement('img');
      img.className = 'card-image bases-card-image';
      img.src = imgSrc;
      img.alt = item.title;
      img.loading = 'lazy';
      img.onerror = function() {
        img.remove();
        imgWrapper.appendChild(createPlaceholder());
      };
      imgWrapper.appendChild(img);
    } else {
      imgWrapper.appendChild(createPlaceholder());
    }
    card.appendChild(imgWrapper);

    var body = document.createElement('div');
    body.className = 'card-body bases-card-body';

    var order = activeOrder.length > 0 ? activeOrder : ['file.name', 'rating'];
    var renderedTitle = false;

    order.forEach(function(prop) {
      var val = getItemValue(item, prop);
      if (val === undefined || val === null || val === '') return;

      var cleanProp = prop.replace(/^formula\./, '').replace(/^note\./, '');

      if (cleanProp === 'file.name' || cleanProp === 'name' || cleanProp === 'file') {
        var titleEl = document.createElement('div');
        titleEl.className = 'card-title bases-card-title';
        titleEl.textContent = String(val);
        titleEl.setAttribute('dir', 'auto');
        body.appendChild(titleEl);
        renderedTitle = true;
      } else if (cleanProp === 'badge' || cleanProp === 'badges' || cleanProp === 'tags' || cleanProp === 'tag' || cleanProp === 'file.tags' || cleanProp === 'file.tag') {
        var badgesContainer = document.createElement('div');
        badgesContainer.className = 'card-badges bases-card-badges';
        badgesContainer.setAttribute('data-property', cleanProp);
        badgesContainer.setAttribute('dir', 'auto');
        var badgeList = Array.isArray(val) ? val : [val];
        badgeList.forEach(function(b) {
          if (b === undefined || b === null) return;
          var str = String(b).trim();
          if (!str) return;
          var badgeEl = document.createElement('span');
          badgeEl.className = 'card-badge bases-card-badge';
          badgeEl.textContent = str;
          badgeEl.setAttribute('dir', 'auto');
          badgesContainer.appendChild(badgeEl);
        });
        if (badgesContainer.children.length > 0) {
          body.appendChild(badgesContainer);
        }
      } else if (cleanProp.includes('starRating') || (typeof val === 'string' && val.includes('★'))) {
        var starEl = document.createElement('div');
        starEl.className = 'card-rating bases-card-rating';
        starEl.textContent = String(val);
        body.appendChild(starEl);
      } else {
        var row = document.createElement('div');
        row.className = 'card-prop-item bases-card-property';
        row.setAttribute('data-property', cleanProp);
        var displayVal = Array.isArray(val) ? val.join(', ') : String(val);
        row.innerHTML = '<span class="card-prop-key bases-property-key">' + escapeHtml(cleanProp) + '</span><span class="card-prop-val bases-property-value" dir="auto">' + escapeHtml(displayVal) + '</span>';
        body.appendChild(row);
      }
    });

    if (!renderedTitle) {
      var fallbackTitle = document.createElement('div');
      fallbackTitle.className = 'card-title bases-card-title';
      fallbackTitle.textContent = item.title;
      fallbackTitle.setAttribute('dir', 'auto');
      body.insertBefore(fallbackTitle, body.firstChild);
    }

    card.appendChild(body);

    if (exportScope !== 'bases-only') {
      card.addEventListener('click', function() {
        openNoteModal(item);
      });
    } else {
      card.classList.add('bases-card-static');
    }

    return card;
  }

  function createPlaceholder() {
    var ph = document.createElement('div');
    ph.className = 'card-image-placeholder bases-card-image-placeholder';
    ph.appendChild(createIconSvg('image', 'b2h-icon-xl'));
    return ph;
  }

  function openNoteModal(item) {
    if (exportScope === 'bases-only') return;
    if (!noteModal) return;
    if (modalTitle) {
      modalTitle.textContent = item.title;
      modalTitle.setAttribute('dir', 'auto');
    }

    if (modalProperties) {
      modalProperties.innerHTML = '';
      var props = Object.entries(item.properties || {});
      props.forEach(function(entry) {
        var key = entry[0];
        var val = entry[1];
        if (key === 'cover' || key === 'cover_source' || key === 'image') return;
        var chip = document.createElement('div');
        chip.className = 'modal-prop-chip';
        var displayVal = Array.isArray(val) ? val.join(', ') : String(val != null ? val : '');
        chip.innerHTML = '<strong>' + escapeHtml(key) + ':</strong> ' + escapeHtml(displayVal);
        modalProperties.appendChild(chip);
      });
    }

    if (modalMarkdownContent) {
      if (exportScope === 'properties-only') {
        modalMarkdownContent.innerHTML = '';
        modalMarkdownContent.style.display = 'none';
      } else {
        modalMarkdownContent.style.display = '';
        if (item.htmlContent) {
          modalMarkdownContent.innerHTML = item.htmlContent;
        } else if (item.properties && item.properties.source) {
          modalMarkdownContent.innerHTML = '<p><a href="' + escapeHtml(String(item.properties.source)) + '" target="_blank" rel="noopener">Open source link &rarr;</a></p>';
        } else {
          modalMarkdownContent.innerHTML = '<p style="color:var(--text-muted);">No note content exported for this item.</p>';
        }
      }
    }

    noteModal.classList.add('open');
    if (modalOverlay) modalOverlay.classList.add('open');
  }

  function closeNoteModal() {
    if (noteModal) noteModal.classList.remove('open');
    if (!settingsDrawer || !settingsDrawer.classList.contains('open')) {
      if (modalOverlay) modalOverlay.classList.remove('open');
    }
  }

  function openSettings() {
    closeAllPopovers();
    if (settingsDrawer) settingsDrawer.classList.add('open');
    if (modalOverlay) modalOverlay.classList.add('open');
  }

  function closeSettings() {
    if (settingsDrawer) settingsDrawer.classList.remove('open');
    if (!noteModal || !noteModal.classList.contains('open')) {
      if (modalOverlay) modalOverlay.classList.remove('open');
    }
  }

  function applyTheme(theme) {
    currentTheme = theme;
    htmlRoot.setAttribute('data-theme', theme);
    localStorage.setItem('b2h_theme', theme);
    if (themeLightBtn && themeDarkBtn) {
      themeLightBtn.classList.toggle('active', theme === 'light');
      themeDarkBtn.classList.toggle('active', theme === 'dark');
    }
  }

  function applyWidth(width) {
    currentWidth = width;
    htmlRoot.setAttribute('data-width', width);
    localStorage.setItem('b2h_width', width);
    if (widthFullBtn && widthNormalBtn && widthNarrowBtn) {
      widthFullBtn.classList.toggle('active', width === 'full');
      widthNormalBtn.classList.toggle('active', width === 'normal');
      widthNarrowBtn.classList.toggle('active', width === 'narrow');
    }
  }

  function applyFont(font) {
    if (fontSelect && fontSelect.options) {
      var hasOpt = false;
      for (var i = 0; i < fontSelect.options.length; i++) {
        if (fontSelect.options[i].value === font) { hasOpt = true; break; }
      }
      if (!hasOpt) font = defaultExportedFont;
    }
    currentFont = font;
    htmlRoot.setAttribute('data-font', font);
    localStorage.setItem('b2h_font', font);
    if (fontSelect) fontSelect.value = font;
  }

  function compareValuesClient(a, b, isAsc) {
    if (a === b) return 0;
    var isEmptyA = a === undefined || a === null || a === '' || (Array.isArray(a) && a.length === 0);
    var isEmptyB = b === undefined || b === null || b === '' || (Array.isArray(b) && b.length === 0);
    if (isEmptyA && isEmptyB) return 0;
    if (isEmptyA) return isAsc ? 1 : -1;
    if (isEmptyB) return isAsc ? -1 : 1;

    var numA = Number(a);
    var numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB) && typeof a !== 'boolean' && typeof b !== 'boolean') {
      return isAsc ? numA - numB : numB - numA;
    }

    var strA = (Array.isArray(a) ? a.join(', ') : String(a)).toLowerCase();
    var strB = (Array.isArray(b) ? b.join(', ') : String(b)).toLowerCase();
    var res = strA.localeCompare(strB);
    return isAsc ? res : -res;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
