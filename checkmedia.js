const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/centoplatform').then(() => {
  const db = mongoose.connection.db;
  db.collection('mediaitems').findOne({ url: "https://iot.centelon.com/uploads/69b9794731e63f3d3da90636/audio/559f8820-275d-4b3e-a196-6cfab7a9900f-There_She_Goes.mp3" }).then(doc => {
    console.log(doc);
    process.exit(0);
  });
});
