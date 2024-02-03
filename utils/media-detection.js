import { AttachmentFlags, PrivateChannel, TextableChannel, ThreadChannel } from "oceanic.js";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";

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

const combined = [...tenorURLs, ...giphyURLs, ...giphyMediaURLs, ...imgurURLs];

const imageFormats = ["image/jpeg", "image/png", "image/webp", "image/gif", "large"];

/**
 * @param {string} image
 * @param {boolean} extraReturnTypes
 * @param {boolean} video
 */
export async function getType(image, extraReturnTypes, video) {
  if (!(image.startsWith("http://") || image.startsWith("https://"))) {
    const imageType = await fileTypeFromFile(image);
    if (imageType && formats.includes(imageType.mime)) {
      return imageType.mime;
    }
    return undefined;
  }
  let type;
  let controller = new AbortController();
  let timeout = setTimeout(() => {
    controller.abort();
  }, 10_000);
  try {
    const imageRequest = await fetch(image, {
      signal: controller.signal,
      method: "HEAD"
    });
    clearTimeout(timeout);
    let size = 0;
    if (imageRequest.headers.has("content-range")) {
      const contentRange = imageRequest.headers.get("content-range");
      if (contentRange) size = parseInt(contentRange.split("/")[1]);
    } else if (imageRequest.headers.has("content-length")) {
      const contentLength = imageRequest.headers.get("content-length");
      if (contentLength) size = parseInt(contentLength);
    }
    if (size > 41943040 && extraReturnTypes) { // 40 MB
      type = "large";
      return type;
    }
    const typeHeader = imageRequest.headers.get("content-type");
    if (typeHeader) {
      type = typeHeader;
    } else {
      controller = new AbortController();
      timeout = setTimeout(() => {
        controller.abort();
      }, 10_000);
      const bufRequest = await fetch(image, {
        signal: controller.signal,
        headers: {
          range: "bytes=0-1023"
        }
      });
      clearTimeout(timeout);
      const imageBuffer = await bufRequest.arrayBuffer();
      const imageType = await fileTypeFromBuffer(imageBuffer);
      if (imageType) {
        type = imageType.mime;
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      throw Error(`Timed out when requesting ${image}`);
    } else {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
  return type;
}

/**
 * Gets proper media paths.
 * @param {string} image
 * @param {string} image2
 * @param {boolean} video
 * @param {boolean} [spoiler]
 * @param {boolean} [extraReturnTypes]
 * @param {boolean} [gifv]
 * @param {string | null} [type]
 * @param {boolean} [link]
 * @returns {Promise<{ path: string; type?: string; url: string; name: string; gifv: boolean; spoiler: boolean; } | undefined>}
 */
const getMedia = async (image, image2, video, spoiler = false, extraReturnTypes = false, gifv = false, type = null, link = false) => {
  try {
    const fileNameSplit = new URL(image).pathname.split("/");
    const fileName = fileNameSplit[fileNameSplit.length - 1];
    const fileNameNoExtension = fileName.slice(0, fileName.lastIndexOf("."));
    const host = new URL(image2).host;
    gifv ||= link && combined.includes(host);
    const payload = {
      url: image2,
      path: image,
      name: fileNameNoExtension,
      gifv,
      spoiler  
    };
    if (!video && gifv) {
      payload.mediaType = "image";
      if (tenorURLs.includes(host)) {
        // Tenor doesn't let us access a raw GIF without going through their API,
        // so we use that if there's a key in the config
        if (process.env.TENOR !== "") {
          let id;
          if (image2.includes("tenor.com/view/")) {
            id = image2.split("-").pop();
          } else if (image2.endsWith(".gif")) {
            const redirect = (await fetch(image2, { method: "HEAD", redirect: "manual" })).headers.get("location");
            id = redirect?.split("-").pop();
          }
          const data = await fetch(`https://tenor.googleapis.com/v2/posts?ids=${id}&media_filter=gif&limit=1&client_key=esmBot%20${process.env.ESMBOT_VER}&key=${process.env.TENOR}`);
          if (data.status === 429) {
            if (extraReturnTypes) {
              payload.type = "tenorlimit";
              return payload;
            }
          }
          const json = await data.json();
          if (json.error) throw Error(json.error.message);
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
      }
      payload.type = "image/gif";
      return payload;
    } else {
      payload.type = type ?? await getType(payload.path, extraReturnTypes, video);
      if (payload.type) {
        if (payload.type.startsWith("video/")) {
          payload.mediaType = "video";
          return payload;
        } else if (imageFormats.includes(payload.type)) {
          payload.mediaType = "image";
          return payload;
        }
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

/**
 * Checks a single message for stickers, videos, or images
 * @param {import("oceanic.js").Message} message 
 * @param {boolean} extraReturnTypes 
 * @param {boolean} video 
 * @param {boolean} sticker 
 * @returns {Promise<{ path: string; type?: string; url: string; name: string; } | import("oceanic.js").StickerItem | boolean | undefined>}
 */
const checkMessageForMedia = async (message, extraReturnTypes, video, sticker) => {
  let type;
  if (sticker && message.stickerItems) {
    type = message.stickerItems[0];
  } else {
    // first check the embeds
    if (message.embeds.length !== 0) {
      let hasSpoiler = false;
      if (message.embeds[0].url && message.content) {
        const spoilerRegex = /\|\|.*https?:\/\/.*\|\|/s;
        hasSpoiler = spoilerRegex.test(message.content);
      }
      // embeds can vary in types, we check for tenor gifs first
      if (message.embeds[0].type === "gifv" && message.embeds[0].video?.url && message.embeds[0].url) {
        type = await getMedia(message.embeds[0].video.url, message.embeds[0].url, video, hasSpoiler, extraReturnTypes, true);
        // then we check for videos
      } else if (message.embeds[0].type === "video" && video) {
        type = await getMedia(message.embeds[0].video.proxyURL ?? message.embeds[0].video.url, message.embeds[0].url, video, hasSpoiler, extraReturnTypes);
        // then we check for other image types
      } else if ((message.embeds[0].type === "video" || message.embeds[0].type === "image") && message.embeds[0].thumbnail) {
        type = await getMedia(message.embeds[0].thumbnail.proxyURL ?? message.embeds[0].thumbnail.url, message.embeds[0].thumbnail.url, video, hasSpoiler, extraReturnTypes);
        // finally we check both possible image fields for "generic" embeds
      } else if (message.embeds[0].type === "rich" || message.embeds[0].type === "article") {
        if (message.embeds[0].thumbnail) {
          type = await getMedia(message.embeds[0].thumbnail.proxyURL ?? message.embeds[0].thumbnail.url, message.embeds[0].thumbnail.url, video, hasSpoiler, extraReturnTypes);
        } else if (message.embeds[0].image) {
          type = await getMedia(message.embeds[0].image.proxyURL ?? message.embeds[0].image.url, message.embeds[0].image.url, video, hasSpoiler, extraReturnTypes);
        }
      }
      // then check the attachments
    } else if (message.attachments.size !== 0) {
      const firstAttachment = message.attachments.first();
      console.log(firstAttachment)
      if (firstAttachment?.width) type = await getMedia(firstAttachment.proxyURL, firstAttachment.url, video, !!(firstAttachment.flags & AttachmentFlags.IS_SPOILER));
    }
  }
  // if the return value exists then return it
  return type ?? false;
};

/**
 * Checks for the latest message containing an image and returns the URL of the image.
 * @param {import("oceanic.js").Client} client
 * @param {import("oceanic.js").Message} cmdMessage
 * @param {import("oceanic.js").CommandInteraction} interaction
 * @param {{ image: string; link: any; }} options
 * @returns {Promise<{ path: string; type?: string; url: string; name: string; } | import("oceanic.js").StickerItem | boolean | undefined>}
 */
export default async (client, cmdMessage, interaction, options, extraReturnTypes = false, video = false, sticker = false, singleMessage = false) => {
  // we start by determining whether or not we're dealing with an interaction or a message
  if (interaction && options) {
    // we can get a raw attachment or a URL in the interaction itself
    if (options.image) {
      const attachment = interaction.data.resolved.attachments.get(options.image);
      if (attachment) {
        const result = await getMedia(attachment.proxyURL, attachment.url, video, !!(attachment.flags & AttachmentFlags.IS_SPOILER), !!attachment.contentType);
        if (result) return result;
      }
    } else if (options.link) {
      const result = await getMedia(options.link, options.link, video, false, extraReturnTypes, false, null, true);
      if (result) return result;
    }
  }
  if (cmdMessage) {
    // check if the message is a reply to another message
    if (cmdMessage.messageReference?.channelID && cmdMessage.messageReference.messageID && !singleMessage) {
      const replyMessage = await client.rest.channels.getMessage(cmdMessage.messageReference.channelID, cmdMessage.messageReference.messageID).catch(() => undefined);
      if (replyMessage) {
        const replyResult = await checkMessageForMedia(replyMessage, extraReturnTypes, video, sticker);
        if (replyResult !== false) return replyResult;
      }
    }
    // then we check the current message
    const result = await checkMessageForMedia(cmdMessage, extraReturnTypes, video, sticker);
    if (result !== false) return result;
  }
  if (!singleMessage) {
    // if there aren't any replies or interaction attachments then iterate over the last few messages in the channel
    const channel = (interaction ? interaction : cmdMessage).channel ?? await client.rest.channels.get((interaction ? interaction : cmdMessage).channelID);
    if (!(channel instanceof TextableChannel) && !(channel instanceof ThreadChannel) && !(channel instanceof PrivateChannel)) return;
    const perms = (channel instanceof TextableChannel || channel instanceof ThreadChannel) ? channel.permissionsOf?.(client.user.id) : null;
    if (perms && !perms.has("VIEW_CHANNEL")) return;
    const messages = await channel.getMessages();
    // iterate over each message
    for (const message of messages) {
      const result = await checkMessageForMedia(message, extraReturnTypes, video, sticker);
      if (result !== false) return result;
    }
  }
};
