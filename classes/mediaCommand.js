import Command from "./command.js";
import mediaDetect from "../utils/media-detection.js";
import { runImageJob } from "../utils/image.js";
import { runningCommands } from "../utils/collections.js";
import { readFileSync } from "fs";
const { emotes } = JSON.parse(readFileSync(new URL("../config/messages.json", import.meta.url)));
import { random } from "../utils/misc.js";
import { selectedImages } from "../utils/collections.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, rm } from "fs/promises";
import ConcurrencyLimiter from "../utils/concurrency-limiter.js";

const execFileP = promisify(execFile);

export const ffmpegConfig = {
  // Pixel formats supported by the encoder, separated by "|"
  pixelFormats: "yuv420p|yuva420p"
};

const limiter = new ConcurrencyLimiter(Number.parseInt(process.env.MEDIA_CONCURRENCY_LIMIT));

class MediaCommand extends Command {
  async criteria() {
    return true;
  }

  async run() {
    this.success = false;
    const timestamp = this.type === "classic" ? this.message.createdAt : Math.floor((this.interaction.id / 4194304) + 1420070400000);
    // check if this command has already been run in this channel with the same arguments, and we are awaiting its result
    // if so, don't re-run it
    if (runningCommands.has(this.author.id) && (new Date(runningCommands.get(this.author.id)) - new Date(timestamp)) < 5000) {
      return "Please slow down a bit.";
    }
    // before awaiting the command result, add this command to the set of running commands
    runningCommands.set(this.author.id, timestamp);

    const imageParams = {
      cmd: this.constructor.command,
      params: {
        togif: !!this.options.togif
      },
      id: (this.interaction ?? this.message).id
    };
    let media;

    if (this.type === "application") await this.acknowledge();

    if (this.constructor.requiresImage) {
      try {
        const selection = selectedImages.get(this.author.id);
        media = selection ?? await mediaDetect(this.client, this.message, this.interaction, this.options, true, true);
        if (selection) selectedImages.delete(this.author.id);
        if (media === undefined) {
          runningCommands.delete(this.author.id);
          return `${this.constructor.noImage} (Tip: try right-clicking/holding on a message and press Apps -> Select Image, then try again.)`;
        } else if (media.type === "large") {
          runningCommands.delete(this.author.id);
          return "That file is too large (>= 25MB)! Try using a smaller file.";
        } else if (media.type === "tenorlimit") {
          runningCommands.delete(this.author.id);
          return "I've been rate-limited by Tenor. Please try uploading your GIF elsewhere.";
        }
      } catch (e) {
        runningCommands.delete(this.author.id);
        throw e;
      }
    }

    if (this.constructor.requiresText) {
      const text = this.options.text ?? this.args.join(" ").trim();
      if (text.length === 0 || !await this.criteria(text, media.url)) {
        runningCommands.delete(this.author.id);
        return this.constructor.noText;
      }
    }

    if (media.mediaType === "video" && !this.constructor.acceptsVideo) {
      runningCommands.delete(this.author.id);
      return `This command only supports ${this.constructor.requiresGIF ? "" : "images and "}GIFs.`;
    }

    let status;
    if ((media.mediaType === "video" || media.type === "image/gif") && this.type === "classic") {
      status = await this.processMessage(this.message.channel ?? await this.client.rest.channels.get(this.message.channelID));
    }

    return limiter.runWhenFree(async () => {
      if (this.constructor.ffmpegOnly || media.mediaType === "video") {
        const outputFilename = `/tmp/esmBot-${Math.random().toString(36).substring(2, 15)}.webm`;
        try {
          const params = this.ffmpegParams(media.url);
          // TODO: Stream the data from FFmpeg directly to Discord and to a file in TEMPDIR. If
          // there is an error, abort the request and remove the file. If the request body exceeds
          // 8MiB, abort the request and, when processing has finished, send the embed with the
          // link to TMP_DOMAIN and keep the file. If there is no error and the request doesn't
          // exceed 8MiB, remove the file.
          const output = await execFileP("ffmpeg/ffmpeg", [
            // Global options
            "-y", "-nostats",
            // Input
            "-i", media.url,
            // Filter
            "-vf", `fps=25, scale='min(${process.env.MAX_VIDEO_DIMENSIONS},iw)':'min(${process.env.MAX_VIDEO_DIMENSIONS},ih)':force_original_aspect_ratio=decrease:sws_flags=fast_bilinear, ${params.filterGraph}, scale='min(${process.env.MAX_VIDEO_DIMENSIONS},iw)':'min(${process.env.MAX_VIDEO_DIMENSIONS},ih)':force_original_aspect_ratio=decrease:sws_flags=fast_bilinear`,
            // Video encoding
            "-c:v", "libvpx", "-minrate", "500k", "-b:v", "2000k", "-maxrate", "5000k", "-cpu-used", "5", "-auto-alt-ref", "0",
            // Audio encoding
            "-c:a", "libopus", "-b:a", "64000",
            // Output
            "-fs", process.env.MAX_VIDEO_SIZE, "-f", "webm", outputFilename,
          ], {
            // TODO: Send a SIGKILL some seconds after the timeout in case FFmpeg hangs
            timeout: Number.parseInt(process.env.VIDEO_SOFT_TIMEOUT)
          });
          return {
            contents: await readFile(outputFilename),
            name: `${this.constructor.command}.webm`
          }
        } finally {
          rm(outputFilename).catch(() => {});
          try {
            if (status) await status.delete();
          } catch {
            // no-op
          }
          runningCommands.delete(this.author.id);
        }
      } else {
        imageParams.path = media.path;
        imageParams.params.type = media.type;
        imageParams.url = media.url; // technically not required but can be useful for text filtering
        imageParams.name = media.name;
        if (this.constructor.requiresGIF) imageParams.onlyGIF = true;

        if (typeof this.params === "function") {
          Object.assign(imageParams.params, this.params(imageParams.url, imageParams.name));
        } else if (typeof this.params === "object") {
          Object.assign(imageParams.params, this.params);
        }

        try {
          const { buffer, type } = await runImageJob(imageParams);
          if (type === "nogif" && this.constructor.requiresGIF) {
            return "That isn't a GIF!";
          }
          this.success = true;
          return {
            contents: buffer,
            name: `${this.constructor.command}.${type}`
          };
        } catch (e) {
          if (e === "Request ended prematurely due to a closed connection") return "This image job couldn't be completed because the server it was running on went down. Try running your command again.";
          if (e === "Job timed out" || e === "Timeout") return "The image is taking too long to process (>=15 minutes), so the job was cancelled. Try using a smaller image.";
          if (e === "No available servers") return "I can't seem to contact the image servers, they might be down or still trying to start up. Please wait a little bit.";
          throw e;
        } finally {
          try {
            if (status) await status.delete();
          } catch {
            // no-op
          }
          runningCommands.delete(this.author.id);
        }
      }
    });

  }

  processMessage(channel) {
    return channel.createMessage({
      content: `${random(emotes) || process.env.PROCESSING_EMOJI || "<a:processing:479351417102925854>"} Processing... This might take a while`
    });
  }

  static init() {
    this.flags = [];
    if (this.requiresText || this.textOptional) {
      this.flags.push({
        name: "text",
        type: 3,
        description: "The text to put on the image",
        required: !this.textOptional
      });
    }
    if (this.requiresImage) {
      this.flags.push({
        name: this.acceptsVideo ? "media" : "image",
        type: 11,
        description: `An image/GIF${this.acceptsVideo ? "/video" : ""} attachment`
      }, {
        name: "link",
        type: 3,
        description: `An image/GIF${this.acceptsVideo ? "/video" : ""} URL`
      });
    }
    this.flags.push({
      name: "togif",
      type: 5,
      description: "Force GIF output if the input is an image"
    });
    return this;
  }

  static allowedFonts = ["futura", "impact", "helvetica", "arial", "roboto", "noto", "times", "comic sans ms"];

  static requiresImage = true;
  static requiresText = false;
  static textOptional = false;
  static requiresGIF = false;
  static acceptsVideo = false;
  static ffmpegOnly = false;
  static noImage = "You need to provide an image/GIF!";
  static noText = "You need to provide some text!";
  static command = "";
}

export default MediaCommand;
