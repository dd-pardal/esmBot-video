#pragma once

using namespace std;

vips::VImage generateCaption(int width, string caption, string basePath, string font);
vips::VImage generateCaptionTwo(int width, string caption, string basePath, string font);
vips::VImage generateSnapchatOverlay(int width, string caption, string basePath, string font);
vips::VImage generateMemeOverlay(int width, int height, string top, string bottom, string basePath, string font);
