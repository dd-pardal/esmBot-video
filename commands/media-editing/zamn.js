import MediaCommand from "../../classes/mediaCommand.js";

class ZamnCommand extends MediaCommand {
  static description = "Adds a \"ZAMN\" reaction to an image";

  static noImage = "You need to provide an image/GIF to \"ZAMN\" at!";
  static command = "zamn";
}

export default ZamnCommand;
