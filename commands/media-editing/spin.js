import MediaCommand from "../../classes/mediaCommand.js";

class SpinCommand extends MediaCommand {
  static description = "Spins an image";
  static aliases = ["rotate"];

  static noImage = "You need to provide an image/GIF to spin!";
  static command = "spin";
}

export default SpinCommand;
