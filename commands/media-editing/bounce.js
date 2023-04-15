import MediaCommand from "../../classes/mediaCommand.js";

class BounceCommand extends MediaCommand {
  static description = "Makes an image bounce up and down";
  static aliases = ["bouncy"];

  static noImage = "You need to provide an image/GIF to bounce!";
  static command = "bounce";
}

export default BounceCommand;
