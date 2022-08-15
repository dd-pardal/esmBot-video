import MediaCommand from "../../classes/mediaCommand.js";

class MemeCommand extends MediaCommand {
  params(url) {
    const newArgs = this.options.text ?? this.args.filter(item => !item.includes(url)).join(" ");
    const [topText, bottomText] = newArgs.split(/(?<!\\),/).map(elem => elem.trim());
    return {
      top: (this.options.case ? topText : topText.toUpperCase()).replaceAll("&", "&amp;").replaceAll(">", "&gt;").replaceAll("<", "&lt;").replaceAll("\"", "&quot;").replaceAll("'", "&apos;").replaceAll("\\n", "\n"),
      bottom: bottomText ? (this.options.case ? bottomText : bottomText.toUpperCase()).replaceAll("&", "&amp;").replaceAll(">", "&gt;").replaceAll("<", "&lt;").replaceAll("\"", "&quot;").replaceAll("'", "&apos;").replaceAll("\\n", "\n") : "",
      font: typeof this.options.font === "string" && this.constructor.allowedFonts.includes(this.options.font.toLowerCase()) ? this.options.font.toLowerCase() : "impact"
    };
  }

  static init() {
    super.init();
    this.flags.push({
      name: "case",
      description: "Make the meme text case-sensitive (allows for lowercase text)",
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
      description: "Specify the font you want to use (default: impact)"
    });
    return this;
  }

  static description = "Generates a meme from an image (separate top/bottom text with a comma)";
  static arguments = ["[top text]", "{bottom text}"];

  static requiresText = true;
  static noText = "You need to provide some text to generate a meme!";
  static noImage = "You need to provide an image/GIF to generate a meme!";
  static command = "meme";
}

export default MemeCommand;
