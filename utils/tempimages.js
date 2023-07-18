import * as logger from "../utils/logger.js";
import { parseNumberWithMultipliers } from "../utils/number-parsing.js";
import { readdir, lstat, rm, writeFile, stat } from "fs/promises";

let dirSizeCache;

export async function upload(client, result, context, interaction = false) {
  const extension = result.name.match(/(?<=\.)[^\.]*$/)[0];
  const type = extension === "webm" || extension === "mp4" ? "video" : "image";
  const filename = `${Math.random().toString(36).substring(2, 15)}.${extension}`;
  await writeFile(`${process.env.TEMPDIR}/${filename}`, result.contents);
  const url = `${process.env.TMP_DOMAIN || "https://tmp.esmbot.net"}/${filename}`;
  const payload = {
    embeds: [{
      color: 16711680,
      title: `Here's your ${type}!`,
      url,
      [type]: {
        url
      },
      footer: {
        text: `The result ${type} was more than 25MB in size, so it was uploaded to an external site instead.`
      },
    }]
  };
  if (interaction) {
    await context[context.acknowledged ? "createFollowup" : "createMessage"](payload);
  } else {
    await client.rest.channels.createMessage(context.channelID, Object.assign(payload, {
      messageReference: {
        channelID: context.channelID,
        messageID: context.id,
        guildID: context.guildID ?? undefined,
        failIfNotExists: false
      },
      allowedMentions: {
        repliedUser: false
      }
    }));
  }
  if (process.env.THRESHOLD) {
    const size = dirSizeCache + result.contents.length;
    dirSizeCache = size;
    await removeOldImages(size);
  }
}

async function removeOldImages(size) {
  if (size > process.env.THRESHOLD) {
    const files = (await readdir(process.env.TEMPDIR)).map((file) => {
      return lstat(`${process.env.TEMPDIR}/${file}`).then((stats) => {
        if (stats.isSymbolicLink()) return;
        return {
          name: file,
          size: stats.size,
          ctime: stats.ctime
        };
      });
    });
    
    const resolvedFiles = await Promise.all(files);
    const oldestFiles = resolvedFiles.filter(Boolean).sort((a, b) => a.ctime - b.ctime);

    do {
      if (!oldestFiles[0]) break;
      await rm(`${process.env.TEMPDIR}/${oldestFiles[0].name}`);
      logger.log(`Removed oldest image file: ${oldestFiles[0].name}`);
      size -= oldestFiles[0].size;
      oldestFiles.shift();
    } while (size > process.env.THRESHOLD);

    const newSize = oldestFiles.reduce((a, b) => {
      return a + b.size;
    }, 0);
    dirSizeCache = newSize;
  }
}

export async function parseThreshold() {
  try {
    process.env.THRESHOLD = parseNumberWithMultipliers(process.env.THRESHOLD);
  } catch {
    logger.error("Invalid THRESHOLD config.");
    process.env.THRESHOLD = undefined;
  }
  const dirstat = (await readdir(process.env.TEMPDIR)).map((file) => {
    return stat(`${process.env.TEMPDIR}/${file}`).then((stats) => stats.size);
  });
  const size = await Promise.all(dirstat);
  const reduced = size.reduce((a, b) => {
    return a + b;
  }, 0);
  dirSizeCache = reduced;
}
