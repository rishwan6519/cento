const mongoose = require('mongoose');
const { connectToDatabase } = require('./src/lib/db');
const PlaylistConfig = require('./src/models/PlaylistConfig').default;
const MediaItemModel = require('./src/models/MediaItems').default;

async function run() {
  await connectToDatabase();
  const playlist = await PlaylistConfig.findOne({ "files.name": "There_She_Goes.mp3" }).populate('files.fileId').lean();
  console.log(JSON.stringify(playlist.files.find(f => f.name === "There_She_Goes.mp3"), null, 2));
  process.exit(0);
}
run();
