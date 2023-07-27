# Setup
Here are some instructions to get esmBot up and running from source.

## Recommended system requirements
    - 64-bit CPU/operating system
    - Quad-core CPU or better
    - 1GB or more of RAM
    - Linux-based operating system or virtual machine ([Ubuntu 22.04 LTS](https://ubuntu.com/download/server) or [Fedora 36](https://getfedora.org/) are recommended)

**Warning:** If you want to run the bot on Windows, [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10) is recommended. This guide is somewhat Linux-centric, so for now you're mostly on your own if you decide not to use WSL.

**Tip:** You can run the bot using Docker for a somewhat simpler setup experience. [Click here to go to the Docker setup guide.](https://docs.esmbot.net/docker)

## 1. Install the required native dependencies.
Choose the distro you're using below for insallation instructions.

### Debian/Ubuntu

These instructions apply to Debian version 12 (bookworm) or Ubuntu version 22.04 (jammy) or later.

```sh
sudo apt-get install git curl build-essential cmake ttf-mscorefonts-installer libmagick++-dev libvips-dev libcgif-dev libgirepository1.0-dev fonts-noto-color-emoji libimagequant-dev libvpx-dev libopus-dev libx264-dev libssl-dev
```

Additionally, if your architecture is x86 or x86_64, run:

```sh
sudo apt-get install nasm
```

On older Debian/Ubuntu versions, you may need to install some of these packages (notably libcgif-dev and meson) through alternative methods.


### Fedora/RHEL

These instructions apply to Fedora 36/RHEL 9 or later.

Some of these packages require that you add the RPM Fusion and/or EPEL repositories. You can find instructions on how to add them [here](https://rpmfusion.org/Configuration).

**TODO: Update with the packages necessary for video support.**

```sh
sudo dnf install git curl cmake ffmpeg sqlite gcc-c++ libcgif-devel ImageMagick-c++-devel vips-devel libimagequant-devel gobject-introspection-devel google-noto-emoji-color-fonts meson
```

On RHEL-based distros like AlmaLinux and Rocky Linux, you may need to add [Remi's RPM Repository](https://rpms.remirepo.net) for the vips package.


### Alpine

These instructions apply to the current Edge versions.

**TODO: Update with the packages necessary for video support.**

```sh
doas apk add git curl msttcorefonts-installer python3 sqlite3 alpine-sdk cmake ffmpeg imagemagick-dev vips-dev font-noto-emoji gobject-introspection-dev cgif-dev libimagequant-dev meson
```

### Arch/Manjaro

**TODO: Update with the packages necessary for video support.**

```sh
sudo pacman -S git curl cmake pango ffmpeg npm imagemagick libvips sqlite3 libltdl noto-fonts-emoji gobject-introspection libcgif libimagequant meson
```
You'll also need to install [`ttf-ms-win10-auto`](https://aur.archlinux.org/packages/ttf-ms-win10-auto/) from the AUR.


## 2. Install libvips.

[libvips](https://github.com/libvips/libvips) is the core of esmBot's image processing commands. Version 8.13.0 or higher is required and should be packaged for most distros; however, you may want to build from source to take advantage of the `nsgif` GIF decoder and its improved performance over the default ImageMagick decoder.

First, download the source and move into it:
```sh
git clone https://github.com/libvips/libvips
cd libvips
```
From here, you can set up the build:
```sh
meson setup --prefix=/usr --buildtype=release -Dnsgif=true build
```
If that command finishes with no errors, you can compile and install it:
```sh
cd build
meson compile
sudo meson install
```

### 3. Install Node.js.

Node.js is the runtime that esmBot is built on top of. The bot requires version 16 or above to run.

First things first, we'll need to install pnpm, the package manager used by the bot. Run the following to install it:
```sh
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Then, install Node.js version 16:

```sh
pnpm env use --global 16
```

### 4. Set up the database.

esmBot officially supports two database systems: SQLite and PostgreSQL. While SQLite is smaller and requires no initial setup, PostgreSQL has better performance (especially in large environments).

**Tip:** If you're new to databases and self-hosting, choose SQLite.

If you would like to use the SQLite database, no configuration is needed and you can move on to the next step.

If you would like to use the PostgreSQL database, view the setup instructions [here](https://docs.esmbot.net/postgresql) and come back here when you're finished.

### 5. Clone the repo and install the required Node modules.

```sh
cd ~
git clone --recursive https://github.com/esmBot/esmBot
cd esmBot
pnpm i -g node-gyp
pnpm install
pnpm build
```

### 6. (Optional) Set up Lavalink.

Lavalink is the audio server used by esmBot for soundboard commands and music playback. If you do not plan on using these features, you can safely skip this step.

**Warning:** There are websites out there providing lists of public Lavalink instances that can be used with the bot. However, these are not recommended due to performance/security concerns and missing features, and it is highly recommended to set one up yourself instead using the steps below.

Lavalink requires a Java (11 or later) installation. You can use [SDKMAN](https://sdkman.io) to install Eclipse Temurin, a popular Java distribution:
```sh
sdk install java 11.0.15-tem
```

Initial setup is like this:
```sh
cd ~
mkdir Lavalink
cd Lavalink
curl -OL https://github.com/freyacodes/Lavalink/releases/latest/download/Lavalink.jar
cp ~/esmBot/application.yml .
ln -s ~/esmBot/assets assets
```
To run Lavalink, you can use this command:
```sh
java -Djdk.tls.client.protocols=TLSv1.2 -jar Lavalink.jar
```

You'll need to run Lavalink alongside the bot in order to use it. There are a few methods to do this, such as the `screen` command, creating a new systemd service, or simply just opening a new terminal session alongside your current one.

### 7. Configure the bot.

Configuration is done via environment variables which can be specified through a `.env` file. Copy `.env.example` to get a starter config file:
```sh
cp .env.example .env
```

If you can't see either of these files, don't worry - Linux treats files whose names start with a . as hidden files.

To edit this file in the terminal, run this command:
```sh
nano .env
```
This will launch a text editor with the file ready to go. Create a Discord application [here](https://discord.com/developers/applications) and select the Bot tab on the left, then create a bot user. Once you've done this, copy the token it gives you and put it in the `TOKEN` variable.

When you're finished editing the file, press Ctrl + X, then Y and Enter.

An overview of each of the variables in the `.env` file can be found [here](https://docs.esmbot.net/config).

### 8. Run the bot.

Once everything else is set up, you can start the bot like so:
```sh
pnpm start
```
If the bot starts successfully, you're done! You can invite the bot to your server by generating an invite link under OAuth -> URL Generator in the Discord application dashboard.

You will need to select the `bot` and `applications.commands` scopes.
The following permissions are needed in most cases for the bot to work properly:

![Required permissions](assets/permissions.png){ loading=lazy, width=500 }

If you want the bot to run 24/7, you can use the [PM2](https://pm2.keymetrics.io) process manager. Install it using the following command:
```sh
pnpm add -g pm2
```

Once you've done that, you can start the bot using the following command:
```sh
pm2 start ecosystem.config.cjs
```

If you wish to update the bot to the latest version/commit at any time, just run `git pull` and `pnpm install`.

## Troubleshooting

### "Error: Cannot find module './build/Release/image.node'"
The native image functions haven't been built. Run `pnpm run build` to build them.

### "`pnpm install` or `pnpm build` fails with error 'ELIFECYCLE  Command failed.'"
You seem to be missing node-gyp. This can be fixed by running:
```sh
pnpm i -g node-gyp
rm -rf node_modules
pnpm install
```

### "Error: connect ECONNREFUSED 127.0.0.1:5432"
PostgreSQL isn't running, you should be able to start it with `sudo systemctl start postgresql`. If you don't intend to use PostgreSQL, you should take another look at your `DB` variable in the .env file.

### "Gifs from Tenor result in a "no decode delegate for this image format" or "improper image header" error"
Tenor GIFs are actually stored as MP4s, which libvips can't decode most of the time. You'll need to get a Tenor API key from [here](https://developers.google.com/tenor/guides/quickstart) and put it in the `TENOR` variable in .env.
