// import fs from 'fs';
// import path from 'path';
// import admin from 'firebase-admin';

// const serviceAccount = JSON.parse(
//   fs.readFileSync(path.resolve('./src/firebase-service-account.json'), 'utf-8')
// );

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// export default admin;

import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Fix for newline issues in private key
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
