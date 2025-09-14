/**
 * FileReader Usage Examples
 * 
 * This file demonstrates how to use the improved FileReader component
 * that follows the FileTile pattern but is adapted for the transcription app
 */

import { AudioFileReader } from '../src/components/FileReader.js'

// Example 1: Basic file selection and processing
function basicFileReaderExample() {
  const fileReader = new AudioFileReader({
    sampleRate: 16000, // Whisper's expected sample rate
    onFileUpdate: (result) => {
      console.log('File processed successfully:', {
        audioDataLength: result.audioData.length,
        duration: result.audioBuffer.duration,
        sampleRate: result.audioBuffer.sampleRate,
        isVideo: result.isVideo,
        mimeType: result.mimeType
      })
      
      // The result contains:
      // - audioBuffer: AudioBuffer for playback
      // - blobUrl: URL for audio/video playback
      // - mimeType: Original file MIME type
      // - file: Original File object
      // - isVideo: Boolean indicating if it's a video file
      
      // Extract Float32Array for Whisper processing
      const audioData = AudioFileReader.extractAudioData(result.audioBuffer)
      console.log('Audio data ready for Whisper:', audioData.length, 'samples')
    },
    onError: (error) => {
      console.error('File processing error:', error.message)
    },
    onProgress: (progress) => {
      console.log(`Processing: ${progress.stage} - ${progress.progress}%`)
    }
  })

  // Trigger file selection dialog
  fileReader.selectFile()
}

// Example 2: Create a file tile interface (similar to FileTile component)
function createFileTileExample() {
  const fileReader = new AudioFileReader({
    onFileUpdate: (result) => {
      // Handle successful file processing
      console.log('File tile processed file:', result.file.name)
      
      // You can now use the pre-processed audio data directly
      const audioData = AudioFileReader.extractAudioData(result.audioBuffer)
      
      // Send to transcription manager
      // transcriptionManager.transcribeAudioData(audioData, 'en')
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    }
  })

  // Create a tile-like interface
  const container = document.getElementById('file-upload-container')
  const tile = fileReader.createFileTile(container, {
    icon: '🎵',
    text: 'Click to select audio file',
    className: 'custom-file-tile'
  })

  console.log('File tile created:', tile)
}

// Example 3: Process a file directly (from drag & drop)
function processDraggedFileExample() {
  const fileReader = new AudioFileReader({
    onFileUpdate: (result) => {
      console.log('Dragged file processed:', result.file.name)
      
      // Extract audio data for transcription
      const audioData = AudioFileReader.extractAudioData(result.audioBuffer)
      
      // The audio data is now ready for Whisper transcription
      // It's already resampled to 16kHz and converted to mono
      console.log('Ready for transcription:', {
        samples: audioData.length,
        duration: audioData.length / 16000,
        sampleRate: 16000
      })
    }
  })

  // Set up drag and drop
  const dropZone = document.getElementById('drop-zone')
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('dragover')
  })

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover')
  })

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('dragover')
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      // Process the first dropped file
      fileReader.processFile(files[0])
    }
  })
}

// Example 4: Integration with existing AudioManager (as done in the app)
function integratedExample() {
  // This is how it's used in the actual transcription app
  class AudioManagerWithFileReader {
    constructor() {
      this.fileReader = new AudioFileReader({
        sampleRate: 16000,
        onError: (error) => {
          console.error('FileReader error:', error)
        }
      })
    }

    async processFileWithFileReader(file) {
      return new Promise((resolve, reject) => {
        this.fileReader.onFileUpdate = (result) => {
          try {
            // Extract Float32Array from AudioBuffer for Whisper
            const audioData = AudioFileReader.extractAudioData(result.audioBuffer)
            
            resolve({
              audioData,
              audioBuffer: result.audioBuffer,
              blobUrl: result.blobUrl,
              isVideo: result.isVideo,
              mimeType: result.mimeType,
              file: result.file
            })
          } catch (error) {
            reject(error)
          }
        }
        
        this.fileReader.onError = (error) => {
          reject(error)
        }
        
        // Process the file
        this.fileReader.processFile(file)
      })
    }
  }

  // Usage
  const audioManager = new AudioManagerWithFileReader()
  
  // Process a file and get ready-to-use audio data
  document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const result = await audioManager.processFileWithFileReader(file)
      console.log('File processed and ready for transcription:', {
        audioDataLength: result.audioData.length,
        duration: result.audioBuffer.duration,
        isVideo: result.isVideo
      })

      // The audioData is now ready for direct transcription
      // transcriptionManager.transcribeAudioData(result.audioData, 'en')
    } catch (error) {
      console.error('File processing failed:', error)
    }
  })
}

// Example 5: Comparison with original FileTile approach
function fileTileComparisonExample() {
  /*
  // Original React FileTile approach:
  function FileTile(props) {
    let elem = document.createElement("input");
    elem.type = "file";
    elem.oninput = (event) => {
      let files = event.target.files;
      if (!files) return;

      const urlObj = URL.createObjectURL(files[0]);
      const mimeType = files[0].type;

      const reader = new FileReader();
      reader.addEventListener("load", async (e) => {
        const arrayBuffer = e.target?.result;
        if (!arrayBuffer) return;

        const audioCTX = new AudioContext({
          sampleRate: Constants.SAMPLING_RATE,
        });

        const decoded = await audioCTX.decodeAudioData(arrayBuffer);
        props.onFileUpdate(decoded, urlObj, mimeType);
      });
      reader.readAsArrayBuffer(files[0]);
      elem.value = "";
    };

    return <Tile onClick={() => elem.click()} />;
  }
  */

  // Our improved FileReader approach does the same thing but with better error handling,
  // progress reporting, file validation, and integration with the existing app architecture:

  const fileReader = new AudioFileReader({
    sampleRate: 16000, // Same as Constants.SAMPLING_RATE
    onFileUpdate: (result) => {
      // Same as props.onFileUpdate but with more information
      const { audioBuffer, blobUrl, mimeType } = result
      
      // Extract audio data (equivalent to decoded)
      const audioData = AudioFileReader.extractAudioData(audioBuffer)
      
      console.log('Processed like FileTile:', {
        audioBuffer, // equivalent to 'decoded'
        blobUrl,     // equivalent to 'urlObj'
        mimeType,    // same as original
        audioData    // ready for Whisper (Float32Array)
      })
    },
    onError: (error) => {
      console.error('Processing failed:', error)
    },
    onProgress: (progress) => {
      console.log(`Progress: ${progress.stage} - ${progress.progress}%`)
    }
  })

  // Create a tile that behaves like the original FileTile
  const container = document.getElementById('tile-container')
  const tile = fileReader.createFileTile(container, {
    icon: '📁',
    text: 'Select File'
  })

  // The tile automatically handles click events and file processing
  console.log('FileTile-like component created')
}

// Export examples for use
export {
  basicFileReaderExample,
  createFileTileExample,
  processDraggedFileExample,
  integratedExample,
  fileTileComparisonExample
}
