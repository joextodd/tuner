/**------------------------------------------------------------------------------
 *
 *  @file   audio.js
 *  @brief  Web Audio Tuner
 *
 *----------------------------------------------------------------------------*/

const a = 2 ** (1 / 12.0)
const f0 = { idx: 57, freq: 440 }
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const getNote = index => notes[index % 12]
export const getPeakFrequency = spectrum => spectrum.indexOf(Math.max(...spectrum))

/**
 * Get the frequency of a note by the index from A0.
 */
export const getNoteFrequency = index => f0.freq * (a ** (index - f0.idx))

/**
 * Get the index of a note from A4 (440Hz) from the frequency.
 */
export const getNoteIndex = frequency => {
  const noteNum = 12 * (Math.log(frequency / f0.freq) / Math.log(2))
  return (Math.round(noteNum) + f0.idx)
}

/**
 * Simple auto correlation algorithm to calculate the
 * fundamental frequency from a time domain signal.
 *
 * TODO: Replace for frequency domain version
 * https://dsp.stackexchange.com/questions/386/autocorrelation-in-audio-analysis
 */
export const autoCorrelate = (buffer, sampleRate) => {
  let n = 1024
  let bestR = 0
  let bestK = -1

  for (let k = 8; k <= 1000; k++) {
    let sum = 0

    for (let i = 0; i < n; i++) {
      sum += ((buffer[i] - 128) / 128) * ((buffer[i + k] - 128) / 128);
    }

    let r = sum / n
    if (r > bestR) {
      bestR = r;
      bestK = k;
    }

    if (r > 0.9) {
      break;  // This is good enough
    }
  }

  if (bestR > 0.0025) {
    // bestK is the period (in frames) of the matched frequency.
    // Divide the sample rate by this to get the frequency value.
    return sampleRate / bestK;
  } else {
    // No good correlation found.
    return -1;
  }
};