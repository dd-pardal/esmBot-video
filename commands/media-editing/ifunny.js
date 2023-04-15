import MediaCommand from "../../classes/mediaCommand.js";

class iFunnyCommand extends MediaCommand {
  params = {
    water: "assets/images/ifunny.png",
    gravity: 8,
    resize: true,
    append: true
  };

  static description = "Adds the iFunny watermark to an image";

  static noImage = "You need to provide an image/GIF to add an iFunny watermark!";
  static command = "watermark";
}

export default iFunnyCommand;
