if (parseInt(process.versions.node.split(".")[0]) < 18) {
  console.error(`You are currently running Node.js version ${process.version}.
esmBot requires Node.js version 18 or above.
Please refer to step 3 of the setup guide: https://docs.esmbot.net/setup/#3-install-nodejs`);
  process.exit(1);
}
if (process.platform === "win32") {
  console.error("\x1b[1m\x1b[31m\x1b[40m" + `WINDOWS IS NOT OFFICIALLY SUPPORTED!
Although there's a (very) slim chance of it working, multiple aspects of esmBot are built with UNIX-like systems in mind and could break on Win32-based systems. If you want to run esmBot on Windows, using Windows Subsystem for Linux is highly recommended.
esmBot will continue to run past this message in 5 seconds, but keep in mind that it could break at any time. Continue running at your own risk; alternatively, stop the bot using Ctrl+C and install WSL.` + "\x1b[0m");
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
}

// load config from .env file
import "dotenv/config";

import { reloadImageConnections } from "./utils/image.js";

// main services
import { Client, Constants } from "oceanic.js";
// some utils
import { promises } from "fs";
import logger from "./utils/logger.js";
import { exec as baseExec } from "child_process";
import { promisify } from "util";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const exec = promisify(baseExec);
// initialize command loader
import { load } from "./utils/handler.js";
// command collections
import { paths } from "./utils/collections.js";
// database stuff
import database from "./utils/database.js";
// lavalink stuff
import { reload, connect, connected } from "./utils/soundplayer.js";
// events
import { endBroadcast, startBroadcast } from "./utils/misc.js";
import { parseThreshold } from "./utils/tempimages.js";
import { parseNumberWithMultipliers } from "./utils/number-parsing.js";

import commandConfig from "./config/commands.json" assert { type: "json" };
import packageJson from "./package.json" assert { type: "json" };
process.env.ESMBOT_VER = packageJson.version;

const intents = [
  Constants.Intents.GUILD_VOICE_STATES,
  Constants.Intents.DIRECT_MESSAGES,
  Constants.Intents.GUILDS
];
if (commandConfig.types.classic) {
  intents.push(Constants.Intents.GUILD_MESSAGES);
  intents.push(Constants.Intents.MESSAGE_CONTENT);
}

/**
 * @param {string} dir
 * @returns {AsyncGenerator<string>}
 */
async function* getFiles(dir) {
  const dirents = await promises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const name = dir + (dir.charAt(dir.length - 1) !== "/" ? "/" : "") + dirent.name;
    if (dirent.isDirectory()) {
      yield* getFiles(name);
    } else if (dirent.name.endsWith(".js")) {
      yield name;
    }
  }
}

process.env.GIT_REV = await exec("git rev-parse HEAD").then(output => output.stdout.substring(0, 7), () => "unknown commit");
console.log(`
     ,*\`$                    z\`"v       
    F zBw\`%                 A ,W "W     
  ,\` ,EBBBWp"%. ,-=~~==-,+*  4BBE  T    
  M  BBBBBBBB* ,w=####Wpw  4BBBBB#  1   
 F  BBBBBBBMwBBBBBBBBBBBBB#wXBBBBBH  E  
 F  BBBBBBkBBBBBBBBBBBBBBBBBBBBE4BL  k  
 #  BFBBBBBBBBBBBBF"      "RBBBW    F  
  V ' 4BBBBBBBBBBM            TBBL  F   
   F  BBBBBBBBBBF              JBB  L   
   F  FBBBBBBBEB                BBL 4   
   E  [BB4BBBBEBL               BBL 4   
   I   #BBBBBBBEB              4BBH  *w 
   A   4BBBBBBBBBEW,         ,BBBB  W  [
.A  ,k  4BBBBBBBBBBBEBW####BBBBBBM BF  F
k  <BBBw BBBBEBBBBBBBBBBBBBBBBBQ4BM  # 
 5,  REBBB4BBBBB#BBBBBBBBBBBBP5BFF  ,F  
   *w  \`*4BBW\`"FF#F##FFFF"\` , *   +"    
      *+,   " F'"'*^~~~^"^\`  V+*^       
          \`"""                          
          
esmBot ${packageJson.version} (${process.env.GIT_REV})
`);

if (!commandConfig.types.classic && !commandConfig.types.application) {
  logger.error("Both classic and application commands are disabled! Please enable at least one command type in config/commands.json.");
  process.exit(1);
}

if (database) {
  // database handling
  const dbResult = await database.upgrade(logger);
  if (dbResult === 1) process.exit(1);
}

// process the threshold into bytes early
if (process.env.TEMPDIR && process.env.THRESHOLD) {
  await parseThreshold();
}

if (process.env.FFMPEG_MEMORY_LIMIT) {
  process.env.FFMPEG_MEMORY_LIMIT = parseNumberWithMultipliers(process.env.FFMPEG_MEMORY_LIMIT);
} else {
  logger.warn("FFMPEG_MEMORY_LIMIT is unset. FFmpeg's memory usage will not be limited.");
}
if (process.env.MEDIA_CONCURRENCY_LIMIT) {
  process.env.MEDIA_CONCURRENCY_LIMIT = parseNumberWithMultipliers(process.env.MEDIA_CONCURRENCY_LIMIT);
} else {
  logger.warn("MEDIA_CONCURRENCY_LIMIT is unset. The number of media commands running at the same time will not be limited. This may cause memory exhaustion.");
}

// register commands and their info
logger.log("info", "Attempting to load commands...");
for await (const commandFile of getFiles(resolve(dirname(fileURLToPath(import.meta.url)), "./commands/"))) {
  logger.log("main", `Loading command from ${commandFile}...`);
  try {
    await load(null, commandFile);
  } catch (e) {
    logger.error(`Failed to register command from ${commandFile}: ${e}`);
  }
}
logger.log("info", "Finished loading commands.");

if (database) {
  await database.setup();
}
if (process.env.API_TYPE === "ws") await reloadImageConnections();

const shardArray = process.env.SHARDS && process.env.pm_id ? JSON.parse(process.env.SHARDS)[parseInt(process.env.pm_id) - 1] : null;

// create the oceanic client
const client = new Client({
  auth: `Bot ${process.env.TOKEN}`,
  allowedMentions: {
    everyone: false,
    roles: false,
    users: true,
    repliedUser: true
  },
  gateway: {
    concurrency: "auto",
    maxShards: "auto",
    shardIDs: shardArray,
    presence: {
      status: "idle",
      activities: [{
        type: 0,
        name: "Starting esmBot..."
      }]
    },
    intents
  },
  collectionLimits: {
    messages: 50,
    channels: !commandConfig.types.classic ? 0 : Infinity
    },
    rest: {
      requestTimeout: 20000
  }
});

// register events
logger.log("info", "Attempting to load events...");
for await (const file of getFiles(resolve(dirname(fileURLToPath(import.meta.url)), "./events/"))) {
  logger.log("main", `Loading event from ${file}...`);
  const eventArray = file.split("/");
  const eventName = eventArray[eventArray.length - 1].split(".")[0];
  if (eventName === "interactionCreate" && !commandConfig.types.application) {
    logger.log("warn", `Skipped loading event from ${file} because application commands are disabled`);
    continue;
  }
  const { default: event } = await import(file);
  client.on(eventName, event.bind(null, client));
}
logger.log("info", "Finished loading events.");

// PM2-specific handling
if (process.env.PM2_USAGE) {
  const { default: pm2 } = await import("pm2");
  // callback hell :)
  pm2.launchBus((err, pm2Bus) => {
    if (err) {
      logger.error(err);
      return;
    }
    pm2.list((err, list) => {
      if (err) {
        logger.error(err);
        return;
      }
      const managerProc = list.filter((v) => v.name === "esmBot-manager")[0];
      pm2Bus.on("process:msg", async (packet) => {
        switch (packet.data?.type) {
          case "reload":
            await load(client, paths.get(packet.data.message), true);
            break;
          case "soundreload":
            await reload(client);
            break;
          case "imagereload":
            await reloadImageConnections();
            break;
          case "broadcastStart":
            startBroadcast(client, packet.data.message);
            break;
          case "broadcastEnd":
            endBroadcast(client);
            break;
          case "serverCounts":
            pm2.sendDataToProcessId(managerProc.pm_id, {
              id: managerProc.pm_id,
              type: "process:msg",
              data: {
                type: "serverCounts",
                guilds: client.guilds.size,
                shards: client.shards.map((v) => {
                  if (!process.env.pm_id) return;
                  return { id: v.id, procId: parseInt(process.env.pm_id) - 1, latency: v.latency, status: v.status };
                })
              },
              topic: true
            }, (err) => {
              if (err) logger.error(err);
            });
            break;
        }
      });
    });
  });
}

// connect to lavalink
if (!connected) connect(client);

try {
  await client.connect();
} catch (e) {
  logger.error("esmBot failed to connect to Discord!");
  logger.error(e);
  logger.error("The bot is unable to start, stopping now...");
  process.exit(1);
}

function stop() {
  process.exit();
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
