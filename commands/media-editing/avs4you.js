import MediaCommand from "../../classes/mediaCommand.js";

class AVSCommand extends MediaCommand {
  params = {
    water: "assets/images/avs4you.png",
    gravity: 5,
    resize: true
  };

  static description = "Adds the avs4you watermark to an image";
  static aliases = ["a4y", "avs"];

  static noImage = "You need to provide an image/GIF to add an avs4you watermark!";
  static command = "watermark";
}

export default AVSCommand;
