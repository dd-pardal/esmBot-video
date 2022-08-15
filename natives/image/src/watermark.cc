#include <napi.h>

#include <vips/vips8>

using namespace std;
using namespace vips;

Napi::Value Watermark(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  Napi::Object result = Napi::Object::New(env);

  try {
    Napi::Object obj = info[0].As<Napi::Object>();
    Napi::Buffer<char> data = obj.Get("data").As<Napi::Buffer<char>>();
    string water = obj.Get("water").As<Napi::String>().Utf8Value();
    int gravity = obj.Get("gravity").As<Napi::Number>().Int64Value();
    bool resize = obj.Has("resize")
                      ? obj.Get("resize").As<Napi::Boolean>().Value()
                      : false;
    float yscale = obj.Has("yscale")
                       ? obj.Get("yscale").As<Napi::Number>().FloatValue()
                       : false;
    bool append = obj.Has("append")
                      ? obj.Get("append").As<Napi::Boolean>().Value()
                      : false;
    bool alpha =
        obj.Has("alpha") ? obj.Get("alpha").As<Napi::Boolean>().Value() : false;
    bool flip =
        obj.Has("flip") ? obj.Get("flip").As<Napi::Boolean>().Value() : false;
    bool mc = obj.Has("mc") ? obj.Get("mc").As<Napi::Boolean>().Value() : false;
    string basePath = obj.Get("basePath").As<Napi::String>().Utf8Value();
    string type = obj.Get("type").As<Napi::String>().Utf8Value();

    VOption *options = VImage::option()->set("access", "sequential");

    VImage in =
        VImage::new_from_buffer(data.Data(), data.Length(), "",
                                type == "gif" ? options->set("n", -1) : options)
            .colourspace(VIPS_INTERPRETATION_sRGB);
    if (!in.has_alpha()) in = in.bandjoin(255);

    string merged = basePath + water;
    VImage watermark = VImage::new_from_file(merged.c_str());

    int width = in.width();
    int pageHeight = vips_image_get_page_height(in.get_image());
    int nPages = vips_image_get_n_pages(in.get_image());

    if (flip) {
      watermark = watermark.flip(VIPS_DIRECTION_HORIZONTAL);
    }

    if (resize && append) {
      watermark = watermark.resize((double)width / (double)watermark.width());
    } else if (resize && yscale) {
      watermark = watermark.resize(
          (double)width / (double)watermark.width(),
          VImage::option()->set("vscale", (double)(pageHeight * yscale) /
                                              (double)watermark.height()));
    } else if (resize) {
      watermark =
          watermark.resize((double)pageHeight / (double)watermark.height());
    }

    int x = 0, y = 0;
    switch (gravity) {
      case 1:
        break;
      case 2:
        x = (width / 2) - (watermark.width() / 2);
        break;
      case 3:
        x = width - watermark.width();
        break;
      case 5:
        x = (width / 2) - (watermark.width() / 2);
        y = (pageHeight / 2) - (watermark.height() / 2);
        break;
      case 6:
        x = width - watermark.width();
        y = (pageHeight / 2) - (watermark.height() / 2);
        break;
      case 8:
        x = (width / 2) - (watermark.width() / 2);
        y = pageHeight - watermark.height();
        break;
      case 9:
        x = width - watermark.width();
        y = pageHeight - watermark.height();
        break;
    }

    vector<VImage> img;
    int addedHeight = 0;
    VImage contentAlpha;
    VImage frameAlpha;
    VImage bg;
    VImage frame;
    for (int i = 0; i < nPages; i++) {
      VImage img_frame =
          type == "gif" ? in.crop(0, i * pageHeight, width, pageHeight) : in;
      if (append) {
        VImage appended = img_frame.join(watermark, VIPS_DIRECTION_VERTICAL,
                                         VImage::option()->set("expand", true));
        addedHeight = watermark.height();
        img.push_back(appended);
      } else if (mc) {
        VImage padded =
            img_frame.embed(0, 0, width, pageHeight + 15,
                            VImage::option()->set("background", 0xffffff));
        VImage composited =
            padded.composite2(watermark, VIPS_BLEND_MODE_OVER,
                              VImage::option()
                                  ->set("x", width - 190)
                                  ->set("y", padded.height() - 22));
        addedHeight = 15;
        img.push_back(composited);
      } else {
        VImage composited;
        if (alpha) {
          if (i == 0) {
            contentAlpha = watermark.extract_band(0).embed(
                x, y, width, pageHeight,
                VImage::option()->set("extend", "white"));
            frameAlpha = watermark.extract_band(1).embed(
                x, y, width, pageHeight,
                VImage::option()->set("extend", "black"));
            bg =
                frameAlpha.new_from_image({0, 0, 0}).copy(VImage::option()->set(
                    "interpretation", VIPS_INTERPRETATION_sRGB));
            frame = bg.bandjoin(frameAlpha);
            if (type == "jpg" || type == "jpeg") {
              type = "png";
            }
          }
          VImage content =
              img_frame.extract_band(0, VImage::option()->set("n", 3))
                  .bandjoin(contentAlpha & img_frame.extract_band(3));

          composited =
              content.composite2(frame, VIPS_BLEND_MODE_OVER,
                                 VImage::option()->set("x", x)->set("y", y));
        } else {
          composited =
              img_frame.composite2(watermark, VIPS_BLEND_MODE_OVER,
                                   VImage::option()->set("x", x)->set("y", y));
        }
        img.push_back(composited);
      }
    }
    VImage final = VImage::arrayjoin(img, VImage::option()->set("across", 1));
    final.set(VIPS_META_PAGE_HEIGHT, pageHeight + addedHeight);

    void *buf;
    size_t length;
    final.write_to_buffer(
        ("." + type).c_str(), &buf, &length,
        type == "gif" ? VImage::option()->set("dither", 0)->set("reoptimise", 1)  : 0);

    result.Set("data", Napi::Buffer<char>::Copy(env, (char *)buf, length));
    result.Set("type", type);
  } catch (std::exception const &err) {
    Napi::Error::New(env, err.what()).ThrowAsJavaScriptException();
  } catch (...) {
    Napi::Error::New(env, "Unknown error").ThrowAsJavaScriptException();
  }

  vips_error_clear();
  vips_thread_shutdown();
  return result;
}
