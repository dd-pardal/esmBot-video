import MediaCommand from "../../classes/mediaCommand.js";

class ImplodeCommand extends MediaCommand {
  params = {
    amount: 1
  };

  static description = "Implodes an image";
  static aliases = ["imp"];

  static noImage = "You need to provide an image/GIF to implode!";
  static command = "explode";
}

export default ImplodeCommand;
