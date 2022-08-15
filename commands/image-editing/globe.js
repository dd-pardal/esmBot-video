import MediaCommand from "../../classes/mediaCommand.js";

class GlobeCommand extends MediaCommand {
  static description = "Spins an image";
  static aliases = ["sphere"];

  static noImage = "You need to provide an image/GIF to spin!";
  static command = "globe";
}

export default GlobeCommand;
