'use strict';

(function loadDiagramPreview(factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (typeof window.__diagramPreviewDispose === 'function') {
    window.__diagramPreviewDispose();
  }

  window.markdownDiagramPreview = api;

  const start = () => {
    const handle = api.activateDiagramPreview(document);
    window.__diagramPreviewDispose = handle.dispose;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(function createDiagramPreviewApi() {
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 0.2;
  const DIAGRAM_SELECTOR = [
    '.mermaid svg',
    '.language-mermaid svg',
    'svg[id^="mermaid-"]',
    'svg[aria-roledescription]',
    'svg[role="graphics-document"]',
    'img[src$=".svg" i]',
    'img[src*=".svg?" i]',
    'img[src*=".svg#" i]'
  ].join(',');

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function roundZoom(value) {
    return Math.round(value * 100) / 100;
  }

  function clampZoom(value) {
    const zoom = Number.isFinite(value) ? value : 1;
    return roundZoom(clamp(zoom, MIN_ZOOM, MAX_ZOOM));
  }

  function adjustZoom(currentZoom, direction) {
    if (direction === 'reset') {
      return 1;
    }

    if (direction !== 'increase' && direction !== 'decrease') {
      throw new Error(`Unsupported diagram zoom direction: ${direction}`);
    }

    const delta = direction === 'increase' ? ZOOM_STEP : -ZOOM_STEP;
    return clampZoom(currentZoom + delta);
  }

  function formatZoom(zoom) {
    return `${Math.round(clampZoom(zoom) * 100)}%`;
  }

  function activateDiagramPreview(doc) {
    if (!doc || !doc.body || typeof doc.querySelectorAll !== 'function') {
      return { dispose() {} };
    }

    const state = {
      disposed: false,
      observer: undefined,
      pending: undefined
    };

    const enhance = () => {
      state.pending = undefined;
      if (!state.disposed) {
        enhanceAllDiagrams(doc);
      }
    };

    const schedule = () => {
      if (state.disposed || state.pending) {
        return;
      }

      state.pending = getWindow(doc).setTimeout(enhance, 80);
    };

    enhance();

    const Observer = getWindow(doc).MutationObserver;
    if (typeof Observer === 'function') {
      state.observer = new Observer(schedule);
      state.observer.observe(doc.body, { childList: true, subtree: true });
    }

    return {
      dispose() {
        state.disposed = true;

        if (state.pending) {
          getWindow(doc).clearTimeout(state.pending);
        }

        if (state.observer) {
          state.observer.disconnect();
        }
      }
    };
  }

  function enhanceAllDiagrams(doc) {
    const candidates = Array.from(doc.querySelectorAll(DIAGRAM_SELECTOR));
    let enhancedCount = 0;

    for (const candidate of candidates) {
      if (enhanceDiagram(doc, candidate)) {
        enhancedCount += 1;
      }
    }

    return enhancedCount;
  }

  function enhanceDiagram(doc, element) {
    if (!element || !element.parentNode || isEnhanced(element)) {
      return false;
    }

    markEnhanced(element);

    const placeholder = doc.createTextNode('');
    element.parentNode.insertBefore(placeholder, element);

    const surface = createDiagramSurface(doc, element, {
      modal: false,
      onOpen: () => openDiagramModal(doc, element)
    });

    placeholder.parentNode.replaceChild(surface.shell, placeholder);
    surface.refresh();
    return true;
  }

  function createDiagramSurface(doc, content, options) {
    const shell = doc.createElement('div');
    shell.className = options.modal
      ? 'diagram-preview-shell diagram-preview-shell-modal'
      : 'diagram-preview-shell';

    const toolbar = doc.createElement('div');
    toolbar.className = 'diagram-preview-toolbar';
    toolbar.setAttribute('aria-label', 'Diagram controls');

    const zoomOutButton = createButton(doc, '-', 'Zoom out');
    const zoomLabel = doc.createElement('span');
    zoomLabel.className = 'diagram-preview-zoom-label';
    zoomLabel.setAttribute('aria-live', 'polite');
    const zoomInButton = createButton(doc, '+', 'Zoom in');
    const resetButton = createButton(doc, '1:1', 'Reset zoom');

    toolbar.append(zoomOutButton, zoomLabel, zoomInButton, resetButton);

    if (options.onOpen) {
      toolbar.append(createButton(doc, '[]', 'Open diagram viewer', options.onOpen));
    }

    if (options.onClose) {
      toolbar.append(createButton(doc, 'x', 'Close diagram viewer', options.onClose));
    }

    const viewport = doc.createElement('div');
    viewport.className = 'diagram-preview-viewport';

    const stage = doc.createElement('div');
    stage.className = 'diagram-preview-stage';

    prepareContent(content);
    stage.appendChild(content);
    viewport.appendChild(stage);
    shell.append(toolbar, viewport);

    const state = {
      doc,
      content,
      stage,
      viewport,
      zoomLabel,
      zoomInButton,
      zoomOutButton,
      zoom: 1,
      baseWidth: 0,
      baseHeight: 0,
      measureAttempts: 0
    };

    zoomOutButton.addEventListener('click', () => setZoom(state, adjustZoom(state.zoom, 'decrease')));
    zoomInButton.addEventListener('click', () => setZoom(state, adjustZoom(state.zoom, 'increase')));
    resetButton.addEventListener('click', () => {
      setZoom(state, 1);
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });

    attachPanHandlers(viewport);

    const surface = {
      shell,
      refresh: () => refreshSurface(state)
    };

    attachLoadRefresh(content, surface.refresh);

    return surface;
  }

  function createButton(doc, label, title, handler) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'diagram-preview-button';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);

    if (handler) {
      button.addEventListener('click', handler);
    }

    return button;
  }

  function setZoom(state, nextZoom) {
    const previousZoom = state.zoom;
    const viewportCenterX = state.viewport.scrollLeft + state.viewport.clientWidth / 2;
    const viewportCenterY = state.viewport.scrollTop + state.viewport.clientHeight / 2;

    state.zoom = clampZoom(nextZoom);
    refreshSurface(state);

    const ratio = state.zoom / previousZoom;
    state.viewport.scrollLeft = viewportCenterX * ratio - state.viewport.clientWidth / 2;
    state.viewport.scrollTop = viewportCenterY * ratio - state.viewport.clientHeight / 2;
  }

  function refreshSurface(state) {
    const size = measureBaseSize(state.content, state.zoom);

    if (size.width > 0) {
      state.baseWidth = size.width;
    }

    if (size.height > 0) {
      state.baseHeight = size.height;
    }

    state.stage.style.width = `${Math.max(1, state.baseWidth * state.zoom)}px`;
    state.stage.style.height = `${Math.max(1, state.baseHeight * state.zoom)}px`;
    state.content.style.transform = `scale(${state.zoom})`;
    state.zoomLabel.textContent = formatZoom(state.zoom);
    state.zoomOutButton.disabled = state.zoom <= MIN_ZOOM;
    state.zoomInButton.disabled = state.zoom >= MAX_ZOOM;

    if ((!state.baseWidth || !state.baseHeight) && state.measureAttempts < 5) {
      state.measureAttempts += 1;
      getWindow(state.doc).requestAnimationFrame(() => refreshSurface(state));
    }
  }

  function prepareContent(content) {
    content.classList.add('diagram-preview-content');
    content.style.transform = '';
    content.style.transformOrigin = '0 0';
  }

  function attachLoadRefresh(content, refresh) {
    const images = getTagName(content) === 'img'
      ? [content]
      : Array.from(content.querySelectorAll ? content.querySelectorAll('img') : []);

    for (const image of images) {
      if (!image.complete) {
        image.addEventListener('load', refresh, { once: true });
      }
    }
  }

  function measureBaseSize(element, currentZoom) {
    const rect = element.getBoundingClientRect();
    const rectWidth = rect.width > 0 ? rect.width / currentZoom : 0;
    const rectHeight = rect.height > 0 ? rect.height / currentZoom : 0;
    const svgSize = getSvgSize(element);

    return {
      width: Math.max(element.scrollWidth || 0, rectWidth, svgSize.width),
      height: Math.max(element.scrollHeight || 0, rectHeight, svgSize.height)
    };
  }

  function getSvgSize(element) {
    const svg = getTagName(element) === 'svg'
      ? element
      : element.querySelector && element.querySelector('svg');

    if (!svg) {
      return getImageSize(element);
    }

    const viewBox = parseViewBox(svg.getAttribute('viewBox'));
    const width = parseDimension(svg.getAttribute('width')) || viewBox.width;
    const height = parseDimension(svg.getAttribute('height')) || viewBox.height;

    return {
      width: width || 0,
      height: height || 0
    };
  }

  function getImageSize(element) {
    if (getTagName(element) !== 'img') {
      return { width: 0, height: 0 };
    }

    return {
      width: element.naturalWidth || 0,
      height: element.naturalHeight || 0
    };
  }

  function parseViewBox(value) {
    if (!value) {
      return { width: 0, height: 0 };
    }

    const parts = value.trim().split(/\s+/).map(Number);

    return {
      width: Number.isFinite(parts[2]) ? parts[2] : 0,
      height: Number.isFinite(parts[3]) ? parts[3] : 0
    };
  }

  function parseDimension(value) {
    if (!value || value.endsWith('%')) {
      return 0;
    }

    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function attachPanHandlers(viewport) {
    let active = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    viewport.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || isInteractiveTarget(event.target)) {
        return;
      }

      active = true;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = viewport.scrollLeft;
      startTop = viewport.scrollTop;
      viewport.classList.add('is-panning');
      viewport.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    viewport.addEventListener('pointermove', (event) => {
      if (!active) {
        return;
      }

      viewport.scrollLeft = startLeft - (event.clientX - startX);
      viewport.scrollTop = startTop - (event.clientY - startY);
    });

    const stop = (event) => {
      if (!active) {
        return;
      }

      active = false;
      viewport.classList.remove('is-panning');

      if (event.pointerId !== undefined && viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
    };

    viewport.addEventListener('pointerup', stop);
    viewport.addEventListener('pointercancel', stop);
    viewport.addEventListener('pointerleave', stop);
  }

  function openDiagramModal(doc, sourceContent) {
    closeExistingModal(doc);

    const modal = doc.createElement('div');
    modal.className = 'diagram-preview-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Diagram viewer');

    const backdrop = doc.createElement('div');
    backdrop.className = 'diagram-preview-modal-backdrop';

    const panel = doc.createElement('div');
    panel.className = 'diagram-preview-modal-panel';

    const close = () => {
      doc.removeEventListener('keydown', onKeyDown);
      modal.remove();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    const clone = sourceContent.cloneNode(true);
    resetClonedContent(clone);

    const surface = createDiagramSurface(doc, clone, {
      modal: true,
      onClose: close
    });

    panel.appendChild(surface.shell);
    modal.append(backdrop, panel);
    doc.body.appendChild(modal);
    doc.addEventListener('keydown', onKeyDown);
    backdrop.addEventListener('click', close);
    modal.__diagramPreviewClose = close;
    surface.refresh();
  }

  function closeExistingModal(doc) {
    const modal = doc.querySelector('.diagram-preview-modal');
    if (modal) {
      if (typeof modal.__diagramPreviewClose === 'function') {
        modal.__diagramPreviewClose();
      } else {
        modal.remove();
      }
    }
  }

  function resetClonedContent(element) {
    unmarkEnhanced(element);
    element.classList.remove('diagram-preview-content');
    element.style.transform = '';

    for (const child of Array.from(element.querySelectorAll('[data-diagram-preview-enhanced], .diagram-preview-content'))) {
      unmarkEnhanced(child);
      child.classList.remove('diagram-preview-content');
      child.style.transform = '';
    }
  }

  function isEnhanced(element) {
    return element.getAttribute('data-diagram-preview-enhanced') === 'true' ||
      Boolean(element.closest && element.closest('.diagram-preview-shell, .diagram-preview-modal'));
  }

  function markEnhanced(element) {
    element.setAttribute('data-diagram-preview-enhanced', 'true');
  }

  function unmarkEnhanced(element) {
    element.removeAttribute('data-diagram-preview-enhanced');
  }

  function isInteractiveTarget(target) {
    return Boolean(target && target.closest && target.closest('a, button, input, textarea, select'));
  }

  function getTagName(element) {
    return element.tagName ? element.tagName.toLowerCase() : '';
  }

  function getWindow(doc) {
    return doc.defaultView || window;
  }

  return {
    adjustZoom,
    enhanceAllDiagrams,
    formatZoom,
    activateDiagramPreview
  };
});
