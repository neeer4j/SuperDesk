import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Runtime injection: add an extra high-specificity stylesheet at startup so
// these debug styles take effect even if the browser served a cached build
// or an earlier service-workered CSS file is active. We'll remove this after
// we confirm the panels render correctly.
try {
  const debugStyle = document.createElement('style');
  debugStyle.setAttribute('data-debug-styles', 'superdesk-panels');
  debugStyle.innerHTML = `
    .superdesk-left-panel{background-color:#ffffff!important;border:6px solid red!important}
    .superdesk-right-panel{background-color:#613da9!important;border:6px solid lime!important}
    #root > * { position: relative; }
  `;
  document.head.appendChild(debugStyle);
} catch (e) {
  // ignore in non-browser contexts
}

// MutationObserver to neutralize Emotion/runtime-injected backgrounds that
// are overriding our panel colors. This sets inline styles with !important
// which takes precedence over later-inserted style tags.
try {
  const applyInlineNeutral = (el) => {
    try {
      // Only adjust elements that have generated emotion-like classes (css-...)
      if (!el || !el.className) return;
      const classList = Array.from(el.classList || []);
      const hasGenerated = classList.some(c => /^css-/.test(c));
      if (!hasGenerated) return;

      // If this element sits inside our left panel, force transparent so
      // the .superdesk-left-panel background shows through.
      if (el.closest && el.closest('.superdesk-left-panel')) {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
      }

      // If the generated element is the top-level page wrapper that sets a
      // fullscreen dark background (we saw .css-19vhk6s), neutralize it so
      // our body/app backgrounds are visible.
      if (classList.includes('css-19vhk6s') || classList.includes('css-wqbxsj')) {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
      }
    } catch (e) {
      // ignore per-element errors
    }
  };

  const scanExisting = () => {
    document.querySelectorAll('[class]').forEach(applyInlineNeutral);

    // Aggressively apply the intended panel backgrounds to known generated
    // classes and to our panel classes. This uses inline !important so it
    // overrides any runtime-inserted styles.
    try {
      const leftSelectors = ['.superdesk-left-panel', '.css-wqbxsj'];
      const rightSelectors = ['.superdesk-right-panel', '.css-19vhk6s'];

      leftSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          // Force inline white background for any element that looks like the left panel
          el.style.setProperty('background-color', '#ffffff', 'important');
          el.style.setProperty('background', '#ffffff', 'important');
          el.style.setProperty('border', '6px solid red', 'important');
        });
      });

      rightSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.style.setProperty('background-color', '#613da9', 'important');
          el.style.setProperty('background', '#613da9', 'important');
          el.style.setProperty('border', '6px solid lime', 'important');
        });
      });

      // Extra aggressive pass: directly target the exact generated classes we observed
      document.querySelectorAll('.css-wqbxsj').forEach(el => {
        el.style.setProperty('background-color', '#ffffff', 'important');
        el.style.setProperty('background', '#ffffff', 'important');
        el.style.setProperty('border', '6px solid red', 'important');
      });
      document.querySelectorAll('.css-19vhk6s').forEach(el => {
        el.style.setProperty('background-color', '#613da9', 'important');
        el.style.setProperty('background', '#613da9', 'important');
        el.style.setProperty('border', '6px solid lime', 'important');
      });
    } catch (e) {
      // ignore
    }
  };

  window.addEventListener('load', () => {
    scanExisting();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target) {
          applyInlineNeutral(m.target);
        }
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === 1) applyInlineNeutral(node);
            // also scan children
            if (node.querySelectorAll) node.querySelectorAll('[class]').forEach(applyInlineNeutral);
          });
        }
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  });
} catch (e) {
  // ignore if DOM isn't available
}

// Immediate visual overlay: insert a split background element behind all app
// content to guarantee a 50/50 white / purple split while we finish a clean
// fix. This element uses pointer-events:none so it doesn't interfere with the UI.
try {
  window.addEventListener('load', () => {
    if (!document.getElementById('superdesk-split-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'superdesk-split-overlay';
      overlay.style.cssText = `position:fixed;inset:0;z-index:0;pointer-events:none;background:linear-gradient(90deg,#ffffff 50%,#613da9 50%);`;
      document.body.insertBefore(overlay, document.body.firstChild);

      // ensure app root sits above the overlay
      const root = document.getElementById('root');
      if (root) root.style.zIndex = 1;
    }
  });
} catch (e) {
  // ignore
}

// Extra pass: remove inline background styles that match the dark colors we
// observed. Some React components set inline styles which are hard to
// override from CSS; removing them ensures the gradient background shows.
try {
  window.addEventListener('load', () => {
    const darkStyles = ['rgb(9, 9, 11)', 'rgb(10, 0, 111)', '#09090b'];
    const matches = Array.from(document.querySelectorAll('[style]'));
    matches.forEach(el => {
      try {
        const s = el.getAttribute('style');
        if (!s) return;
        for (const dark of darkStyles) {
          if (s.includes(dark)) {
            // remove just the background declarations
            const newStyle = s.replace(/background[^;]+;?/gi, '').replace(/background-color[^;]+;?/gi, '');
            el.setAttribute('style', newStyle);
            break;
          }
        }
      } catch (e) {}
    });
  });
} catch (e) {}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);