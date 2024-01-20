#include <vips/vips8>

#include "common.h"

using namespace std;
using namespace vips;

ArgumentMap Distort(const string& type, string& outType, const char* bufferdata, size_t bufferLength, ArgumentMap arguments, size_t& dataSize)
{
  string mapName = GetArgument<string>(arguments, "mapName");
  string basePath = GetArgument<string>(arguments, "basePath");

  VImage in =
      VImage::new_from_buffer(
          bufferdata, bufferLength, "",
          type == "gif" ? VImage::option()->set("n", -1)->set("access", "sequential")
                        : 0)
          .colourspace(VIPS_INTERPRETATION_sRGB);
  if (!in.has_alpha()) in = in.bandjoin(255);

  int width = in.width();
  int pageHeight = vips_image_get_page_height(in.get_image());
  int nPages = vips_image_get_n_pages(in.get_image());

  string distortPath = basePath + "assets/images/" + mapName;
  VImage distort =
      (VImage::new_from_file(distortPath.c_str())
           .resize(width / 500.0, VImage::option()
                                      ->set("vscale", pageHeight / 500.0)
                                      ->set("kernel", VIPS_KERNEL_CUBIC)) /
       65535);

  VImage distortImage = (distort[0] * width).bandjoin(distort[1] * pageHeight);

  vector<VImage> img;
  for (int i = 0; i < nPages; i++) {
    VImage img_frame =
        type == "gif" ? in.crop(0, i * pageHeight, width, pageHeight) : in;
    VImage mapped = img_frame.mapim(distortImage);
    img.push_back(mapped);
  }
  VImage final = VImage::arrayjoin(img, VImage::option()->set("across", 1));
  final.set(VIPS_META_PAGE_HEIGHT, pageHeight);

  char *buf;
  final.write_to_buffer(("." + outType).c_str(), reinterpret_cast<void**>(&buf), &dataSize);

  ArgumentMap output;
  output["buf"] = buf;

  return output;
}
