const fs = require('fs');
let f = fs.readFileSync('src/app/api/devices/current-playing/route.ts', 'utf8');
f = f.replace(/const cleanUrl = .*;/g, "const cleanUrl = (media.url || '').replace('https://iot.centelon.com/', '').replace(/^\\//, '');");
fs.writeFileSync('src/app/api/devices/current-playing/route.ts', f);
