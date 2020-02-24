/***************************************************************
 * @brief       Utility tests
 * @author      Joe Todd
 *
 ***************************************************************/

const test = require('tape')
import { getCents } from '../audio.js'

test('cents conversion', function (t) {
  t.plan(1)
  t.equal(Math.round(getCents(400, 440)), 165.0)
})