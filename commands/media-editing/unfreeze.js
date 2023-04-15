import MediaCommand from "../../classes/mediaCommand.js";

class UnfreezeCommand extends MediaCommand {
  params = {
    loop: true
  };

  static description = "Unfreezes an image sequence";

  static requiresGIF = true;
  static noImage = "You need to provide an image/GIF to unfreeze!";
  static command = "freeze";
}

export default UnfreezeCommand;
