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
 * Auto correlation algorithm to calculate the
 * fundamental frequency from a time domain signal.
 *
 * https://github.com/cwilso/PitchDetect/blob/master/js/pitchdetect.js
 */
export const autoCorrelate = (buf, sampleRate) => {
  const GOOD_ENOUGH_CORRELATION = 0.9
  const SIZE = buf.length;
  const MIN_SAMPLES = 4
  const MAX_SAMPLES = Math.floor(SIZE / 2);

  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;
  let foundGoodCorrelation = false;
  let correlations = new Array(MAX_SAMPLES);

  for (let i = 0; i < SIZE; i++) {
    let val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) {
    return -1;  // not enough signal
  }

  let lastCorrelation = 1;
  for (let offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs((buf[i]) - (buf[i + offset]));
    }
    correlation = 1 - (correlation / MAX_SAMPLES);
    correlations[offset] = correlation;
    if ((correlation > GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (foundGoodCorrelation) {
      let shift = (correlations[bestOffset + 1] - correlations[bestOffset - 1]) / correlations[bestOffset];
      return sampleRate / (bestOffset + (8 * shift));
    }
    lastCorrelation = correlation;
  }

  if (bestCorrelation > 0.01) {
    console.log("f = " + sampleRate / bestOffset + "Hz (rms: " + rms + " confidence: " + bestCorrelation + ")")
    return sampleRate / bestOffset;
  }
  return -1;
}

/**
 * Simple but inefficient auto correlation algorithm to calculate the
 * fundamental frequency from a time domain signal.
 */
export const autoCorrelateSimple = (buffer, sampleRate) => {
  let bestOffset = -1
  let bestCorrelation = 0
  let numSamples = buffer.length / 2

  /*
   * Scan through windows from 10 - 1000 samples,
   * allowing detection of periodic waves from ~ 44Hz - 4400Hz.
   */
  for (let k = 10; k <= 1000; k++) {
    let sum = 0

    for (let i = 0; i < numSamples; i++) {
      sum += buffer[i] * buffer[i + k]
    }

    let r = sum / (numSamples + k)
    if (r > bestCorrelation) {
      bestCorrelation = r
      bestOffset = k
    }

    if (r > 0.9) {
      break;  // This is good enough
    }
  }

  if (bestCorrelation > 0.0025) {
    /*
     * bestOffset is the period (in frames) of the matched frequency.
     * Divide the sample rate by this to get the frequency value.
     */
    return sampleRate / bestOffset
  } else {
    return -1  // No good correlation found.
  }
}
