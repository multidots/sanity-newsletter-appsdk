/**
 * Design Preview Helper
 * 
 * Include this script in your site to enable real-time design preview in the Design Editor.
 * Add this to your site's layout or head:
 * 
 * <script src="/path/to/design-preview-helper.js"></script>
 * 
 * Or inline:
 * <script>
 *   // Paste the contents of this file here
 * </script>
 */

(function() {
  'use strict';

  // Listen for design update messages from the editor
  window.addEventListener('message', function(event) {
    // In production, you should verify event.origin for security
    // if (event.origin !== 'http://your-editor-domain.com') return;

    if (event.data && event.data.type === 'DESIGN_UPDATE') {
      const design = event.data.design;
      
      // Apply design changes temporarily (for preview only)
      applyDesignPreview(design);
    }
  });

  function applyDesignPreview(design) {
    // Get or create style element for design preview
    let styleElement = document.getElementById('design-preview-styles');
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'design-preview-styles';
      document.head.appendChild(styleElement);
    }

    // Build CSS with design variables
    const css = `
      :root {
        --brand-color: ${design.brandColor || '#15171a'};
        --heading-font: '${design.typographyHeading || 'Inter'}', sans-serif;
        --body-font: '${design.typographyBody || 'Inter'}', sans-serif;
      }

      /* Apply brand color */
      body {
        --primary-color: ${design.brandColor || '#15171a'};
      }

      a,
      .link,
      button.primary,
      .btn-primary,
      [style*="color"] {
        color: ${design.brandColor || '#15171a'} !important;
      }

      /* Apply heading font */
      h1, h2, h3, h4, h5, h6,
      .heading,
      .title {
        font-family: ${design.typographyHeading || 'Inter'}, sans-serif !important;
      }

      /* Apply body font */
      body,
      p,
      .body,
      .text {
        font-family: ${design.typographyBody || 'Inter'}, sans-serif !important;
      }

      /* Navigation layout */
      ${design.navigationLayout === 'logoMiddle' ? `
        .header, .nav {
          justify-content: center !important;
        }
      ` : ''}
      
      ${design.navigationLayout === 'stacked' ? `
        .header, .nav {
          flex-direction: column !important;
        }
      ` : ''}

      /* Color scheme */
      ${design.colorScheme === 'dark' ? `
        body {
          background-color: #1a1a1a !important;
          color: #ffffff !important;
        }
      ` : ''}

      /* Homepage featured posts */
      ${!design.homepageShowFeatured ? `
        .featured-posts {
          display: none !important;
        }
      ` : ''}

      ${design.homepageFeaturedTitle ? `
        .featured-title {
          content: "${design.homepageFeaturedTitle}" !important;
        }
      ` : ''}

      /* Post options */
      ${!design.postShowAuthor ? `
        .post-author {
          display: none !important;
        }
      ` : ''}

      ${!design.postShowRelatedPosts ? `
        .related-posts {
          display: none !important;
        }
      ` : ''}

      /* Load Google Fonts if needed */
      @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(design.typographyHeading || 'Inter')}:wght@400;500;600;700&family=${encodeURIComponent(design.typographyBody || 'Inter')}:wght@400;500;600&display=swap');
    `;

    styleElement.textContent = css;

    // Load Google Fonts dynamically
    loadGoogleFont(design.typographyHeading || 'Inter');
    if (design.typographyHeading !== design.typographyBody) {
      loadGoogleFont(design.typographyBody || 'Inter');
    }
  }

  function loadGoogleFont(fontFamily) {
    // Check if font is already loaded
    const fontId = 'design-font-' + fontFamily.replace(/\s+/g, '-').toLowerCase();
    if (document.getElementById(fontId)) return;

    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }

  // Initial design application (if design is passed via URL params)
  const urlParams = new URLSearchParams(window.location.search);
  const designParam = urlParams.get('design');
  if (designParam) {
    try {
      const design = JSON.parse(decodeURIComponent(designParam));
      applyDesignPreview(design);
    } catch (e) {
      console.error('Error parsing design from URL:', e);
    }
  }
})();

