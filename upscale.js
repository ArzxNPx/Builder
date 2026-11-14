const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const Upscaler = require('upscaler/node');
const axios = require('axios');
const FormData = require('form-data');

(async () => {
  const { IMAGE_URL, SCALE, CHAT_ID, BOT_TOKEN } = process.env;
  const modelPath = SCALE === '4x'
    ? '@upscalerjs/esrgan-slim/4x'
    : '@upscalerjs/esrgan-slim/2x';

  console.log('Loading model:', modelPath);
  const model = require(modelPath);
  const upscaler = new Upscaler({ model });

  console.log('Downloading image...');
  const res = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
  const imageBuffer = Buffer.from(res.data);

  const image = tf.node.decodeImage(imageBuffer, 3);
  console.log('Upscaling...');
  const tensor = await upscaler.upscale(image);
  const png = await tf.node.encodePng(tensor);
  fs.writeFileSync('output.png', png);

  image.dispose();
  tensor.dispose();
  console.log('Upscale done, sending back to Telegram...');

  // --- KIRIM BALIK KE TELEGRAM ---
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('photo', fs.createReadStream('output.png'));
  form.append('caption', '✅ Sukses! Hasil upscale AI via GitHub Actions.');

  await axios.post('https://api.telegram.org/bot' + BOT_TOKEN + '/sendPhoto', form, {
    headers: form.getHeaders()
  });

  console.log('Photo sent to Telegram!');
})().catch((e) => { console.error(e); process.exit(1); });
