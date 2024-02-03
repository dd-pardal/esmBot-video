import { Constants } from "oceanic.js";
import MediaCommand from "../../classes/mediaCommand.js";

class FreezeCommand extends MediaCommand {
  params() {
    const frameCount = parseInt(this.options.endframe ?? this.args[0]);
    return {
      loop: false,
      frame: Number.isNaN(frameCount) ? -1 : frameCount
    };
  }

  static init() {
    super.init();
    this.flags.push({
      name: "endframe",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Set the end frame (default: last frame)",
      min_value: 0
    });
    return this;
  }

  static description = "Makes an image sequence only play once";
  static aliases = ["noloop", "once"];
  static args = ["{end frame number}"];

  static requiresGIF = true;
  static noImage = "You need to provide an image/GIF to freeze!";
  static command = "freeze";
}

export default FreezeCommand;
