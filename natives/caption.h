#pragma once

#include "common.h"

using std::string;

vips::VImage generateCaptionImage(int width, string caption, string basePath, string font);
ArgumentMap Caption(string type, string* outType, char* BufferData, size_t BufferLength,
              ArgumentMap Arguments, size_t* DataSize);