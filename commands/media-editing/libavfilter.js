import MediaCommand from "../../classes/mediaCommand.js";

class LavfilterCommand extends MediaCommand {
  static init() {
    super.init();
    this.flags.unshift({
      name: "filtergraph",
      type: 3,
      description: "The filtergraph description",
      required: true
    });
    return this;
  }

  run() {
    const filtergraph = this.options.filtergraph ?? this.args.join(" ").trim();
    if (filtergraph === "") {
      return "You need to provide a filtergraph description!";
    }
    return super.run();
  }

  ffmpegParams(url) {
    const newArgs = this.options.filtergraph ?? this.args.filter(item => !item.includes(url)).join(" ");
    return {
      filterGraph: newArgs
    };
  }

  static description = "Processes a video using a libavfilter filtergraph. See <https://ffmpeg.org/ffmpeg-filters.html>.";
  static aliases = ["lavfi"];
  static arguments = ["[filtergraph description]"];

  static noImage = "You need to provide an image/GIF to generate a meme!";
  static command = "libavfilter";

  static acceptsVideo = true;
  static ffmpegOnly = true;
}

export default LavfilterCommand;
