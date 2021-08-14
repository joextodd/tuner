import { getNote, getCents, getNoteFrequency, getNoteIndex } from './audio.js';
import { AMDF } from './detectors.js';

class TunerAudioProcessor extends AudioWorkletProcessor {

  constructor(options) {
    super(options)

    this.buffer = []
    this.bufferSize = 4096
    this.sampleRate = options.processorOptions.sampleRate
  }

  process(inputs, outputs, parameters) {
    this.buffer = this.buffer.concat(Array.from(inputs[0][0]))
    if (this.buffer.length === this.bufferSize) {
      let data = new Float32Array(this.buffer)
      let frequency = AMDF({ sampleRate: this.sampleRate })(data)
      if (frequency) {
        let index = getNoteIndex(frequency)
        this.port.postMessage({
          frequency: frequency,
          note: getNote(index),
          cents: getCents(frequency, getNoteFrequency(index))
        })
      }
      this.buffer = []
    }

    return true
  }
}

registerProcessor('tuner-audio-processor', TunerAudioProcessor)
