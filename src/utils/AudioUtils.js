/**
 * Audio utility functions
 */

/**
 * Format timestamp for display
 * @param {number} time - Time in seconds
 * @returns {string} Formatted time string (HH:MM:SS or MM:SS)
 */
export function formatAudioTimestamp(time) {
  if (!isFinite(time) || time < 0) {
    return '--:--'
  }

  const hours = Math.floor(time / 3600)
  const minutes = Math.floor((time % 3600) / 60)
  const seconds = Math.floor(time % 60)

  const padTime = (num) => String(num).padStart(2, '0')

  if (hours > 0) {
    return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`
  } else {
    return `${padTime(minutes)}:${padTime(seconds)}`
  }
}

/**
 * Convert audio buffer to mono Float32Array for Whisper
 * @param {AudioBuffer} audioBuffer - Input audio buffer
 * @returns {Float32Array} Mono audio data
 */
export function audioBufferToMono(audioBuffer) {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0)
  }

  // Convert stereo to mono by averaging channels
  const left = audioBuffer.getChannelData(0)
  const right = audioBuffer.getChannelData(1)
  const mono = new Float32Array(left.length)

  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) / 2
  }

  return mono
}

/**
 * Resample audio to target sample rate
 * @param {Float32Array} audioData - Input audio data
 * @param {number} inputSampleRate - Original sample rate
 * @param {number} targetSampleRate - Target sample rate (default: 16000)
 * @returns {Float32Array} Resampled audio data
 */
export function resampleAudio(audioData, inputSampleRate, targetSampleRate = 16000) {
  if (inputSampleRate === targetSampleRate) {
    return audioData
  }

  const ratio = inputSampleRate / targetSampleRate
  const outputLength = Math.floor(audioData.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const index = i * ratio
    const indexFloor = Math.floor(index)
    const indexCeil = Math.min(indexFloor + 1, audioData.length - 1)
    const fraction = index - indexFloor

    // Linear interpolation
    output[i] = audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction
  }

  return output
}
