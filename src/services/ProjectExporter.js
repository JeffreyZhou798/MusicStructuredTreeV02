/**
 * Project Exporter - Handles exporting analysis results in various formats
 */
export class ProjectExporter {
  constructor(store) {
    this.store = store;
  }

  /**
   * Export project as JSON
   */
  async exportJSON() {
    const projectState = this.store.getProjectState();
    
    // Convert Map to object for JSON serialization
    const exportData = {
      ...projectState,
      embeddings: Object.fromEntries(
        Array.from(projectState.embeddings || new Map()).map(([k, v]) => [k, Array.from(v)])
      )
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    
    this.downloadFile(blob, 'music-structure-analysis.json');
  }

  /**
   * Export as interactive HTML
   */
  async exportHTML() {
    const projectState = this.store.getProjectState();
    
    const html = this.generateInteractiveHTML(projectState);
    const blob = new Blob([html], { type: 'text/html' });
    
    this.downloadFile(blob, 'music-structure-tree.html');
  }

  /**
   * Export as annotated MusicXML
   */
  async exportMusicXML() {
    const parsedScore = this.store.parsedScore;
    const structureTree = this.store.structureTree;

    if (!parsedScore?.xmlContent) {
      throw new Error('No MusicXML content available');
    }

    const annotatedXML = this.addStructureAnnotations(
      parsedScore.xmlContent,
      structureTree
    );

    const blob = new Blob([annotatedXML], { type: 'application/xml' });
    this.downloadFile(blob, 'music-structure-annotated.musicxml');
  }

  /**
   * Generate interactive HTML file
   * @param {object} projectState 
   * @returns {string}
   */
  generateInteractiveHTML(projectState) {
    const treeJSON = JSON.stringify(projectState.structureTree, null, 2);
    const colorSchemeJSON = JSON.stringify(
      projectState.colorScheme ? {
        nodeColors: Object.fromEntries(projectState.colorScheme.nodeColors || new Map()),
        levelLightness: projectState.colorScheme.levelLightness
      } : {},
      null, 2
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Music Structure Tree - ${projectState.composition?.title || 'Analysis'}</title>
  <style>
    :root {
      --primary-color: #4a90e2;
      --primary-dark: #2c5aa0;
      --text-color: #333;
      --text-light: #666;
      --bg-color: #f8f9fa;
      --border-color: #dee2e6;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-color);
      color: var(--text-color);
      line-height: 1.5;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header {
      background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
      color: white;
      padding: 2rem;
      text-align: center;
    }
    
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    
    .subtitle { opacity: 0.9; }
    
    .tree-container {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .tree-node {
      margin-left: 20px;
      margin-bottom: 4px;
    }
    
    .node-content {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .node-content:hover { background: rgba(74, 144, 226, 0.1); }
    
    .node-pattern {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .node-label { flex: 1; }
    .node-type { font-weight: 600; }
    .node-measures { color: var(--text-light); font-size: 0.9rem; margin-left: 8px; }
    
    .confidence {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(40, 167, 69, 0.1);
      color: #28a745;
    }
    
    .toggle-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.6rem;
      width: 20px;
      color: var(--text-light);
    }
    
    .children { display: none; border-left: 1px dashed var(--border-color); margin-left: 10px; padding-left: 10px; }
    .children.expanded { display: block; }
    
    .legend {
      margin-top: 2rem;
      padding: 1rem;
      background: white;
      border-radius: 8px;
    }
    
    .legend h3 { margin-bottom: 1rem; }
    .legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .legend-color { width: 20px; height: 20px; border-radius: 4px; }
    
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-light);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <header>
    <h1>🎵 Music Structure Tree</h1>
    <p class="subtitle">${projectState.composition?.title || 'Musical Structure Analysis'}</p>
  </header>
  
  <div class="container">
    <div class="tree-container">
      <h2>Structure Tree</h2>
      <div id="tree"></div>
    </div>
    
    <div class="legend">
      <h3>Legend</h3>
      <div class="legend-item">
        <div class="legend-color" style="background: hsl(210, 70%, 70%);"></div>
        <span>Motive (smallest unit)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: hsl(210, 70%, 60%);"></div>
        <span>Sub-phrase</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: hsl(210, 70%, 50%);"></div>
        <span>Phrase</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: hsl(210, 70%, 40%);"></div>
        <span>Period</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: hsl(210, 70%, 35%);"></div>
        <span>Theme</span>
      </div>
    </div>
  </div>
  
  <footer>
    <p>Generated by Music Structure Tree</p>
    <p>Exported: ${new Date().toLocaleString()}</p>
  </footer>
  
  <script>
    const treeData = ${treeJSON};
    const colorScheme = ${colorSchemeJSON};
    
    function formatType(type) {
      const map = {
        'motive': 'Motive',
        'subphrase': 'Sub-phrase',
        'phrase': 'Phrase',
        'period': 'Period',
        'theme': 'Theme',
        'section': 'Section',
        'root': 'Composition'
      };
      return map[type] || type;
    }
    
    function renderNode(node, container) {
      const div = document.createElement('div');
      div.className = 'tree-node';
      
      const hasChildren = node.children && node.children.length > 0;
      
      const content = document.createElement('div');
      content.className = 'node-content';
      
      if (hasChildren) {
        const toggle = document.createElement('button');
        toggle.className = 'toggle-btn';
        toggle.textContent = '▶';
        toggle.onclick = () => {
          const children = div.querySelector('.children');
          const expanded = children.classList.toggle('expanded');
          toggle.textContent = expanded ? '▼' : '▶';
        };
        content.appendChild(toggle);
      } else {
        const spacer = document.createElement('span');
        spacer.style.width = '20px';
        spacer.style.display = 'inline-block';
        content.appendChild(spacer);
      }
      
      const pattern = document.createElement('div');
      pattern.className = 'node-pattern';
      pattern.style.background = node.color || colorScheme.nodeColors?.[node.id] || '#4a90e2';
      content.appendChild(pattern);
      
      const label = document.createElement('div');
      label.className = 'node-label';
      label.innerHTML = '<span class="node-type">' + formatType(node.type || node.level) + '</span>' +
        '<span class="node-measures">m. ' + node.startBar + '-' + node.endBar + '</span>';
      content.appendChild(label);
      
      if (node.confidence) {
        const conf = document.createElement('span');
        conf.className = 'confidence';
        conf.textContent = Math.round(node.confidence * 100) + '%';
        content.appendChild(conf);
      }
      
      div.appendChild(content);
      
      if (hasChildren) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'children';
        node.children.forEach(child => renderNode(child, childrenDiv));
        div.appendChild(childrenDiv);
      }
      
      container.appendChild(div);
    }
    
    document.addEventListener('DOMContentLoaded', () => {
      const treeContainer = document.getElementById('tree');
      if (treeData) {
        renderNode(treeData, treeContainer);
        // Expand first level
        const firstChildren = treeContainer.querySelector('.children');
        if (firstChildren) {
          firstChildren.classList.add('expanded');
          const toggle = treeContainer.querySelector('.toggle-btn');
          if (toggle) toggle.textContent = '▼';
        }
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Add structure annotations to MusicXML
   * @param {string} xmlContent 
   * @param {object} structureTree 
   * @returns {string}
   */
  addStructureAnnotations(xmlContent, structureTree) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // Collect all nodes with their measure ranges
    const annotations = this.collectAnnotations(structureTree);

    // Add annotations to measures
    const measures = doc.querySelectorAll('measure');
    
    annotations.forEach(annotation => {
      const measureNum = annotation.startBar;
      const measure = Array.from(measures).find(m => 
        parseInt(m.getAttribute('number')) === measureNum
      );

      if (measure) {
        // Add direction element with annotation
        const direction = doc.createElement('direction');
        direction.setAttribute('placement', 'above');
        
        const directionType = doc.createElement('direction-type');
        const rehearsal = doc.createElement('rehearsal');
        rehearsal.textContent = `[${annotation.type}: m.${annotation.startBar}-${annotation.endBar}]`;
        
        directionType.appendChild(rehearsal);
        direction.appendChild(directionType);
        
        // Insert at beginning of measure
        measure.insertBefore(direction, measure.firstChild);
      }
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  /**
   * Collect annotations from tree
   * @param {object} node 
   * @param {array} annotations 
   * @returns {array}
   */
  collectAnnotations(node, annotations = []) {
    if (node.type !== 'root' && node.level !== 'composition') {
      annotations.push({
        type: node.level || node.type,
        startBar: node.startBar,
        endBar: node.endBar,
        confidence: node.confidence
      });
    }

    if (node.children) {
      node.children.forEach(child => this.collectAnnotations(child, annotations));
    }

    return annotations;
  }

  /**
   * Download file
   * @param {Blob} blob 
   * @param {string} filename 
   */
  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
