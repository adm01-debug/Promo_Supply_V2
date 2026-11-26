import React from 'react';
import type { AccessibilitySettings } from './accessibilityHelpers';

export const AccessibilityStyles = React.forwardRef<HTMLStyleElement, { settings: AccessibilitySettings }>(({ settings }, _ref) => {
  const styles = `
    ${settings.highContrast ? `
      .high-contrast {
        --background: 0 0% 0%;
        --foreground: 0 0% 100%;
        --card: 0 0% 5%;
        --card-foreground: 0 0% 100%;
        --primary: 60 100% 50%;
        --primary-foreground: 0 0% 0%;
      }
      .high-contrast * {
        border-color: white !important;
      }
    ` : ''}
    
    ${settings.reducedMotion ? `
      .reduced-motion *,
      .reduced-motion *::before,
      .reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    ` : ''}
    
    ${settings.largePointer ? `
      .large-pointer * {
        cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='black' stroke='white' stroke-width='1'%3E%3Cpath d='M5.65 2.1L19.85 12.6C20.45 13.05 20.2 14 19.45 14.1L12.35 15L9.25 21.5C8.95 22.1 8.05 22.05 7.8 21.4L2.25 3.65C2 2.95 2.75 2.35 3.4 2.65L5.65 2.1Z'/%3E%3C/svg%3E") 0 0, auto !important;
      }
    ` : ''}
    
    ${settings.focusHighlight ? `
      .focus-highlight *:focus {
        outline: 3px solid hsl(var(--primary)) !important;
        outline-offset: 2px !important;
      }
      .focus-highlight *:focus:not(:focus-visible) {
        outline: none !important;
      }
      .focus-highlight *:focus-visible {
        outline: 3px solid hsl(var(--primary)) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 6px hsl(var(--primary) / 0.2) !important;
      }
    ` : ''}
    
    ${settings.dyslexiaFont ? `
      .dyslexia-font * {
        font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif !important;
        letter-spacing: 0.05em !important;
        word-spacing: 0.1em !important;
      }
    ` : ''}
    
    ${settings.colorBlindMode !== 'none' ? `
      [data-color-blind="protanopia"] {
        filter: url('#protanopia-filter');
      }
      [data-color-blind="deuteranopia"] {
        filter: url('#deuteranopia-filter');
      }
      [data-color-blind="tritanopia"] {
        filter: url('#tritanopia-filter');
      }
    ` : ''}
    
    body {
      line-height: var(--line-height, 1.5);
      letter-spacing: var(--letter-spacing, 0);
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/>
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0"/>
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0"/>
          </filter>
        </defs>
      </svg>
    </>
  );
});
AccessibilityStyles.displayName = 'AccessibilityStyles';
