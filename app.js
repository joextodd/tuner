/**------------------------------------------------------------------------------
 *
 *  @file   app.js
 *  @brief  Web Audio Tuner
 *
 *----------------------------------------------------------------------------*/

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
      worklet: null,
      processor: null,
    },
    ui: {
      frequency: 0,
      cents: 0,
      note: 'CLICK',
    },
  },
  methods: {
    start: async function () {
      if (!this.state.started) {
        try {
          const workletUrl = new URL('worklet.js', import.meta.url)
          this.audio.context = new (window.AudioContext || window.webkitAudioContext)();
          this.audio.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.audio.source = this.audio.context.createMediaStreamSource(this.audio.stream);
          this.audio.worklet = await this.audio.context.audioWorklet.addModule(workletUrl)
          this.audio.processor = new AudioWorkletNode(this.audio.context, 'tuner-audio-processor', {
            processorOptions: {
              sampleRate: this.audio.context.sampleRate
            }
          })

          this.audio.processor.port.onmessage = e => {
            Vue.set(app.ui, 'frequency', e.data.frequency);
            Vue.set(app.ui, 'note', e.data.note);
            Vue.set(app.ui, 'cents', e.data.cents);
          }

          this.audio.source.connect(this.audio.processor).connect(this.audio.context.destination);
          this.state.started = true;
          this.ui.note = '-';
        } catch (e) {
          window.alert(e);
        }
      } else {
        this.audio.stream.getAudioTracks().forEach(t => t.stop());
        this.audio.context.close();
        this.state.started = false;
      }
    },
  },
  computed: {
    scale: function () {
      return `scale(${1 - this.ui.cents / 100})`;
    },
  },
});
