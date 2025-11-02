import BackBlazeB2 from 'backblaze-b2';
import dotenv from 'dotenv';
dotenv.config();
const B2 = BackBlazeB2;

export const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

export const authorizeB2 = async () => {
  try {
    await b2.authorize();
    //console.log('Backblaze B2 authorized successfully.');
  } catch (err) {
    console.error('Backblaze B2 authorization failed:', err.message);
  }
};
