import MediaCommand from "../../classes/mediaCommand.js";
import { cleanMessage } from "../../utils/misc.js";

class HomebrewCommand extends MediaCommand {
  params(url) {
    const newArgs = this.options.text ?? this.args.filter(item => !item.includes(url)).join(" ");
    return {
      caption: cleanMessage(this.message ?? this.interaction, newArgs)
    };
  }

  static description = "Creates a Homebrew Channel edit";
  static aliases = ["hbc", "brew", "wiibrew"];
  static args = ["[text]"];

  static requiresImage = false;
  static requiresText = true;
  static noText = "You need to provide some text to make a Homebrew Channel edit!";
  static command = "homebrew";
}

export default HomebrewCommand;