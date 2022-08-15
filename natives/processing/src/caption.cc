#include <iostream>
#include <vips/vips8>
#include <vips/vips.h>
#include <glib-object.h>

using namespace std;
using namespace vips;

extern "C" {
	VipsImage *esmbot_generate_caption_img(int width, const char *font_c_str, char *caption_c_str) {
		int size = max(1, width / 10);
		int textWidth = width - ((width / 25) * 2);

		string font(font_c_str);
		string font_string = (font == "roboto" ? "Roboto Condensed" : font) + " " +
							(font != "impact" ? "bold" : "normal") + " " +
							to_string(size);

		string caption(caption_c_str);
		string captionText = "<span background=\"white\">" + caption + "</span>";

		VImage text = VImage::text(
			captionText.c_str(),
			VImage::option()
				->set("rgba", true)
				->set("align", VIPS_ALIGN_CENTRE)
				->set("font", font_string.c_str())
				->set("width", textWidth)
		);

		VImage captionImage = ((text == (vector<double>){0, 0, 0, 0}).bandand())
			.ifthenelse(255, text)
			.gravity(VIPS_COMPASS_DIRECTION_CENTRE, width, text.height() + size, VImage::option()->set("extend", "white"));

		VipsImage *out = captionImage.extract_band(0, VImage::option()->set("n", 3)).get_image();
		g_object_ref(out);

		return out;
	}
}
