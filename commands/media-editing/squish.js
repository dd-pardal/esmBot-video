import MediaCommand from "../../classes/mediaCommand.js";

class SquishCommand extends MediaCommand {
  static description = "Squishes/stretches an image";
  static aliases = ["squishy", "squash"];

  static noImage = "You need to provide an image/GIF to squish!";
  static command = "squish";
}

export default SquishCommand;
