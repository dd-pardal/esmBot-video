import fetch from "node-fetch";
import { getType } from "./image.js";

const tenorURLs = [
  "tenor.com",
  "www.tenor.com"
];
const giphyURLs = [
  "giphy.com",
  "www.giphy.com",
  "i.giphy.com"
];
const giphyMediaURLs = [ // there could be more of these
  "media.giphy.com",
  "media0.giphy.com",
  "media1.giphy.com",
  "media2.giphy.com",
  "media3.giphy.com",
  "media4.giphy.com"
];
const imgurURLs = [
  "imgur.com",
  "www.imgur.com",
  "i.imgur.com"
];
const gfycatURLs = [
  "gfycat.com",
  "www.gfycat.com",
  "thumbs.gfycat.com",
  "giant.gfycat.com"
];

const combined = [...tenorURLs, ...giphyURLs, ...giphyMediaURLs, ...imgurURLs, ...gfycatURLs];

const imageFormats = ["image/jpeg", "image/png", "image/webp", "image/gif", "large"];
const videoFormats = ["video/mp4", "video/webm", "video/mov"];

// gets the proper image paths
const getMedia = async (image, image2, video, extraReturnTypes, gifv = false, type = null, link = false) => {
  try {
    const fileNameSplit = new URL(image).pathname.split("/");
    const fileName = fileNameSplit[fileNameSplit.length - 1];
    const fileNameNoExtension = fileName.slice(0, fileName.lastIndexOf("."));
    const payload = {
      url: image2,
      path: image,
      name: fileNameNoExtension
    };
    const host = new URL(image2).host;
    if (gifv || (link && combined.includes(host))) {
      if (tenorURLs.includes(host)) {
        // Tenor doesn't let us access a raw GIF without going through their API,
        // so we use that if there's a key in the config
        if (process.env.TENOR !== "") {
          const data = await fetch(`https://tenor.googleapis.com/v2/posts?ids=${image2.split("-").pop()}&media_filter=gif&limit=1&key=${process.env.TENOR}`);
          if (data.status === 429) {
            if (extraReturnTypes) {
              payload.type = "tenorlimit";
              return payload;
            } else {
              return;
            }
          }
          const json = await data.json();
          if (json.error) throw Error(json.error);
          payload.path = json.results[0].media_formats.gif.url;
        }
      } else if (giphyURLs.includes(host)) {
        // Can result in an HTML page instead of a GIF
        payload.path = `https://media0.giphy.com/media/${image2.split("/")[4].split("-").pop()}/giphy.gif`;
      } else if (giphyMediaURLs.includes(host)) {
        payload.path = `https://media0.giphy.com/media/${image2.split("/")[4]}/giphy.gif`;
      } else if (imgurURLs.includes(host)) {
        // Seems that Imgur has a possibility of making GIFs static
        payload.path = image.replace(".mp4", ".gif");
      } else if (gfycatURLs.includes(host)) {
        // iirc Gfycat also seems to sometimes make GIFs static
        payload.path = `https://thumbs.gfycat.com/${image.split("/").pop().split(".mp4")[0]}-size_restricted.gif`;
      }
      payload.type = "image/gif";
      return payload;
    } else {
      // TODO: Ugly hack
      if (video && image.endsWith(".mov")) {
        payload.mediaType = "video";
        return payload;
      }

      payload.type = type ?? await getType(payload.path, extraReturnTypes);
      if (true && imageFormats.includes(payload.type)) {
        payload.mediaType = "image";
        return payload;
      }
      if (video && videoFormats.includes(payload.type)) {
        payload.mediaType = "video";
        return payload;
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      throw Error("Timed out");
    } else {
      throw error;
    }
  }
};

const checkMessageForMedia = async (message, extraReturnTypes, video, sticker) => {
  let type;
  if (sticker && message.stickerItems) {
    type = message.stickerItems[0];
  } else {
    // first check the embeds
    if (message.embeds.length !== 0) {
      // embeds can vary in types, we check for tenor gifs first
      if (message.embeds[0].type === "gifv") {
        type = await getMedia(message.embeds[0].video.url, message.embeds[0].url, video, extraReturnTypes, true);
        // then we check for other image types
      } else if ((message.embeds[0].type === "video" || message.embeds[0].type === "image") && message.embeds[0].thumbnail) {
        type = await getMedia(message.embeds[0].thumbnail.proxy_url, message.embeds[0].thumbnail.url, video, extraReturnTypes);
        // finally we check both possible image fields for "generic" embeds
      } else if (message.embeds[0].type === "rich" || message.embeds[0].type === "article") {
        if (message.embeds[0].thumbnail) {
          type = await getMedia(message.embeds[0].thumbnail.proxy_url, message.embeds[0].thumbnail.url, video, extraReturnTypes);
        } else if (message.embeds[0].image) {
          type = await getMedia(message.embeds[0].image.proxy_url, message.embeds[0].image.url, video, extraReturnTypes);
        }
      }
      // then check the attachments
    } else if (message.attachments.length !== 0 && message.attachments[0].width) {
      type = await getMedia(message.attachments[0].proxy_url, message.attachments[0].url, video);
    }
  }
  // if the return value exists then return it
  return type ?? false;
};

// this checks for the latest message containing an image and returns the url of the image
export default async (client, cmdMessage, interaction, options, extraReturnTypes = false, video = false, sticker = false) => {
  // we start by determining whether or not we're dealing with an interaction or a message
  if (interaction) {
    // we can get a raw attachment or a URL in the interaction itself
    if (options) {
      if (options.image) {
        const attachment = interaction.data.resolved.attachments[options.image];
        const result = await getMedia(attachment.proxy_url, attachment.url, video, attachment.content_type);
        if (result !== false) return result;
      } else if (options.link) {
        const result = await getImage(options.link, options.link, video, extraReturnTypes, false, null, true);
        if (result !== false) return result;
      }
    }
  } else {
    // check if the message is a reply to another message
    if (cmdMessage.messageReference) {
      const replyMessage = await client.getMessage(cmdMessage.messageReference.channelID, cmdMessage.messageReference.messageID).catch(() => undefined);
      if (replyMessage) {
        const replyResult = await checkMessageForMedia(replyMessage, extraReturnTypes, video, sticker);
        if (replyResult !== false) return replyResult;
      }
    }
    // then we check the current message
    const result = await checkMessageForMedia(cmdMessage, extraReturnTypes, video, sticker);
    if (result !== false) return result;
  }
  // if there aren't any replies or interaction attachments then iterate over the last few messages in the channel
  const messages = await client.getMessages((interaction ? interaction : cmdMessage).channel.id);
  // iterate over each message
  for (const message of messages) {
    const result = await checkMessageForMedia(message, extraReturnTypes, video, sticker);
    if (result === false) {
      continue;
    } else {
      return result;
    }
  }
};
