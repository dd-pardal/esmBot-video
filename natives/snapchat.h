#pragma once

#include "common.h"

using std::string;

vips::VImage generateSnapchatOverlay(int width, string caption, string basePath, string font);
ArgumentMap Snapchat(string type, string* outType, char* BufferData, size_t BufferLength,
               ArgumentMap Arguments, size_t* DataSize);