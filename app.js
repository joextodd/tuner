/**------------------------------------------------------------------------------
 *
 *  @file   app.js
 *  @brief  Web Audio Tuner
 *
 *----------------------------------------------------------------------------*/

import {
  getNote,
  getCents,
  getNoteFrequency,
  getNoteIndex,
  autoCorrelate,
} from './audio.js';

import KalmanFilter from './kalman.js';

const DEFAULT_AMDF_PARAMS = {
  sampleRate: 44100,
  minFrequency: 82,
  maxFrequency: 1000,
  ratio: 5,
  sensitivity: 0.1,
};

export function AMDF(params = {}) {
  const config = {
    ...DEFAULT_AMDF_PARAMS,
    ...params,
  };
  const sampleRate = config.sampleRate;
  const minFrequency = config.minFrequency;
  const maxFrequency = config.maxFrequency;
  const sensitivity = config.sensitivity;
  const ratio = config.ratio;
  const amd = [];

  /* Round in such a way that both exact minPeriod as 
   exact maxPeriod lie inside the rounded span minPeriod-maxPeriod,
   thus ensuring that minFrequency and maxFrequency can be found
   even in edge cases */
  const maxPeriod = Math.ceil(sampleRate / minFrequency);
  const minPeriod = Math.floor(sampleRate / maxFrequency);

  return function AMDFDetector(float32AudioBuffer) {
    const maxShift = float32AudioBuffer.length;

    let t = 0;
    let minval = Infinity;
    let maxval = -Infinity;
    let frames1, frames2, calcSub, i, j, u, aux1, aux2;

    // Find the average magnitude difference for each possible period offset.
    for (i = 0; i < maxShift; i++) {
      if (minPeriod <= i && i <= maxPeriod) {
        for (
          aux1 = 0, aux2 = i, t = 0, frames1 = [], frames2 = [];
          aux1 < maxShift - i;
          t++, aux2++, aux1++
        ) {
          frames1[t] = float32AudioBuffer[aux1];
          frames2[t] = float32AudioBuffer[aux2];
        }

        // Take the difference between these frames.
        const frameLength = frames1.length;
        calcSub = [];
        for (u = 0; u < frameLength; u++) {
          calcSub[u] = frames1[u] - frames2[u];
        }

        // Sum the differences.
        let summation = 0;
        for (u = 0; u < frameLength; u++) {
          summation += Math.abs(calcSub[u]);
        }
        amd[i] = summation;
      }
    }

    for (j = minPeriod; j < maxPeriod; j++) {
      if (amd[j] < minval) minval = amd[j];
      if (amd[j] > maxval) maxval = amd[j];
    }

    const cutoff = Math.round(sensitivity * (maxval - minval) + minval);
    for (j = minPeriod; j <= maxPeriod && amd[j] > cutoff; j++);

    const searchLength = minPeriod / 2;
    minval = amd[j];
    let minpos = j;
    for (i = j - 1; i < j + searchLength && i <= maxPeriod; i++) {
      if (amd[i] < minval) {
        minval = amd[i];
        minpos = i;
      }
    }

    if (Math.round(amd[minpos] * ratio) < maxval) {
      return sampleRate / minpos;
    } else {
      return null;
    }
  };
}

const DEFAULT_YIN_PARAMS = {
  threshold: 0.05,
  sampleRate: 44100,
  probabilityThreshold: 0.1,
};

export function YIN(params = {}) {
  const config = {
    ...DEFAULT_YIN_PARAMS,
    ...params,
  };
  const { threshold, sampleRate, probabilityThreshold } = config;

  return function YINDetector(float32AudioBuffer) {
    // Set buffer size to the highest power of two below the provided buffer's length.
    let bufferSize;
    for (
      bufferSize = 1;
      bufferSize < float32AudioBuffer.length;
      bufferSize *= 2
    );
    bufferSize /= 2;

    // Set up the yinBuffer as described in step one of the YIN paper.
    const yinBufferLength = bufferSize / 2;
    const yinBuffer = new Float32Array(yinBufferLength);

    let probability = 0,
      tau;

    // Compute the difference function as described in step 2 of the YIN paper.
    for (let t = 0; t < yinBufferLength; t++) {
      yinBuffer[t] = 0;
    }
    for (let t = 1; t < yinBufferLength; t++) {
      for (let i = 0; i < yinBufferLength; i++) {
        const delta = float32AudioBuffer[i] - float32AudioBuffer[i + t];
        yinBuffer[t] += delta * delta;
      }
    }

    // Compute the cumulative mean normalized difference as described in step 3 of the paper.
    yinBuffer[0] = 1;
    yinBuffer[1] = 1;
    let runningSum = 0;
    for (let t = 1; t < yinBufferLength; t++) {
      runningSum += yinBuffer[t];
      yinBuffer[t] *= t / runningSum;
    }

    // Compute the absolute threshold as described in step 4 of the paper.
    // Since the first two positions in the array are 1,
    // we can start at the third position.
    for (tau = 2; tau < yinBufferLength; tau++) {
      if (yinBuffer[tau] < threshold) {
        while (
          tau + 1 < yinBufferLength &&
          yinBuffer[tau + 1] < yinBuffer[tau]
        ) {
          tau++;
        }
        // found tau, exit loop and return
        // store the probability
        // From the YIN paper: The threshold determines the list of
        // candidates admitted to the set, and can be interpreted as the
        // proportion of aperiodic power tolerated
        // within a periodic signal.
        //
        // Since we want the periodicity and and not aperiodicity:
        // periodicity = 1 - aperiodicity
        probability = 1 - yinBuffer[tau];
        break;
      }
    }

    // if no pitch found, return null.
    if (tau === yinBufferLength || yinBuffer[tau] >= threshold) {
      return null;
    }

    // If probability too low, return -1.
    if (probability < probabilityThreshold) {
      return null;
    }

    /**
     * Implements step 5 of the AUBIO_YIN paper. It refines the estimated tau
     * value using parabolic interpolation. This is needed to detect higher
     * frequencies more precisely. See http://fizyka.umk.pl/nrbook/c10-2.pdf and
     * for more background
     * http://fedc.wiwi.hu-berlin.de/xplore/tutorials/xegbohtmlnode62.html
     */
    let betterTau, x0, x2;
    if (tau < 1) {
      x0 = tau;
    } else {
      x0 = tau - 1;
    }
    if (tau + 1 < yinBufferLength) {
      x2 = tau + 1;
    } else {
      x2 = tau;
    }
    if (x0 === tau) {
      if (yinBuffer[tau] <= yinBuffer[x2]) {
        betterTau = tau;
      } else {
        betterTau = x2;
      }
    } else if (x2 === tau) {
      if (yinBuffer[tau] <= yinBuffer[x0]) {
        betterTau = tau;
      } else {
        betterTau = x0;
      }
    } else {
      const s0 = yinBuffer[x0];
      const s1 = yinBuffer[tau];
      const s2 = yinBuffer[x2];
      // fixed AUBIO implementation, thanks to Karl Helgason:
      // (2.0f * s1 - s2 - s0) was incorrectly multiplied with -1
      betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    }

    return sampleRate / betterTau;
  };
}

const frameSize = 4096;
const maxFrequency = 2000;
const kalmanFilter = new KalmanFilter({ R: 0.01, Q: 3 });
const kalmanFundamentalFilter = new KalmanFilter({ R: 0.01, Q: 3 });

let thang = [];
let thing = [];

// App
let app = new Vue({
  el: '#app',
  data: {
    state: {
      started: false,
    },
    audio: {
      context: null,
      stream: null,
      source: null,
      processor: null,
      filter: null,
    },
    ui: {
      frequency: 0,
      offset: 0,
      cents: 0,
      note: '-',
    },
  },
  methods: {
    start: async function () {
      if (!this.state.started) {
        try {
          this.audio.context = new (window.AudioContext ||
            window.webkitAudioContext)();
          this.audio.stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          this.audio.processor = this.audio.context.createScriptProcessor(
            frameSize,
            1,
            1
          );
          this.audio.source = this.audio.context.createMediaStreamSource(
            this.audio.stream
          );

          this.audio.source.connect(this.audio.processor);
          this.audio.processor.connect(this.audio.context.destination);

          this.audio.processor.onaudioprocess = function (e) {
            let data = e.inputBuffer.getChannelData(0);
            let fundamental = AMDF({
              sampleRate: app.audio.context.sampleRate,
            })(data);
            const index = getNoteIndex(fundamental);
            Vue.set(app.ui, 'frequency', fundamental);
            Vue.set(app.ui, 'note', getNote(index));
            Vue.set(
              app.ui,
              'offset',
              app.ui.frequency - getNoteFrequency(index)
            );
            Vue.set(
              app.ui,
              'cents',
              getCents(app.ui.frequency, getNoteFrequency(index))
            );
          };
          this.state.started = true;
        } catch (e) {
          window.alert(e);
        }
      } else {
        this.audio.stream.getAudioTracks().forEach((t) => t.stop());
        this.audio.context.close();
        this.state.started = false;
      }
    },
  },
  computed: {
    startButtonText: function () {
      return this.state.started ? 'STOP' : 'START';
    },
    scale: function () {
      return `scale(${1 - this.ui.cents / 100})`;
    },
  },
});
