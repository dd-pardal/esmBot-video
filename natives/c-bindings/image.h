#ifndef ESMBOT_IMAGE_H
#define ESMBOT_IMAGE_H

#include <vips/vips.h>

#ifdef __cplusplus
extern "C" {
#endif

VipsImage *esmbot_generate_caption(int width, const char *caption_c_str, const char *base_path_c_str, const char *font_c_str);
VipsImage *esmbot_generate_meme_overlay(int width, int height, const char *top_c_str, const char *bottom_c_str, const char *base_path_c_str, const char *font_c_str);

#ifdef __cplusplus
}
#endif

#endif
