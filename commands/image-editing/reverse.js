import MediaCommand from "../../classes/mediaCommand.js";

class ReverseCommand extends MediaCommand {
  static description = "Reverses an image sequence";
  static aliases = ["backwards"];

  static requiresGIF = true;
  static noImage = "You need to provide an image/GIF to reverse!";
  static command = "reverse";
}

export default ReverseCommand;
