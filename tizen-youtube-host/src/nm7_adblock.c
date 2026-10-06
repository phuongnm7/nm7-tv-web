#include "nm7_adblock.h"

#include <stddef.h>
#include <string.h>
#include <strings.h>

/*
 * Small, conservative baseline.
 *
 * Do NOT block googlevideo.com as a whole: YouTube media and ad traffic
 * may share delivery infrastructure. Prefer explicit ad endpoints/domains.
 */

static int contains_ci(const char *s, const char *needle)
{
    if (!s || !needle || !*needle) return 0;
    const size_t n = strlen(needle);
    for (; *s; ++s) {
        if (strncasecmp(s, needle, n) == 0) return 1;
    }
    return 0;
}

int nm7_should_block_url(const char *url)
{
    if (!url || !*url) return 0;

    /* Well-known advertising/measurement hosts. */
    static const char *blocked[] = {
        "doubleclick.net/",
        "googleadservices.com/",
        "googlesyndication.com/",
        "pagead2.googlesyndication.com/",
        "adservice.google.com/",
        "ads.youtube.com/"
    };

    for (unsigned i = 0; i < sizeof(blocked) / sizeof(blocked[0]); ++i) {
        if (contains_ci(url, blocked[i])) return 1;
    }

    /* Explicit YouTube ad endpoints; avoid broad youtube.com blocking. */
    static const char *youtube_ad_paths[] = {
        "youtube.com/pagead/",
        "youtube.com/api/stats/ads",
        "youtube.com/get_video_info?adformat=",
        "youtube-nocookie.com/pagead/"
    };

    for (unsigned i = 0; i < sizeof(youtube_ad_paths) / sizeof(youtube_ad_paths[0]); ++i) {
        if (contains_ci(url, youtube_ad_paths[i])) return 1;
    }

    return 0;
}
