/**
 * Visual Pattern Generator - Creates SVG patterns for tree nodes
 */

/**
 * Generate SVG pattern for a node based on its type and properties
 * @param {object} node - Tree node
 * @returns {string} SVG markup
 */
export function generateNodePattern(node) {
  const color = node.color || '#4a90e2';
  const confidence = node.confidence || 0.5;
  const level = node.level || node.type || 'motive';

  switch (level) {
    case 'motive':
      return createMotivePattern(color, confidence);
    case 'subphrase':
      return createSubphrasePattern(color, confidence, node.children?.length || 2);
    case 'phrase':
      return createPhrasePattern(color, confidence, node.children?.length || 3);
    case 'period':
      return createPeriodPattern(color, confidence, node.children?.length || 2);
    case 'theme':
    case 'section':
      return createThemePattern(color, confidence, node.children?.length || 4);
    case 'root':
    case 'composition':
      return createCompositionPattern(color, confidence);
    default:
      return createDefaultPattern(color, confidence);
  }
}

/**
 * Create motive pattern - single colored circle
 */
function createMotivePattern(color, confidence) {
  const opacity = getOpacity(confidence);
  const strokeStyle = getStrokeStyle(confidence);
  
  return `<circle cx="12" cy="12" r="8" fill="${color}" opacity="${opacity}" 
    stroke="#333" stroke-width="${strokeStyle.width}" ${strokeStyle.dasharray}/>`;
}

/**
 * Create sub-phrase pattern - two circles
 */
function createSubphrasePattern(color, confidence, childCount) {
  const opacity = getOpacity(confidence);
  const strokeStyle = getStrokeStyle(confidence);
  const count = Math.min(childCount, 2);
  
  let circles = '';
  for (let i = 0; i < count; i++) {
    const cx = 8 + i * 14;
    circles += `<circle cx="${cx}" cy="12" r="6" fill="${color}" opacity="${opacity}" 
      stroke="#333" stroke-width="${strokeStyle.width}" ${strokeStyle.dasharray}/>`;
  }
  
  return circles;
}

/**
 * Create phrase pattern - three circles in a row
 */
function createPhrasePattern(color, confidence, childCount) {
  const opacity = getOpacity(confidence);
  const strokeStyle = getStrokeStyle(confidence);
  const count = Math.min(childCount, 4);
  
  let circles = '';
  for (let i = 0; i < count; i++) {
    const cx = 8 + i * 12;
    circles += `<circle cx="${cx}" cy="12" r="5" fill="${color}" opacity="${opacity}" 
      stroke="#333" stroke-width="${strokeStyle.width}" ${strokeStyle.dasharray}/>`;
  }
  
  return circles;
}

/**
 * Create period pattern - two rows of circles
 */
function createPeriodPattern(color, confidence, childCount) {
  const opacity = getOpacity(confidence);
  const strokeStyle = getStrokeStyle(confidence);
  const rows = Math.min(Math.ceil(childCount / 3), 2);
  
  let circles = '';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = 8 + col * 12;
      const cy = 8 + row * 12;
      circles += `<circle cx="${cx}" cy="${cy}" r="4" fill="${color}" opacity="${opacity}" 
        stroke="#333" stroke-width="${strokeStyle.width}" ${strokeStyle.dasharray}/>`;
    }
  }
  
  return circles;
}

/**
 * Create theme pattern - complex multi-row pattern
 */
function createThemePattern(color, confidence, childCount) {
  const opacity = getOpacity(confidence);
  const strokeStyle = getStrokeStyle(confidence);
  const rows = Math.min(Math.ceil(childCount / 4), 3);
  
  let circles = '';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = 6 + col * 10;
      const cy = 6 + row * 10;
      circles += `<circle cx="${cx}" cy="${cy}" r="3" fill="${color}" opacity="${opacity}" 
        stroke="#333" stroke-width="${strokeStyle.width}" ${strokeStyle.dasharray}/>`;
    }
  }
  
  return circles;
}

/**
 * Create composition pattern - large circle with inner pattern
 */
function createCompositionPattern(color, confidence) {
  const opacity = getOpacity(confidence);
  
  return `
    <circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="2" opacity="${opacity}"/>
    <circle cx="12" cy="12" r="6" fill="${color}" opacity="${opacity * 0.5}"/>
    <circle cx="12" cy="12" r="3" fill="${color}" opacity="${opacity}"/>
  `;
}

/**
 * Create default pattern
 */
function createDefaultPattern(color, confidence) {
  const opacity = getOpacity(confidence);
  return `<circle cx="12" cy="12" r="8" fill="${color}" opacity="${opacity}"/>`;
}

/**
 * Get opacity based on confidence
 */
function getOpacity(confidence) {
  if (confidence >= 0.8) return 1.0;
  if (confidence >= 0.6) return 0.8;
  if (confidence >= 0.4) return 0.6;
  return 0.4;
}

/**
 * Get stroke style based on confidence
 */
function getStrokeStyle(confidence) {
  if (confidence >= 0.8) {
    return { width: 2, dasharray: '' };
  }
  if (confidence >= 0.6) {
    return { width: 1.5, dasharray: '' };
  }
  return { width: 1, dasharray: 'stroke-dasharray="2,2"' };
}

/**
 * Generate relationship indicator
 * @param {string} relationType 
 * @returns {string}
 */
export function generateRelationshipIndicator(relationType) {
  const colors = {
    'repetition': '#4a90e2',
    'sequence': '#17a2b8',
    'variation': '#28a745',
    'contrast': '#dc3545',
    'recurrence': '#6f42c1'
  };

  const color = colors[relationType] || '#666';
  
  return `<line x1="0" y1="12" x2="24" y2="12" stroke="${color}" stroke-width="2"/>`;
}

/**
 * Generate confidence badge
 * @param {number} confidence 
 * @returns {string}
 */
export function generateConfidenceBadge(confidence) {
  const percent = Math.round(confidence * 100);
  let bgColor, textColor;

  if (confidence >= 0.8) {
    bgColor = 'rgba(40, 167, 69, 0.1)';
    textColor = '#28a745';
  } else if (confidence >= 0.6) {
    bgColor = 'rgba(255, 193, 7, 0.1)';
    textColor = '#b38600';
  } else {
    bgColor = 'rgba(220, 53, 69, 0.1)';
    textColor = '#dc3545';
  }

  return `
    <rect x="0" y="0" width="36" height="18" rx="4" fill="${bgColor}"/>
    <text x="18" y="13" text-anchor="middle" font-size="10" fill="${textColor}">${percent}%</text>
  `;
}
