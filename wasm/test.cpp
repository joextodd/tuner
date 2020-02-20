/***********************************************************
 * @brief       Auto correlation tests
 * @requires    libsndfile, catch2 (install with brew)
 *
 ***********************************************************/
#define CATCH_CONFIG_MAIN
#include <cstdlib>
#include <catch2/catch.hpp>
#include <sndfile.h>
#include <math.h>
#include <time.h>
#include "main.hpp"

#define BUFFER_SIZE 16384

/**
 * Read a WAV file, and run it through a typical
 * buffer size through the auto correlate function
 * at a random interval.
 */
float testAutoCorrelate(const char *fileName)
{
    float *buf;
    SNDFILE *sf;
    SF_INFO info;

    INFO("Reading WAV file...");
    sf = sf_open(fileName, SFM_READ, &info);
    CHECK(sf_error(sf) == SF_ERR_NO_ERROR);

    buf = (float *)malloc(info.frames * info.channels * sizeof(float));
    sf_count_t length = sf_read_float(sf, buf, info.frames * info.channels);
    CHECK(length > 0);

    float frequency = autoCorrelate(buf, length, info.samplerate);
    free(buf);
    sf_close(sf);

    return frequency;
}

/* TEST CASES ------------------------------------------------ */

TEST_CASE("Can detect an E2 on guitar", "[Guitar E2]")
{
    float frequency = testAutoCorrelate("./data/guitar/E2.wav");
    REQUIRE(round(frequency) == 82.0f);
}

TEST_CASE("Can detect an A2 on guitar", "[Guitar A2]")
{
    float frequency = testAutoCorrelate("./data/guitar/A2.wav");
    REQUIRE(round(frequency) == 110.0f);
}

TEST_CASE("Can detect an D3 on guitar", "[Guitar D3]")
{
    float frequency = testAutoCorrelate("./data/guitar/D3.wav");
    REQUIRE(round(frequency) == 147.0f);
}

TEST_CASE("Can detect an B3 on guitar", "[Guitar B3]")
{
    float frequency = testAutoCorrelate("./data/guitar/B3.wav");
    REQUIRE(round(frequency) == 249.0f);
}
