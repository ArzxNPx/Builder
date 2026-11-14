const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const Upscaler = require('upscaler/node');
const axios = require('axios');

(async () => {
  const { IMAGE_URL, SCALE } = process.env;
  const modelPath = SCALE === '4x'
    ? '@upscalerjs/esrgan-slim/4x'
    : '@upscalerjs/esrgan-slim/2x';

  console.log('Loading model:', modelPath);
  const model = require(modelPath);
  const upscaler = new Upscaler({ model });

  console.log('Downloading image from:', IMAGE_URL);
  const res = await axios.get(IMAGE_URL, { 
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0' } 
  });
  const imageBuffer = Buffer.from(res.data);

  const image = tf.node.decodeImage(imageBuffer, 3);
  console.log('Upscaling...');
  const tensor = await upscaler.upscale(image);
  const png = await tf.node.encodePng(tensor);
  fs.writeFileSync('output.png', png);

  image.dispose();
  tensor.dispose();
  console.log('Done: output.png');
})().catch((e) => { console.error(e); process.exit(1); });
