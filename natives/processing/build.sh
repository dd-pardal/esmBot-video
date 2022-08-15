#!/bin/sh

# TODO: Maybe transform this into a Makefile.

set -e
FLAGS="-c -ggdb $(pkg-config --cflags vips-cpp vips)"
mkdir -p build
g++ $FLAGS -o build/caption.o src/caption.cc
ar rcs build/libesmbot-processing.a build/caption.o
echo "Image processing library built successfully!"
