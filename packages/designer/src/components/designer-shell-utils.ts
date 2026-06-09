const SIDEBAR_CSS = `\
[class*="DrawerItem-draggable"]{padding-left:0!important;padding-top:8px!important;padding-bottom:8px!important;min-height:42px!important}\
.ss-drawer-icon{transition:color 100ms ease-in}\
[class*="DrawerItem"]:hover .ss-drawer-icon{color:var(--puck-color-azure-04,#3b82f6)}\
[data-supersubset-scroll-inline="true"]{-ms-overflow-style:none;scrollbar-width:none}\
[data-supersubset-scroll-inline="true"]::-webkit-scrollbar{display:none;width:0;height:0}\
@media (min-width:638px){\
[data-supersubset-designer-root] [class*="PuckLayout-inner"]{--puck-frame-width:minmax(0,1fr)}\
[data-supersubset-designer-root] [class*="PuckCanvas"]{min-width:0}\
[data-supersubset-designer-root] [class*="PuckHeader-inner"]{grid-template-columns:auto auto 1fr}\
[data-supersubset-designer-root] [class*="PuckHeader-tools"]{min-width:0}\
}\
[data-supersubset-designer-root][data-supersubset-inline-preview="true"] [class*="PuckCanvas-root"],\
[data-supersubset-designer-root][data-supersubset-inline-preview="true"] #puck-canvas-root{position:relative!important;top:auto!important;bottom:auto!important;transform:none!important}\
[data-supersubset-designer-root][data-supersubset-inline-preview="true"] [class*="PuckLayout-inner"]{min-height:0!important}\
[data-supersubset-designer-root][data-supersubset-inline-preview="true"] [class*="PuckCanvas"]{min-height:0!important}\
@media (min-width:638px) and (max-width:1024px){[data-supersubset-designer-root] [class*="PuckLayout-inner"]{--puck-user-left-side-bar-width:212px;--puck-user-right-side-bar-width:168px;--puck-frame-width:minmax(320px,1fr)}[data-testid="designer-header-controls"]{gap:8px!important;row-gap:6px!important}[data-testid="designer-page-controls"]{flex:1 0 100%!important}[data-supersubset-header-metadata="true"]{flex:0 1 auto!important;flex-wrap:nowrap!important;align-items:center!important}[data-supersubset-header-metadata="true"] label{gap:0!important}[data-supersubset-header-metadata="true"] label>span{display:none!important}[data-testid="designer-page-title-input"]{width:150px!important}[data-testid="designer-dashboard-title-input"]{width:180px!important}[data-supersubset-built-in-actions="true"]{flex:0 0 auto!important}[data-testid="designer-host-actions"]{flex:1 1 220px!important;justify-content:flex-start!important;min-width:0!important;overflow:hidden!important}}\
`;

let sidebarStyleInjected = false;
let nextDesignerA11yInstanceId = 1;

export function injectDesignerSidebarStyles() {
  if (sidebarStyleInjected || typeof document === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('data-supersubset', 'sidebar');
  style.textContent = SIDEBAR_CSS;
  document.head.appendChild(style);
  sidebarStyleInjected = true;
}

export function createDesignerA11yInstanceId(): number {
  return nextDesignerA11yInstanceId++;
}

export function decorateDesignerShell(root: ParentNode, instanceId: number) {
  decorateViewportZoomSelects(root, instanceId);
  decoratePreviewIframes(root);
}

function decorateViewportZoomSelects(root: ParentNode, instanceId: number) {
  const zoomSelects = root.querySelectorAll<HTMLSelectElement>(
    'select[class*="ViewportControls-zoomSelect"]',
  );

  zoomSelects.forEach((select, index) => {
    if (!select.id) {
      select.id = `ss-puck-viewport-zoom-${instanceId}-${index}`;
    }

    if (!select.name) {
      select.name = `viewportZoom-${instanceId}-${index}`;
    }

    if (!select.getAttribute('aria-label')) {
      select.setAttribute('aria-label', 'Viewport zoom');
    }
  });
}

function decoratePreviewIframes(root: ParentNode) {
  const previewIframes = root.querySelectorAll<HTMLIFrameElement>('iframe');

  previewIframes.forEach((iframe) => {
    if (!iframe.getAttribute('title')) {
      iframe.setAttribute('title', 'Supersubset designer preview');
    }
  });
}
