import MediaCommand from "../../classes/mediaCommand.js";

class ExplodeCommand extends MediaCommand {
  static description = "Explodes an image";
  static aliases = ["exp"];

  static noImage = "You need to provide an image/GIF to explode!";
  static command = "explode";
}

export default ExplodeCommand;
