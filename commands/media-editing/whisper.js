import MediaCommand from "../../classes/mediaCommand.js";
import { cleanMessage } from "../../utils/misc.js";

class WhisperCommand extends MediaCommand {
  params(url) {
    const newArgs = this.options.text ?? this.args.filter(item => !item.includes(url)).join(" ");
    return {
      caption: cleanMessage(this.message ?? this.interaction, newArgs)
    };
  }

  static description = "Adds a Whisper style caption to an image";
  static aliases = ["caption4"];
  static args = ["[text]"];

  static requiresText = true;
  static noText = "You need to provide some text to add a caption!";
  static noImage = "You need to provide an image/GIF to add a caption!";
  static command = "whisper";
}

export default WhisperCommand;
