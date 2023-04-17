# Video Support

This is an experimental fork of esmBot with video support, powered by FFmpeg.

If you want to try this out, follow te instructions in `docs/setup.md`. If you have already esmBot set up, you'll probably just need to install the required libraries (`libvpx-dev libopus-dev libssl-dev` if you're on Debian/Ubuntu), `git clone --recurse-submodules --depth 10` this repo, copy the `.env` file and run `pnpm run build`. The script will build everything, including FFmpeg.

# <img src="https://github.com/esmBot/esmBot/raw/master/docs/assets/esmbot.png" width="128"> esmBot
[![esmBot Support](https://discordapp.com/api/guilds/592399417676529688/embed.png)](https://discord.gg/esmbot) ![GitHub license](https://img.shields.io/github/license/esmBot/esmBot.svg)


esmBot is a free and open-source Discord bot designed to entertain your server. It's made using [Oceanic](https://oceanic.ws) and comes with image, music, and utility commands out of the box.

## Features
- Powerful, efficient, and performant image processing powered by [libvips](https://github.com/libvips/libvips)
- Lots of image manipulation and processing commands out of the box
- Handling of output images larger than 8MB via a local web server
- Optional WebSocket/HTTP-based external image API with load balancing
- Music and sound playback from many different configurable sources via [Lavalink](https://github.com/freyacodes/Lavalink)
- Server tags system for saving/retrieving content
- Low RAM and CPU usage when idle
- Support for slash/application commands and classic, prefix-based message commands
- Support for multiple database backends (PostgreSQL and SQLite backends included)
- [PM2](https://pm2.keymetrics.io)-based cluster/shard handling
- Flexible command handler allowing you to create new commands by adding script files

## Usage
You can invite the main instance of esmBot to your server using this link: https://esmbot.net/invite

A command list can be found [here](https://esmbot.net/help.html).

If you want to self-host the bot, a guide can be found [here](https://docs.esmbot.net/setup).

## Credits
Icon by [Steel](https://twitter.com/MintBurrow).
All images, sounds, and fonts are copyright of their respective owners.
