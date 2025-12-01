/**
 * File validation service for MusicXML and MP3 files
 */
export class FileValidator {
  static ALLOWED_TYPES = {
    musicxml: [
      'application/vnd.recordare.musicxml+xml',
      'application/xml',
      'text/xml',
      'application/vnd.recordare.musicxml'
    ],
    mp3: ['audio/mpeg', 'audio/mp3']
  };

  static MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  static MALICIOUS_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  /**
   * Validate uploaded file
   * @param {File} file - File to validate
   * @param {string} type - Expected type ('musicxml' or 'mp3')
   * @returns {Promise<boolean>}
   */
  static async validate(file, type) {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new FileValidationError(
        `File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        'FILE_TOO_LARGE'
      );
    }

    // Check file extension
    const extension = this.getExtension(file.name);
    
    if (type === 'musicxml') {
      if (!['mxl', 'musicxml', 'xml'].includes(extension)) {
        throw new FileValidationError(
          'Invalid file extension. Expected .mxl, .musicxml, or .xml',
          'INVALID_EXTENSION'
        );
      }
      await this.validateMusicXMLContent(file, extension);
    } else if (type === 'mp3') {
      if (extension !== 'mp3') {
        throw new FileValidationError(
          'Invalid file extension. Expected .mp3',
          'INVALID_EXTENSION'
        );
      }
      await this.validateAudioContent(file);
    }

    return true;
  }

  /**
   * Get file extension
   * @param {string} filename 
   * @returns {string}
   */
  static getExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  /**
   * Validate MusicXML file content
   * @param {File} file 
   * @param {string} extension 
   */
  static async validateMusicXMLContent(file, extension) {
    if (extension === 'mxl') {
      // Compressed MusicXML - check for ZIP signature
      const header = await this.readFileHeader(file, 4);
      const signature = new Uint8Array(header);
      
      // ZIP file signature: PK (0x50, 0x4B)
      if (signature[0] !== 0x50 || signature[1] !== 0x4B) {
        throw new FileValidationError(
          'Invalid MXL file: not a valid ZIP archive',
          'INVALID_MXL'
        );
      }
    } else {
      // Plain XML - check content
      const text = await file.text();
      
      // Check for XML structure
      if (!text.includes('<?xml') && !text.includes('<score-partwise') && !text.includes('<score-timewise')) {
        throw new FileValidationError(
          'Invalid MusicXML: missing XML declaration or score element',
          'INVALID_MUSICXML'
        );
      }

      // Check for malicious content
      if (this.containsMaliciousPatterns(text)) {
        throw new FileValidationError(
          'File contains potentially malicious content',
          'MALICIOUS_CONTENT'
        );
      }
    }
  }

  /**
   * Validate audio file content
   * @param {File} file 
   */
  static async validateAudioContent(file) {
    const header = await this.readFileHeader(file, 4);
    const signature = new Uint8Array(header);

    // Check for MP3 signatures
    // ID3 tag: 0x49, 0x44, 0x33 ("ID3")
    // MP3 frame sync: 0xFF, 0xFB or 0xFF, 0xFA or 0xFF, 0xF3 or 0xFF, 0xF2
    const isID3 = signature[0] === 0x49 && signature[1] === 0x44 && signature[2] === 0x33;
    const isMP3Frame = signature[0] === 0xFF && (signature[1] & 0xE0) === 0xE0;

    if (!isID3 && !isMP3Frame) {
      throw new FileValidationError(
        'Invalid MP3 file: unrecognized audio format',
        'INVALID_MP3'
      );
    }
  }

  /**
   * Read file header bytes
   * @param {File} file 
   * @param {number} bytes 
   * @returns {Promise<ArrayBuffer>}
   */
  static readFileHeader(file, bytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file.slice(0, bytes));
    });
  }

  /**
   * Check for malicious patterns in content
   * @param {string} content 
   * @returns {boolean}
   */
  static containsMaliciousPatterns(content) {
    return this.MALICIOUS_PATTERNS.some(pattern => pattern.test(content));
  }

  /**
   * Sanitize filename
   * @param {string} filename 
   * @returns {string}
   */
  static sanitizeFileName(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}

/**
 * Custom error class for file validation
 */
export class FileValidationError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'FileValidationError';
    this.code = code;
    this.details = details;
  }
}
