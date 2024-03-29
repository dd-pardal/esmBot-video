#include <iostream>
#include <vips/vips8>
#include <vips/vips.h>
#include <glib-object.h>
#include "../command-parts.h"

using namespace std;
using namespace vips;

extern "C" {
  VipsImage *esmbot_generate_caption(int width, const char *caption_c_str, const char *base_path_c_str, const char *font_c_str) {
    string caption(caption_c_str);
    string basePath(base_path_c_str);
    string font(font_c_str);
    VipsImage *out = generateCaption(width, caption, basePath, font).extract_band(0, VImage::option()->set("n", 3)).get_image();
    g_object_ref(out);
    return out;
  }

  VipsImage *esmbot_generate_caption_two(int width, const char *caption_c_str, const char *base_path_c_str, const char *font_c_str) {
    string caption(caption_c_str);
    string basePath(base_path_c_str);
    string font(font_c_str);
    VipsImage *out = generateCaptionTwo(width, caption, basePath, font).extract_band(0, VImage::option()->set("n", 3)).get_image();
    g_object_ref(out);
    return out;
  }

  VipsImage *esmbot_generate_snapchat_overlay(int width, const char *caption_c_str, const char *base_path_c_str, const char *font_c_str) {
    string caption(caption_c_str);
    string basePath(base_path_c_str);
    string font(font_c_str);
    VipsImage *out = generateSnapchatOverlay(width, caption, basePath, font).cast(VIPS_FORMAT_UCHAR).get_image();
    g_object_ref(out);
    return out;
  }

  VipsImage *esmbot_generate_meme_overlay(int width, int height, const char *top_c_str, const char *bottom_c_str, const char *base_path_c_str, const char *font_c_str) {
    string top(top_c_str);
    string bottom(bottom_c_str);
    string basePath(base_path_c_str);
    string font(font_c_str);
    VipsImage *out = generateMemeOverlay(width, height, top, bottom, basePath, font).cast(VIPS_FORMAT_UCHAR).get_image();
    g_object_ref(out);
    return out;
  }
}
