#pragma once

#include <vips/vips.h>

#ifdef __cplusplus
extern "C" {
#endif

VipsImage *esmbot_generate_caption_img(int width, const char *font, char *caption_text);

#ifdef __cplusplus
}
#endif
