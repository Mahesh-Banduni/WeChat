import cron from 'node-cron';
import messageService from './modules/message/message.service.js';

cron.schedule('* 59 23 * * *', async () => {
  console.log('⏳ Running chat flush job...');
  await messageService.flushMessages();
  await messageService.flushStatusUpdates();
  await messageService.flushReadUpdates();
});
