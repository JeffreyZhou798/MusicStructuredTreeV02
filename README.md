# Music Structure Tree

AI-powered musical structure analysis and visualization for education.

## Overview

Music Structure Tree is a pure frontend web application that analyzes and visualizes musical compositions as hierarchical tree structures. The system uses AI-powered analysis (via TensorFlow.js) combined with music theory rules to identify and display musical units (motives, sub-phrases, phrases, periods, themes) in a tree format.

## Features

- **File Upload**: Support for MusicXML (.mxl, .musicxml) and MP3 files
- **AI Analysis**: Zero-shot analysis using pre-trained models (MusicVAE, Onsets and Frames)
- **Music Theory Rules**: Rule-guided validation for musically accurate results
- **Interactive Tree**: Expandable/collapsible tree visualization with color coding
- **Score Display**: Integrated score rendering with measure highlighting
- **Audio Playback**: Segment-based audio playback with synchronization
- **Manual Editing**: Tools for correcting AI analysis errors
- **Export Options**: JSON, interactive HTML, and annotated MusicXML export

## Technology Stack

- **Frontend**: Vue 3, Pinia (state management)
- **AI/ML**: TensorFlow.js, Magenta.js (@magenta/music)
- **Audio**: Tone.js, Web Audio API, Meyda
- **Score Rendering**: OpenSheetMusicDisplay (OSMD)
- **Build**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd music-structure-tree

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

### Deploy

The project is configured for deployment on Vercel or GitHub Pages.

## Usage

1. **Upload Files**: Drag and drop or click to upload MusicXML and/or MP3 files
2. **Analyze**: Click "Analyze Structure" to run the analysis pipeline
3. **Explore**: Navigate the structure tree, click nodes to view score and play audio
4. **Edit**: Use edit mode to correct any analysis errors
5. **Export**: Save your analysis as JSON, HTML, or annotated MusicXML

## Project Structure

```
src/
├── components/          # Vue components
│   ├── FileUpload.vue
│   ├── AnalysisView.vue
│   ├── StructureTree.vue
│   ├── TreeNode.vue
│   ├── ScoreRenderer.vue
│   ├── AudioPlayer.vue
│   └── ...
├── services/           # Core services
│   ├── AnalysisPipeline.js
│   ├── MusicXMLParser.js
│   ├── AudioParser.js
│   ├── FeatureExtractor.js
│   ├── RuleEngine.js
│   ├── ColorMapper.js
│   └── ...
├── stores/             # Pinia stores
│   └── appStore.js
├── utils/              # Utility functions
│   └── visualPatterns.js
└── styles/             # CSS styles
    └── main.css
```

## Music Theory Rules

The system implements five categories of music theory rules:

1. **Temporal Continuity**: Validates time adjacency between segments
2. **Phrase Closure**: Detects cadence patterns at segment endings
3. **Tonal Consistency**: Compares tonal centers between segments
4. **Development Relations**: Classifies relationships (repetition, sequence, variation, contrast)
5. **Level Legality**: Validates hierarchical level assignments

## Color Coding

- **Hue**: Determined by PCA projection of embeddings (similar segments → similar hues)
- **Lightness**: Determined by hierarchical level (higher levels → darker)
- **Saturation**: Determined by confidence score (high confidence → full saturation)

## License

MIT License

## Acknowledgments

- [Magenta.js](https://magenta.tensorflow.org/) for music AI models
- [TensorFlow.js](https://www.tensorflow.org/js) for browser-based ML
- [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/) for score rendering
