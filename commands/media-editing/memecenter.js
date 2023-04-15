import MediaCommand from "../../classes/mediaCommand.js";

class MemeCenterCommand extends MediaCommand {
  params = {
    water: "assets/images/memecenter.png",
    gravity: 9,
    mc: true
  };

  static description = "Adds the MemeCenter watermark to an image";
  static aliases = ["memec", "mcenter"];

  static noImage = "You need to provide an image/GIF to add a MemeCenter watermark!";
  static command = "watermark";
}

export default MemeCenterCommand;
