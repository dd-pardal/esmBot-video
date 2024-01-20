import MediaCommand from "../../classes/mediaCommand.js";
import { cleanMessage } from "../../utils/misc.js";

class SonicCommand extends MediaCommand {
  params() {
    const cleanedMessage = cleanMessage(this.message ?? this.interaction, this.options.text ?? this.args.join(" "));
    return {
      text: cleanedMessage
    };
  }

  static description = "Creates a Sonic speech bubble image";
  static args = ["[text]"];

  static requiresImage = false;
  static requiresText = true;
  static noText = "You need to provide some text to make a Sonic meme!";
  static command = "sonic";
}

export default SonicCommand;