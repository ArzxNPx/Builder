const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

(async () => {
  const { SCALE, CHAT_ID, BOT_TOKEN } = process.env;
  const multiplier = parseInt(SCALE.replace('x', '')) || 2;

  try {
    console.log('Reading image from local repo...');
    const imageBuffer = fs.readFileSync('input_image.png');

    const metadata = await sharp(imageBuffer).metadata();
    const targetWidth = metadata.width * multiplier;

    console.log('Upscaling smoothly...');
    
    // KITA BALIKIN KE PNG BIAR KUALITAS 100% MULUS
    const pngBuffer = await sharp(imageBuffer)
      .resize({ width: targetWidth, kernel: 'lanczos3' }) 
      .median(3)       
      .sharpen({ sigma: 1.2, m1: 0.5, m2: 0.5 })
      .png() 
      .toBuffer();

    fs.writeFileSync('output.png', pngBuffer); 
    console.log('Upscale done, sending back to Telegram...');

    // --- KIRIM BALIK KE TELEGRAM (SEBAGAI DOKUMEN/FILE, LIMIT 50MB) ---
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('document', fs.createReadStream('output.png')); // <-- PAKAI DOCUMENT
    form.append('caption', '✅ Sukses! Hasil upscale Full Quality (PNG File).');

    // Endpoint diganti ke sendDocument
    await axios.post('https://api.telegram.org/bot' + BOT_TOKEN + '/sendDocument', form, {
      headers: form.getHeaders()
    });

    console.log('File sent to Telegram!');
  } catch (err) {
    console.error(err);
    try {
      const errForm = new FormData();
      errForm.append('chat_id', CHAT_ID);
      errForm.append('text', '❌ ERROR DARI GITHUB ACTIONS:\n\n' + err.message);
      await axios.post('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', errForm, {
        headers: errForm.getHeaders()
      });
    } catch (e) {}
    process.exit(1);
  }
})();
