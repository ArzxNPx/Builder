const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

(async () => {
  const { IMAGE_URL, SCALE, CHAT_ID, BOT_TOKEN } = process.env;
  const multiplier = parseInt(SCALE.replace('x', '')) || 2;

  console.log('Downloading image...');
  const res = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
  const imageBuffer = Buffer.from(res.data);

  const metadata = await sharp(imageBuffer).metadata();
  const targetWidth = metadata.width * multiplier;

  console.log('Upscaling smoothly...');
  
  // TRIK ENCHANTED & SOFT (Bebas Piksel)
  const pngBuffer = await sharp(imageBuffer)
    .resize({ width: targetWidth, kernel: 'lanczos3' }) // Resize paling halus
    .median(3)       // <-- Penghapus piksel kotak-kotak (noise)
    .sharpen({       // <-- Bikin gambar jadi "enchanted" (tajam tapi lembut)
      sigma: 1.2,
      m1: 0.5,
      m2: 0.5
    })
    .png()
    .toBuffer();

  fs.writeFileSync('output.png', pngBuffer);
  console.log('Upscale done, sending back to Telegram...');

  // --- KIRIM BALIK KE TELEGRAM ---
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('photo', fs.createReadStream('output.png'));
  form.append('caption', '✅ Sukses! Hasil upscale Soft & Enchanted (Git Mode).');

  await axios.post('https://api.telegram.org/bot' + BOT_TOKEN + '/sendPhoto', form, {
    headers: form.getHeaders()
  });

  console.log('Photo sent to Telegram!');
})().catch((e) => { console.error(e); process.exit(1); });
