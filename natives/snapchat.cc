#include <vips/vips8>

#include "common.h"

using namespace std;
using namespace vips;

const vector<double> zeroVec178 = {0, 0, 0, 178};

VImage generateSnapchatOverlay(int width, string caption, string basePath, string font) {
  int size = width / 20;
  int textWidth = width - ((width / 25) * 2);

  string font_string = (font == "roboto" ? "Roboto Condensed" : font) + " " +
                       (font != "impact" ? "bold" : "normal") + ", Twemoji Color Font " + to_string(size);

  VImage textIn = VImage::text(
      ".", VImage::option()->set(
               "fontfile", (basePath + "assets/fonts/caption2.ttf").c_str()));
  textIn = VImage::text(
      ("<span foreground=\"white\" background=\"#000000B2\">" + caption +
       "</span>")
          .c_str(),
      VImage::option()
          ->set("rgba", true)
          ->set("align", VIPS_ALIGN_CENTRE)
          ->set("font", font_string.c_str())
          ->set("fontfile", (basePath + "assets/fonts/twemoji.otf").c_str())
          ->set("width", textWidth));
  int bgHeight = textIn.height() + (width / 25);
  textIn = ((textIn == zeroVec).bandand())
               .ifthenelse(zeroVec178, textIn)
               .embed((width / 2) - (textIn.width() / 2),
                      (bgHeight / 2) - (textIn.height() / 2), width, bgHeight,
                      VImage::option()
                          ->set("extend", "background")
                          ->set("background", zeroVec178));
  return textIn;
}

ArgumentMap Snapchat(string type, string *outType, char *BufferData,
                     size_t BufferLength, ArgumentMap Arguments,
                     size_t *DataSize) {
  string font = GetArgument<string>(Arguments, "font");
  string caption = GetArgument<string>(Arguments, "caption");
  float pos = GetArgumentWithFallback<float>(Arguments, "pos", 0.5);
  string basePath = GetArgument<string>(Arguments, "basePath");

  VOption *options = VImage::option()->set("access", "sequential");

  VImage in =
      VImage::new_from_buffer(BufferData, BufferLength, "",
                              type == "gif" ? options->set("n", -1) : options)
          .colourspace(VIPS_INTERPRETATION_sRGB);
  if (!in.has_alpha()) in = in.bandjoin(255);

  int width = in.width();
  int pageHeight = vips_image_get_page_height(in.get_image());
  int nPages = vips_image_get_n_pages(in.get_image());

  VImage replicated = generateSnapchatOverlay(width, caption, basePath, font)
                          .embed(0, pageHeight * pos, width, pageHeight)
                          .copy(VImage::option()->set("interpretation",
                                                      VIPS_INTERPRETATION_sRGB))
                          .replicate(1, nPages);
  VImage final = in.composite(replicated, VIPS_BLEND_MODE_OVER);

  void *buf;
  final.write_to_buffer(
      ("." + *outType).c_str(), &buf, DataSize,
      *outType == "gif"
          ? VImage::option()->set("dither", 0)->set("reoptimise", 1)
          : 0);

  ArgumentMap output;
  output["buf"] = (char *)buf;

  return output;
}