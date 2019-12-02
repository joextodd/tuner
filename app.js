/**------------------------------------------------------------------------------
 *
 *  @file   app.js
 *  @brief  Web Audio Tuner
 *
 *----------------------------------------------------------------------------*/

import {
  getNote,
  getNoteFrequency,
  getNoteIndex,
  autoCorrelate,
} from './audio.js'

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
      analyser: null,
      spectrum: null,
      buffer: null,
    },
    ui: {
      frequency: 0,
      offset: 0,
      note: '-',
    },
  },
  methods: {
    start: async function() {
      if (!this.state.started) {
        try {
          this.audio.context = new (window.AudioContext || window.webkitAudioContext)()
          this.audio.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          this.audio.processor = this.audio.context.createScriptProcessor(0, 1, 1)
          this.audio.source = this.audio.context.createMediaStreamSource(this.audio.stream)
          this.audio.analyser = this.audio.context.createAnalyser()

          this.audio.source.connect(this.audio.processor)
          this.audio.source.connect(this.audio.analyser)
          this.audio.processor.connect(this.audio.context.destination)

          this.audio.processor.onaudioprocess = function(e) {
            app.audio.buffer = new Uint8Array(app.audio.analyser.fftSize)
            app.audio.analyser.getByteTimeDomainData(app.audio.buffer)
            let fundamental = autoCorrelate(app.audio.buffer, app.audio.context.sampleRate)
            if (fundamental !== -1) {
              const index = getNoteIndex(fundamental)
              Vue.set(app.ui, 'frequency', fundamental)
              Vue.set(app.ui, 'note', getNote(index))
              Vue.set(app.ui, 'offset', app.ui.frequency - getNoteFrequency(index))
            }
          }
          this.state.started = true
        } catch (e) {
          window.alert(e)
        }
      } else {
        this.audio.stream.getAudioTracks().forEach(t => t.stop())
        this.audio.context.close()
        this.state.started = false
      }
    },
  },
  computed: {
    startButtonText: function() {
      return this.state.started ? 'STOP' : 'START'
    }
  }
})