#pragma once

#include "common.h"

using std::string;

vips::VImage generateCaptionTwo(int width, string caption, string basePath, string font);
ArgumentMap CaptionTwo(string type, string* outType, char* BufferData, size_t BufferLength,
                 ArgumentMap Arguments, size_t* DataSize);