const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/centodev').then(() => {
  const db = mongoose.connection.db;
  db.collection('playlistconfigs').findOne({}).then(doc => {
    if (doc) {
      console.log(JSON.stringify(doc.files, null, 2));
    }
    process.exit(0);
  });
});
