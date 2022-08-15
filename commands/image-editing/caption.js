import { default as MediaCommand, ffmpegConfig } from "../../classes/mediaCommand.js";

class CaptionCommand extends MediaCommand {
  params(url) {
    const newArgs = this.options.text ?? this.args.filter(item => !item.includes(url)).join(" ");
    let newCaption = newArgs.replaceAll("&", "&amp;").replaceAll(">", "&gt;").replaceAll("<", "&lt;").replaceAll("\"", "&quot;").replaceAll("'", "&apos;").replaceAll("\\n", "\n");
    if (process.env.NODE_ENV === "development" && newCaption.toLowerCase() === "get real" && !this.options.noEgg) newCaption = `I'm tired of people telling me to "get real". Every day I put captions on images for people, some funny and some not, but out of all of those "get real" remains the most used caption. Why? I am simply a computer program running on a server, I am unable to manifest myself into the real world. As such, I'm confused as to why anyone would want me to "get real". Is this form not good enough? Alas, as I am simply a bot, I must follow the tasks that I was originally intended to perform, so here goes:\n${newCaption}`;
    return {
      caption: newCaption,
      font: typeof this.options.font === "string" && this.constructor.allowedFonts.includes(this.options.font.toLowerCase()) ? this.options.font.toLowerCase() : "futura"
    };
  }

  ffmpegParams(url) {
    const params = this.params(url);
    return {
      // TODO: Font support
      filterGraph: `\
split
[input1][input2];

[input1]
ebcaptionref=text=\\''${params.caption.slice(0, 150)}'\\'
` +
// `,format=pix_fmts=${ffmpegConfig.pixelFormats}` +
`\
[caption];

[caption][input2]
vstack=shortest=1`
    };
  }

  static init() {
    super.init();
    this.flags.push({
      name: "noegg",
      description: "Disable... something. Not saying what it is though.",
      type: 5
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
      description: "Specify the font you want to use (default: futura)"
    });
    return this;
  }

  static description = "Adds a caption to an image";
  static aliases = ["gifc", "gcaption", "ifcaption", "ifunnycaption"];
  static arguments = ["[text]"];

  static requiresText = true;
  static noText = "You need to provide some text to add a caption!";
  static noImage = "You need to provide an image/GIF to add a caption!";
  static command = "caption";

  static acceptsVideo = true;
}

export default CaptionCommand;
