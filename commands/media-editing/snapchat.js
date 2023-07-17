import MediaCommand from "../../classes/mediaCommand.js";
import { cleanMessage } from "../../utils/misc.js";

class SnapchatCommand extends MediaCommand {
  params(url) {
    const newArgs = this.options.text ?? this.args.filter(item => !item.includes(url)).join(" ");
    const position = Number.parseFloat(this.options.position);
    return {
      caption: cleanMessage(this.message ?? this.interaction, newArgs),
      pos: !Number.isFinite(position) ? 0.5 : position,
      font: typeof this.options.font === "string" && this.constructor.allowedFonts.includes(this.options.font.toLowerCase()) ? this.options.font.toLowerCase() : "helvetica neue"
    };
  }

  ffmpegParams(url) {
    const params = this.params(url);
    return {
      filterGraph: `\
split
[input1][input2];

[input1]
ebsnapchatref=text=\\''${params.caption}'\\':font=\\''${params.font}'\\'
[overlay];

[input2][overlay]
overlay=y=${params.pos}*main_h:shortest=1`
    };
  }

  static init() {
    super.init();
    this.flags.push({
      name: "position",
      type: 10,
      description: "Set the position of the caption as a decimal (0.0 is top, 1.0 is bottom, default is 0.5)",
      min_value: 0,
      max_value: 1
    }, {
      name: "font",
      type: 3,
      choices: (() => {
        const array = [];
        for (const font of this.allowedFonts) {
          array.push({ name: font, value: font });
        }
        return array;
      })(),
      description: "Specify the font you want to use (default: helvetica neue)"
    });
    return this;
  }

  static description = "Adds a Snapchat style caption to an image";
  static aliases = ["snap", "caption3"];
  static arguments = ["[text]"];

  static requiresText = true;
  static noText = "You need to provide some text to add a caption!";
  static noImage = "You need to provide an image/GIF to add a caption!";
  static command = "snapchat";

  static acceptsVideo = true;
  static ffmpegOnly = true;
}

export default SnapchatCommand;
