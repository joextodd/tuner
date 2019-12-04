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
export const getCents = (f1, f2) => 1200 / Math.log2(f2 / f1)
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
 * Short term auto correlation algorithm to calculate the
 * fundamental frequency from a time domain signal.
 *
 * http://www.nyu.edu/classes/bello/MIR_files/periodicity.pdf
 * https://www.sciencedirect.com/science/article/pii/S1319157810800023
 */
export const autoCorrelate = (samples, sampleRate) => {
  const r = new Array(1000).fill(0)
  const N = samples.length

  /*
   * Scan through windows from 10 - 1000 samples,
   * allowing detection of periodic waves from ~ 44Hz - 4400Hz.
   */
  for (let k = 10; k <= 1000; k++) {

    for (let i = 0; i < N - k - 1; i++) {
      r[k] += samples[i] * samples[i + k]
    }

    r[k] = r[k] / (N - k)

    if (r[k] > 0.9) {
      break;
    }
  }

  let max = 0
  r.forEach(v => max = v > max ? v : max)
  let bestK = r.indexOf(max)

  if (max > 0.0001) {
    /*
     * bestK is the period (in frames) of the matched frequency.
     * Divide the sample rate by this to get the frequency value.
     */
    return (sampleRate / bestK).toFixed(2)
  } else {
    return -1  // No good correlation found.
  }
}
