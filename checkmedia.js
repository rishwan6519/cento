const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/centoplatform').then(() => {
  const db = mongoose.connection.db;
  db.collection('mediaitems').findOne({ url: { $regex: 'cloudbases' } }).then(doc => {
    console.log(JSON.stringify(doc, null, 2));
    process.exit(0);
  });
});
