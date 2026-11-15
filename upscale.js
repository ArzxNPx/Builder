const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

(async () => {
  const { SCALE, CHAT_ID, BOT_TOKEN } = process.env;
  const multiplier = parseInt(SCALE.replace('x', '')) || 2;
  try {
    const imageBuffer = fs.readFileSync('input_image.png');
    const metadata = await sharp(imageBuffer).metadata();
    const targetWidth = metadata.width * multiplier;
    
    const pngBuffer = await sharp(imageBuffer)
      .resize({ width: targetWidth, kernel: 'lanczos3' }) 
      .median(5)
      .sharpen({ sigma: 0.8 })
      .png() 
      .toBuffer();

    fs.writeFileSync('output.png', pngBuffer); 
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('document', fs.createReadStream('output.png')); 
    form.append('caption', '✅ Sukses! Hasil upscale Mulus & Bebas Bintik.');

    await axios.post('https://api.telegram.org/bot' + BOT_TOKEN + '/sendDocument', form, { headers: form.getHeaders() });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();