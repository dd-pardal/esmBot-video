import MediaCommand from "../../classes/mediaCommand.js";

class FormatCommand extends MediaCommand {
  static description = "Changes the format of an image/video";
  static aliases = ["convert", "changeformat"];

  ffmpegParams() {
	return {
		format: this.options.format ?? this.args.join(" ").trim()
	}
  }

  static noImage = "You need to provide a file to convert!";
  static acceptsVideo = true;
  static ffmpegOnly = true;
  static command = "format";
}

export default FormatCommand;
