const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const { execSync } = require('child_process');

(async () => {
  const { CHAT_ID, BOT_TOKEN, SPEED, DETAIL, CHARSET, INVERT, COLOR } = process.env;
  try {
    console.log('Processing video...');
    fs.mkdirSync('frames');
    // Ekstrak frame: FPS 15, set kecepatan, resize sesuai detail (kolom)
    execSync(`ffmpeg -i input_video.mp4 -vf "fps=15,setpts=PTS/${SPEED},scale=${DETAIL}:-2" frames/out%04d.png`);
    
    const frames = fs.readdirSync('frames').filter(f => f.endsWith('.png'));
    fs.mkdirSync('ascii_frames');
    
    const ramps = { classic: " .:-=+*#%@", blocks: " ░▒▓█", binary: " 01" };
    let ramp = ramps[CHARSET] || ramps.classic;
    if (INVERT === 'true') ramp = ramp.split('').reverse().join('');
    
    for (let i = 0; i < frames.length; i++) {
      const { data, info } = await sharp(`frames/${frames[i]}`).raw().toBuffer({ resolveWithObject: true });
      const w = info.width, h = info.height, channels = info.channels;
      let svgRows = '';
      
      for (let y = 0; y < h; y += 2) { 
        let rowStr = '';
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * channels;
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
          const ch = ramp[Math.round(lum * (ramp.length - 1))] || ' ';
          const safeCh = ch.replace(/&/g, '&amp;').replace(/</g, '&lt;');
          
          if (COLOR === 'true') {
            rowStr += `<tspan fill="rgb(${r},${g},${b})">${safeCh}</tspan>`;
          } else {
            rowStr += `<tspan>${safeCh}</tspan>`;
          }
        }
        svgRows += `<text x="0" y="${(y/2)*12 + 12}" font-family="monospace" font-size="12" fill="white" xml:space="preserve">${rowStr}</text>`;
      }
      
      const svg = `<svg width="${w*8}" height="${(h/2)*12 + 12}"><rect width="100%" height="100%" fill="black"/>${svgRows}</svg>`;
      await sharp(Buffer.from(svg)).toFile(`ascii_frames/ascii_${i.toString().padStart(4, '0')}.png`);
    }
    
    // Gabungin frame jadi video + audio asli
    execSync('ffmpeg -y -framerate 15 -i ascii_frames/ascii_%04d.png -i input_video.mp4 -c:v libx264 -crf 23 -c:a aac -shortest output_video.mp4');
    
    console.log('Sending video...');
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('video', fs.createReadStream('output_video.mp4')); 
    form.append('caption', '✅ ASCII Video Sukses!');
    form.append('supports_streaming', 'true');
    await axios.post('https://api.telegram.org/bot' + BOT_TOKEN + '/sendVideo', form, { headers: form.getHeaders() });
  } catch (err) {
    console.error(err);
    try {
      const errForm = new FormData();
      errForm.append('chat_id', CHAT_ID);
      errForm.append('text', '❌ ERROR ASCII VIDEO:\n' + err.message);
      await axios.post('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', errForm, { headers: errForm.getHeaders() });
    } catch (e) {}
    process.exit(1);
  }
})();