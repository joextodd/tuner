/***************************************************************
 * @brief       Auto correlation tests
 * @author      Joe Todd
 *
 ***************************************************************/
const fs = require('fs')
const test = require('tape')
const wav = require('node-wav')

const bufferSize = 16384
import { autoCorrelate } from '../audio.js'

/**
 * Read WAV file and run a buffer through
 * the autoCorrelate function.
 */
const testAutoCorrelate = function(fileName) {
  const data = fs.readFileSync(fileName)
  const wavefile = wav.decode(data)
  const length = wavefile.channelData[0].length
  const startSample = Math.random(0, length - bufferSize)
  return autoCorrelate(
    wavefile.channelData[0].slice(startSample, startSample + bufferSize),
    wavefile.sampleRate
  )
}

/* GUITAR TEST CASES ------------------------------------------ */

test('Can detect an E2 on guitar', function (t) {
  t.plan(1)
  const freq = testAutoCorrelate('./tests/data/guitar/E2.wav')
  t.equal(Math.round(freq), 82.0)
});

test('Can detect an A2 on guitar', function (t) {
  t.plan(1)
  const freq = testAutoCorrelate('./tests/data/guitar/A2.wav')
  t.equal(Math.round(freq), 110.0)
});

test('Can detect a D3 on guitar', function (t) {
  t.plan(1)
  const freq = testAutoCorrelate('./tests/data/guitar/D3.wav')
  t.equal(Math.round(freq), 147.0)
});

test('Can detect a B3 on guitar', function (t) {
  t.plan(1)
  const freq = testAutoCorrelate('./tests/data/guitar/B3.wav')
  t.equal(Math.round(freq), 249.0)
});

// test('Can detect a E4 on guitar', function (t) {
//   t.plan(1)
//   const freq = testAutoCorrelate('./tests/data/guitar/E4.wav')
//   t.equal(Math.round(freq), 330.0)
// });


