/**
 * Example Composition Manager - Manages pre-loaded example compositions
 */

export class ExampleManager {
  constructor() {
    this.examples = [
      {
        id: 'mozart-k545',
        title: 'Mozart Piano K.545 First Movement',
        composer: 'W.A. Mozart',
        form: 'Sonata Form',
        description: 'Piano Sonata No. 16 in C major, K. 545 - First Movement',
        difficulty: 'beginner',
        duration: 180,
        icon: '🎹',
        files: {
          musicXML: 'examples/sonata-no-16-1st-movement-k-545.mxl',
          mp3: 'examples/sonata-no-16-1st-movement-k-545.mp3'
        }
      },
      {
        id: 'mozart-k311',
        title: 'Mozart Piano Sonata No. 9 First Movement',
        composer: 'W.A. Mozart',
        form: 'Sonata Form',
        description: 'Piano Sonata in D major, K. 311 - I. Allegro con spirito',
        difficulty: 'intermediate',
        duration: 300,
        icon: '🎹',
        files: {
          musicXML: 'examples/Mozart_Sonata_in_D_K._311_-_I._Allegro_con_spirito.mxl',
          mp3: 'examples/Sonata_No._9_1st_Movement_K._311.mp3'
        }
      },
      {
        id: 'mozart-violin-k216',
        title: 'Mozart Violin Concerto No. 3 First Movement',
        composer: 'W.A. Mozart',
        form: 'Concerto Form',
        description: 'Violin Concerto No. 3 in G major, K. 216 - I. Allegro',
        difficulty: 'intermediate',
        duration: 480,
        icon: '🎻',
        files: {
          musicXML: 'examples/violin-concerto-no3-in-g-major-k216-i-allegro-wolfgang-amadeus-mozart-wo-cadenza.mxl',
          mp3: 'examples/violin-concerto-no3-in-g-major-k216-i-allegro-wolfgang-amadeus-mozart-wo-cadenza.mp3'
        }
      },
      {
        id: 'haydn-cello',
        title: 'Haydn Cello Concerto in C First Movement',
        composer: 'J. Haydn',
        form: 'Concerto Form',
        description: 'Cello Concerto No. 1 in C major, Hob.VIIb:1 - First Movement',
        difficulty: 'advanced',
        duration: 420,
        icon: '🎻',
        files: {
          musicXML: 'examples/cello-concerto-no1-in-c-major-hobviib1-joseph-haydn.mxl',
          mp3: 'examples/cello-concerto-no1-in-c-major-hobviib1-joseph-haydn.mp3'
        }
      }
    ];
  }

  /**
   * Get list of available examples
   * @returns {ExampleComposition[]}
   */
  getExamples() {
    return this.examples;
  }

  /**
   * Get example metadata
   * @param {string} exampleId 
   * @returns {ExampleComposition|null}
   */
  getExampleMetadata(exampleId) {
    return this.examples.find(e => e.id === exampleId) || null;
  }

  /**
   * Load example files
   * @param {string} exampleId 
   * @returns {Promise<{musicXMLFile: File, mp3File: File, metadata: object}>}
   */
  async loadExampleFiles(exampleId) {
    const metadata = this.getExampleMetadata(exampleId);
    if (!metadata) {
      throw new Error(`Example ${exampleId} not found`);
    }

    if (!metadata.files) {
      throw new Error(`Example ${exampleId} has no files configured`);
    }

    try {
      console.log('Loading example files:', metadata.files);
      
      // Fetch MusicXML file
      const musicXMLUrl = new URL(metadata.files.musicXML, window.location.origin).href;
      console.log('Fetching MusicXML from:', musicXMLUrl);
      
      const musicXMLResponse = await fetch(musicXMLUrl);
      if (!musicXMLResponse.ok) {
        throw new Error(`Failed to load MusicXML: ${musicXMLResponse.status} ${musicXMLResponse.statusText}`);
      }
      const musicXMLBlob = await musicXMLResponse.blob();
      const musicXMLFileName = metadata.files.musicXML.split('/').pop();
      const musicXMLFile = new File(
        [musicXMLBlob], 
        musicXMLFileName,
        { type: musicXMLFileName.endsWith('.mxl') ? 'application/vnd.recordare.musicxml+xml' : 'application/xml' }
      );

      // Fetch MP3 file
      const mp3Url = new URL(metadata.files.mp3, window.location.origin).href;
      console.log('Fetching MP3 from:', mp3Url);
      
      const mp3Response = await fetch(mp3Url);
      if (!mp3Response.ok) {
        throw new Error(`Failed to load MP3: ${mp3Response.status} ${mp3Response.statusText}`);
      }
      const mp3Blob = await mp3Response.blob();
      const mp3FileName = metadata.files.mp3.split('/').pop();
      const mp3File = new File(
        [mp3Blob],
        mp3FileName,
        { type: 'audio/mpeg' }
      );

      console.log('Files loaded successfully:', { musicXMLFile, mp3File });

      return {
        musicXMLFile,
        mp3File,
        metadata
      };
    } catch (error) {
      console.error('Error loading example files:', error);
      throw error;
    }
  }
}

// Singleton instance
export const exampleManager = new ExampleManager();
