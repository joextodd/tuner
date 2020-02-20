/*******************************************************
 * @brief       Auto correlation functions
 * @author      Joe Todd
 *
 *******************************************************/
#include <cstdlib>
#include <iostream>
#include "main.hpp"
using namespace std;

#define MIN_SAMPLES 10
#define MAX_SAMPLES 1000

/**
 * Short term auto correlation algorithm to calculate the
 * fundamental frequency from a time domain signal.
 *
 * http://www.nyu.edu/classes/bello/MIR_files/periodicity.pdf
 */
float autoCorrelate(float *samples, int numSamples, int sampleRate)
{
    int N = numSamples;
    int bestOffset = 0;
    float bestCorrelation = -1.0f;

    float *r = (float *)calloc(MAX_SAMPLES, sizeof(float));
    if (r == NULL) {
        return -1.0f;
    }

    /*----------------------------------------------------------------
     * Scan through windows from 10 - 1000 samples,
     * allowing detection of periodic waves from ~ 44Hz - 4400Hz.
     *---------------------------------------------------------------*/
    for (int k = MAX_SAMPLES; k > MIN_SAMPLES; k--)
    {
        for (int i = 0; i < N - k - 1; i++)
        {
            r[k] += samples[i] * samples[i + k];
        }

        r[k] = r[k] / (N - k);

        if (r[k] > bestCorrelation) {
            bestOffset = k;
            bestCorrelation = r[k];
        }

        if (r[k] > 0.01) {
            break;
        }
    }

    free(r);
    if (bestCorrelation > 0.0001) {
        /*----------------------------------------------------------------
         * bestOffset is the period (in frames) of the matched frequency.
         * Divide the sample rate by this to get the frequency value.
         *--------------------------------------------------------------*/
        return (float)sampleRate / (float)bestOffset;
    } else {
        /*----------------------------------------------------------------
         * No good correlation found.
         *--------------------------------------------------------------*/
        return -1.0f;
    }
}
