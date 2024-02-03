import { Constants } from "oceanic.js";
import MediaCommand from "../../classes/mediaCommand.js";

class SlowCommand extends MediaCommand {
  params() {
    const speed = parseInt(this.options.multiplier ?? this.args[0]);
    return {
      slow: true,
      speed: Number.isNaN(speed) ? 2 : speed
    };
  }

  static init() {
    super.init();
    this.flags.push({
      name: "multiplier",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Set the speed multiplier (default: 2)",
      min_value: 1
    });
    return this;
  }

  static description = "Makes an image sequence slower";
  static aliases = ["slowdown", "slower", "gifspeed2"];
  static args = ["{multiplier}"];

  static requiresGIF = true;
  static noImage = "You need to provide an image/GIF to slow down!";
  static command = "speed";
}

export default SlowCommand;
