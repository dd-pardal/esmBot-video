# Video Support

This is an experimental fork of esmBot with video support, powered by FFmpeg. This is not meant to be an alternative to esmBot, instead I'm hoping Essem eventually incorporates these changes into the main repo.

If you want to try this out, follow `docs/setup.md`. In short, if you're have already setup esmBot, you'll probably just need to install the required libraries (`libvpx-dev libopus-dev libssl-dev` if you're on Debian/Ubuntu), `git clone --recurse-submodules --depth 50` this repo, copy the `.env` file and run `pnpm run build`. The script will build everything, including FFmpeg.

## Stuff to do

- Porting other commands (**Currently, only the caption command is implemented.**)
- Video processing on the image servers
- Having a persistent server process instead of spawning a new FFmpeg process for each video (this would lessen the reliance on OS caching the FFmpeg executable)
- Queue for video processing
- Refactoring some code on the Node.js side
- Better build system (possibly everything done via CMake?)
- Make the original Node.js addon use code from `natives/processing/` to avoid duplicated code.

## How it works (for now)

The Node.js process spawns a FFmpeg process that downloads and processes the videos. The output is then sent to the Node.js process and it uploads the video to Discord. The video processing is done through a combination of built-in and custom FFmpeg filters. Some of the custom filters process frames using libvips.

# <img src="https://github.com/esmBot/esmBot/raw/master/docs/assets/esmbot.png" width="128"> esmBot
[![esmBot Support](https://discordapp.com/api/guilds/592399417676529688/embed.png)](https://discord.gg/vfFM7YT) ![GitHub license](https://img.shields.io/github/license/esmBot/esmBot.svg)


esmBot is an easily-extendable, multipurpose, and entertainment-focused Discord bot made using [Eris](https://abal.moe/Eris/) with image, music, and utility commands, alongside many others.

[![Top.gg](https://top.gg/api/widget/429305856241172480.svg)](https://top.gg/bot/429305856241172480)

## Usage
You can invite the bot to your server using this link: https://projectlounge.pw/invite

A command list can be found [here](https://projectlounge.pw/esmBot/help.html).

If you want to self-host the bot, a guide can be found [here](https://esmbot.github.io/esmBot/setup).

## Credits
Icon by [Steel](https://twitter.com/MintBurrow).
All images, sounds, and fonts are copyright of their respective owners.
