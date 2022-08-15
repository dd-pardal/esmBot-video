import MediaCommand from "../../classes/mediaCommand.js";

class HomebrewCommand extends MediaCommand {
  params() {
    return {
      caption: (this.options.text ?? this.args.join(" ")).toLowerCase().replaceAll("\n", " ")
    };
  }

  static description = "Creates a Homebrew Channel edit";
  static aliases = ["hbc", "brew", "wiibrew"];
  static arguments = ["[text]"];

  static requiresImage = false;
  static requiresText = true;
  static noText = "You need to provide some text to make a Homebrew Channel edit!";
  static command = "homebrew";
}

export default HomebrewCommand;