import Command from "./command.js";
import mediaDetect from "../utils/media-detection.js";
import { runImageJob } from "../utils/image.js";
import { runningCommands } from "../utils/collections.js";
import { clean, random } from "../utils/misc.js";
import { selectedImages } from "../utils/collections.js";
import messages from "../config/messages.json" assert { type: "json" };
import { Constants } from "oceanic.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, rm, stat } from "fs/promises";
import ConcurrencyLimiter from "../utils/concurrency-limiter.js";

const execFileP = promisify(execFile);

const allowedImageOutTypes = new Set(["png", "jpg", "jpeg", "gif"]);
const defaultCodecs = new Map([
  ["png", { video: "png", audio: "none" }],
  ["jpeg", { video: "jpeg", audio: "none" }],
  ["jpg", { video: "jpeg", audio: "none" }],
  ["gif", { video: "gif", audio: "none" }],
  ["webm", { video: "vp8", audio: "opus" }],
  ["mp4", { video: "avc", audio: "aac" }],
]);

const limiter = new ConcurrencyLimiter(process.env.MEDIA_CONCURRENCY_LIMIT ? Number.parseInt(process.env.MEDIA_CONCURRENCY_LIMIT) : Infinity);

const childProcesses = new Set();
process.on("exit", () => {
  for (const child of childProcesses) {
    child.kill("SIGKILL");
  }
});

class MediaCommand extends Command {
  async criteria() {
    return true;
  }

  async run() {
    this.success = false;
    const timestamp = this.type === "classic" ? this.message.createdAt : Math.floor((this.interaction.id / 4194304) + 1420070400000);
    // check if this command has already been run in this channel with the same arguments, and we are awaiting its result
    // if so, don't re-run it
    if (runningCommands.has(this.author.id) && (new Date(runningCommands.get(this.author.id)).getTime() - new Date(timestamp).getTime()) < 5000) {
      return "Please slow down a bit.";
    }
    // before awaiting the command result, add this command to the set of running commands
    runningCommands.set(this.author.id, timestamp);

    let media;

    if (this.type === "application") await this.acknowledge();

    let needsSpoiler = false;
    if (this.constructor.requiresImage) {
      try {
        const selection = selectedImages.get(this.author.id);
        media = selection ?? await mediaDetect(this.client, this.message, this.interaction, this.options, true, this.ffmpegOnly).catch(e => {
          if (e.name === "AbortError") return { type: "timeout" };
          throw e
        });
        needsSpoiler = media.spoiler;
        if (selection) selectedImages.delete(this.author.id);
        if (media === undefined) {
          runningCommands.delete(this.author.id);
          return `${this.constructor.noImage} (Tip: try right-clicking/holding on a message and press Apps -> Select Image, then try again.)`;
        } else if (media.type === "large") {
          runningCommands.delete(this.author.id);
          return "That file is too large (>= 40MB)! Try using a smaller file.";
        } else if (media.type === "tenorlimit") {
          runningCommands.delete(this.author.id);
          return "I've been rate-limited by Tenor. Please try uploading your GIF elsewhere.";
        } else if (media.type === "timeout") {
          runningCommands.delete(this.author.id);
          return "The request to get that image timed out. Please try again, upload your image elsewhere, or use another image.";
        }
      } catch (e) {
        runningCommands.delete(this.author.id);
        throw e;
      }
    }

    if ("spoiler" in this.options) needsSpoiler = this.options.spoiler;

    if (this.constructor.requiresText) {
      const text = this.options.text ?? this.args.join(" ").trim();
      if (text.length === 0 || !await this.criteria(text, media?.url)) {
        runningCommands.delete(this.author.id);
        return this.constructor.noText;
      }
    }

    if (media?.mediaType === "video" && !this.constructor.acceptsVideo) {
      runningCommands.delete(this.author.id);
      return `This command only supports ${this.constructor.requiresGIF ? "" : "images and "}GIFs.`;
    }

    let status;

    if (this.constructor.ffmpegOnly || media?.mediaType === "video") {
      const params = this?.ffmpegParams(media.url) ?? {};

      let format = params.format ?? this.options.format;
      if (format) {
        if (!defaultCodecs.has(format)) {
          return `Unknown format. Please use one of the following: png, jpeg, gif, webm, mp4.`;
        }
      } else {
        // Use the same format as the input
        if (media.gifv) {
          format = "gif";
        } else {
          format = media.type?.match(/(?<=^\w+\/)[\w\d]+/)?.[0];
          if (!defaultCodecs.has(format)) {
            format = media.type?.startsWith("image/") ? "png" : "webm";
          }
        }
      }

      const codecs = defaultCodecs.get(format);

      if (this.type === "classic") {
        status = await this.processMessage(this.message.channel ?? await this.client.rest.channels.get(this.message.channelID));
      }

      return limiter.runWhenFree(async () => {
        const outputFilename = `/tmp/esmBot-${Math.random().toString(36).substring(2, 15)}.${format}`;
        // TODO: Stream the data from FFmpeg directly to Discord. If there is an error, abort the
        // request. If the request body exceeds 25MiB, abort the request and, when processing has
        // finished, write the output to a file and send the embed with the link to TMP_DOMAIN.

        let killed = false;
        const softTimeout = setTimeout(() => {
          promise.child.kill("SIGTERM");
        }, Number.parseInt(process.env.VIDEO_SOFT_TIMEOUT));
        const hardTimeout = setTimeout(() => {
          promise.child.kill("SIGKILL");
          killed = true;
        }, Number.parseInt(process.env.VIDEO_HARD_TIMEOUT));

        const ffmpegArgs = [
          // Global options
          "-y", "-nostats", "-nostdin", "-hide_banner", ...(process.env.FFMPEG_MEMORY_LIMIT ? ["-memorylimit", process.env.FFMPEG_MEMORY_LIMIT] : []),
          // Input
          "-i", media.path,
          // Filter
          ...(
            params.filterGraph ? ["-vf", `\
              scale='min(${process.env.MAX_VIDEO_DIMENSIONS},iw)':'min(${process.env.MAX_VIDEO_DIMENSIONS},ih)':force_original_aspect_ratio=decrease:sws_flags=fast_bilinear,
              ${params.filterGraph},
              scale='min(${process.env.MAX_VIDEO_DIMENSIONS},iw)':'min(${process.env.MAX_VIDEO_DIMENSIONS},ih)':force_original_aspect_ratio=decrease:sws_flags=fast_bilinear${codecs.video === "avc" ? ":force_divisible_by=2" : ""}` +
              (codecs.video === "gif" ? ",split[gifp0][gifp1]; [gifp0]palettegen[gifp]; [gifp1][gifp]paletteuse" : "")] : []
          ),

          // Video encoding
          ...(
            codecs.video === "vp8" ? ["-c:v", "libvpx", "-minrate", "500k", "-b:v", "2000k", "-maxrate", "5000k", "-cpu-used", "5", "-auto-alt-ref", "0"] :
            codecs.video === "avc" ? ["-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "23"] :
            codecs.video === "gif" ? [] :
            codecs.video === "png" ? ["-frames:v", "1", "-update", "1"] :
            codecs.video === "jpeg" ? ["-frames:v", "1", "-update", "1"] :
            ["-vn"]
          ),

          // Audio encoding
          ...(
            codecs.audio === "opus" ? ["-c:a", "libopus", "-b:a", "64k"] :
            codecs.audio === "aac" ? ["-c:a", "aac", "-b:a", "80k"] :
            ["-an"]
          ),

          // Output
          "-fps_mode", "vfr",
          "-fs", process.env.MAX_VIDEO_SIZE,
          ...(format === "mp4" ? ["-movflags", "+faststart"] : []),
          outputFilename,
        ];
        console.debug(`Running ffmpeg ${ffmpegArgs.map(a => `'${a.replace(/\n\s*/g, " ").replaceAll("'", "'\\''")}'`).join(" ")}`);
        const promise = execFileP("ffmpeg/ffmpeg", ffmpegArgs);
        childProcesses.add(promise.child);

        const cleanup = () => {
          rm(outputFilename).catch(() => {});
          childProcesses.delete(promise.child);
          clearTimeout(softTimeout);
          clearTimeout(hardTimeout);
          try {
            if (status) status.delete().catch(() => {});
          } catch {
            // no-op
          }
          runningCommands.delete(this.author.id);
        }

        let text = undefined;
        let output;
        try {
          await promise;
        } catch (err) {
          if (err.stderr.includes("Cannot allocate memory") || err.stderr.includes("Resource temporarily unavailable") || err.stderr.match(/malloc of size \d+ failed/)) {
            output = "I don't have enough memory to run your command. Try using a smaller file."
          } else if (killed) {
            const statObj = await stat(outputFilename).catch(() => undefined);
            if (statObj !== undefined && statObj.size > 0) {
              text = "Your command took too long to execute and the processing was forcefully stopped. Try using a smaller file. The following output might be corrupted.";
            } else {
              output = "Your command took too long to execute and the processing was forcefully stopped. Try using a smaller file.";
            }
          } else if (err.code !== 255) {
            // FFmpeg exits with code 255 when it recieves SIGTERM.
            cleanup();
            throw `FFmpeg exited with code ${err.code}\nstderr: ${err.stderr}`;
          }
        }
        output ??= {
          text,
          contents: await readFile(outputFilename),
          name: `${needsSpoiler ? "SPOILER_" : ""}${this.constructor.command}.${format}`
        };
        cleanup();
        return output;
      });
    } else {
      const imageParams = {
        cmd: this.constructor.command,
        params: {},
        id: (this.interaction ?? this.message).id
      };

      if (this.constructor.requiresImage) {
        imageParams.path = media.path;
        imageParams.params.type = media.type;
        imageParams.url = media.url; // technically not required but can be useful for text filtering
        imageParams.name = media.name;
        if (this.constructor.requiresGIF) imageParams.onlyGIF = true;
      }

      if (typeof this.params === "function") {
        Object.assign(imageParams.params, this.params(imageParams.url, imageParams.name));
      } else if (typeof this.params === "object") {
        Object.assign(imageParams.params, this.params);
      }

      if (media?.type === "image/gif" && this.type === "classic") {
        status = await this.processMessage(this.message.channel ?? await this.client.rest.channels.get(this.message.channelID));
      }

      if (this.options.format) {
        if (allowedImageOutTypes.has(this.options.format)) {
          imageParams.params.outType = this.options.format;
        } else {
          return "When used with images, this command only supports the following output formats: png, jpeg, gif.";
        }
      }

      return limiter.runWhenFree(async () => {
        try {
          const { buffer, type } = await runImageJob(imageParams);
          if (type === "ratelimit") return "I've been ratelimited by the server hosting that image. Try uploading your image somewhere else.";
          if (type === "nocmd") return "That command isn't supported on this instance of esmBot.";
          if (type === "nogif" && this.constructor.requiresGIF) return "That isn't a GIF!";
          if (type === "empty") return this.constructor.empty;
          this.success = true;
          if (type === "text") return `\`\`\`\n${await clean(buffer.toString("utf8"))}\n\`\`\``;
          return {
            contents: buffer,
            name: `${needsSpoiler ? "SPOILER_" : ""}${this.constructor.command}.${type}`
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
      });
    }
  }

  processMessage(channel) {
    return channel.createMessage({
      content: `${random(messages.emotes) || process.env.PROCESSING_EMOJI || "<a:processing:479351417102925854>"} Processing... This might take a while`
    });
  }

  static init() {
    this.flags = [];
    if (this.requiresText || this.textOptional) {
      this.flags.push({
        name: "text",
        type: Constants.ApplicationCommandOptionTypes.STRING,
        description: "The text to put on the image",
        required: !this.textOptional
      });
    }
    if (this.requiresImage) {
      this.flags.push({
        name: this.acceptsVideo ? "media" : "image",
        type: Constants.ApplicationCommandOptionTypes.ATTACHMENT,
        description: `An image/GIF${this.acceptsVideo ? "/video" : ""} attachment`
      }, {
        name: "link",
        type: Constants.ApplicationCommandOptionTypes.STRING,
        description: `An image/GIF${this.acceptsVideo ? "/video" : ""} URL`
      });
    }
    this.flags.push({
      name: "format",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The output format (png, jpeg, gif, webm, mp4)"
    }, {
      name: "spoiler",
      type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      description: "Attempt to send output as a spoiler"
    });
    return this;
  }

  static allowedFonts = ["futura", "impact", "helvetica", "helvetica neue", "arial", "roboto", "noto", "times", "comic sans ms"];

  static requiresImage = true;
  static requiresText = false;
  static textOptional = false;
  static requiresGIF = false;
  static acceptsVideo = false;
  static ffmpegOnly = false;
  static noImage = "You need to provide an image/GIF!";
  static noText = "You need to provide some text!";
  static empty = "The resulting output was empty!";
  static command = "";
}

export default MediaCommand;
