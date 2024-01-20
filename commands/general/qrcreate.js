import MediaCommand from "../../classes/mediaCommand.js";
import { cleanMessage } from "../../utils/misc.js";

class QrCreateCommand extends MediaCommand {
  params() {
    const cleanedMessage = cleanMessage(this.message ?? this.interaction, this.options.text ?? this.content);
    return {
      text: cleanedMessage
    };
  }

  static description = "Generates a QR code";
  static args = ["[text]"];

  static requiresImage = false;
  static requiresText = true;
  static noText = "You need to provide some text to generate a QR code!";
  static command = "qrcreate";
}

export default QrCreateCommand;