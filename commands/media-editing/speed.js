import { Constants } from "oceanic.js";
import MediaCommand from "../../classes/mediaCommand.js";

class SpeedCommand extends MediaCommand {
  params() {
    const speed = parseInt(this.options.multiplier ?? this.args[0]);
    return {
      speed: Number.isNaN(speed) || speed < 1 ? 2 : speed
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

  static description = "Makes an image sequence faster";
  static aliases = ["speedup", "fast", "gifspeed", "faster"];
  static args = ["{multiplier}"];

  static requiresGIF = true;
  static noImage = "You need to provide an image/GIF to speed up!";
  static command = "speed";
}

export default SpeedCommand;
