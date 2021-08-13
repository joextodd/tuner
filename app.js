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
} from './audio.js'

import KalmanFilter from './kalman.js'

const frameSize = 1024
const maxFrequency = 2000
const kalmanFilter = new KalmanFilter({ R: 0.01, Q: 3 })

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
    start: async function() {
      if (!this.state.started) {
        try {
          this.audio.context = new (window.AudioContext || window.webkitAudioContext)()
          this.audio.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          this.audio.processor = this.audio.context.createScriptProcessor(frameSize, 1, 1)
          this.audio.source = this.audio.context.createMediaStreamSource(this.audio.stream)

          this.audio.source.connect(this.audio.processor)
          this.audio.processor.connect(this.audio.context.destination)

          this.audio.processor.onaudioprocess = function(e) {
            let data = e.inputBuffer.getChannelData(0)
            let fundamental = autoCorrelate(data, app.audio.context.sampleRate)
            if (fundamental !== -1 && fundamental < maxFrequency) {
              const index = getNoteIndex(fundamental)
              Vue.set(app.ui, 'frequency', fundamental)
              Vue.set(app.ui, 'note', getNote(index))
              Vue.set(app.ui, 'offset', app.ui.frequency - getNoteFrequency(index))
              const cents = kalmanFilter.filter(
                getCents(app.ui.frequency, getNoteFrequency(index)))
              Vue.set(app.ui, 'cents', cents)
              console.log(app.ui.cents)
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
