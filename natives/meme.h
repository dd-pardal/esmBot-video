#pragma once

#include "common.h"

using std::string;

vips::VImage generateMemeOverlay(int width, int height, string top, string bottom, string basePath, string font);
ArgumentMap Meme(string type, string* outType, char* BufferData, size_t BufferLength,
           ArgumentMap Arguments, size_t* DataSize);