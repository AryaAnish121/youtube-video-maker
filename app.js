import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';
import say from 'say';
import { createCanvas } from 'canvas';
import { spawn } from 'child_process';
import { createClient } from 'pexels';
import { getAudioDurationInSeconds } from 'get-audio-duration';
const canvas = createCanvas(1080, 1920);
const ctx = canvas.getContext('2d');

dotenv.config();

const rData = fs.readFileSync('./util/facts.json', 'utf-8');

const facts = JSON.parse(rData);

const getLines = (text) => {
  return new Promise((resolve, reject) => {
    ctx.fillStyle = '#fff';
    ctx.font = '72px Komika Axis';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    const getLines = (ctx, text, maxWidth) => {
      var words = text.split(' ');
      var lines = [];
      var currentLine = words[0];

      for (var i = 1; i < words.length; i++) {
        var word = words[i];
        var width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    const lines = getLines(ctx, text, 930);
    resolve(lines.join('\n'));
  });
};

const getPhoto = (query) => {
  return new Promise(async (resolve, reject) => {
    const client = createClient(process.env.PEXELS_API_KEY);

    const photos = await client.photos.search({ query, per_page: 1 });
    const avg_color = photos.photos[0].avg_color;
    const photo = photos.photos[0].src.landscape;
    resolve({ photo, avg_color });
  });
};

const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const fileStream = fs.createWriteStream('./out/image.jpg');
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          resolve();
        });
      })
      .on('error', (err) => {
        console.error(`Error downloading image: ${err.message}`);
      });
  });
};

const generateVoice = (text, speed, name) => {
  return new Promise((resolve, reject) => {
    say.export(
      text,
      'Microsoft David Desktop',
      speed,
      `./out/${name}.wav`,
      async (err) => {
        if (err) console.log(err);
        resolve();
      }
    );
  });
};

const generateMain = (i) => {
  return new Promise((resolve, reject) => {
    const cmd = 'ffmpeg';
    const args = [
      '-y',
      '-i',
      `./util/background/${i}.mp4`,
      '-i',
      './out/image.jpg',
      '-i',
      `./out/${i}.wav`,
      '-filter_complex',
      `[0:v]scale=-2:1920,setsar=1,crop=1080:1920,trim=duration=5[bgtrim]; \
      [0:v]scale=-2:1920,setsar=1,crop=1080:1920, \
      loop=loop=-1:size=9999,trim=start=5,setpts=PTS-STARTPTS[vloop]; \
      [bgtrim][vloop]concat=n=2:v=1:a=0[bg]; \
      [1:v]scale='min(800,iw)':min'(500,ih)':force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=${
        i == 0 ? '0.0' : '1.0'
      }[fg]; \
      [bg][fg]overlay=(W-w)/2:(H-h)/2 - 400[tmp]; \
      [tmp]drawtext=fontfile=./font.ttf:textfile=./sentences.txt:fontsize=72: \
      fontcolor=white:x=(w-text_w)/2:y=${
        i == 0 ? '(h-text_h)/2' : '(h-text_h)/2 + 100'
      }:line_spacing=35:borderw=3:bordercolor=black[v2]; \
      [v2]format=yuv420p[v]`,
      '-map',
      '[v]',
      '-map',
      '2:a',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-preset',
      'ultrafast',
      '-shortest',
      `./out/${i}.mp4`,
    ];

    const ffmpeg = spawn(cmd, args);

    ffmpeg.stdout.on('data', (data) => {
      console.log(data);
    });

    ffmpeg.stderr.setEncoding('utf8');

    ffmpeg.stderr.on('data', (data) => {
      console.log(data);
    });

    ffmpeg.on('close', async () => {
      resolve();
    });
  });
};

const combineVideo = () => {
  return new Promise((resolve, reject) => {
    const cmd = 'ffmpeg';

    const args = [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'merge.txt',
      '-c',
      'copy',
      './out/x.mp4',
    ];

    const ffmpeg = spawn(cmd, args);

    ffmpeg.stdout.on('data', (data) => {
      console.log(data);
    });

    ffmpeg.stderr.setEncoding('utf8');

    ffmpeg.stderr.on('data', async (data) => {
      console.log(data);
    });

    ffmpeg.on('close', async () => {
      resolve();
    });
  });
};

const addBgMusic = () => {
  return new Promise((resolve, reject) => {
    const cmd = 'ffmpeg';
    const args = [
      '-y',
      '-i',
      './out/x.mp4',
      '-stream_loop',
      '-1',
      '-i',
      './util/music.mp3',
      '-c:v',
      'copy',
      '-filter_complex',
      '[0:a]aformat=fltp:44100:stereo,apad[0a];[1]aformat=fltp:44100:stereo,volume=0.2[1a];[0a][1a]amerge[a]',
      '-map',
      '0:v',
      '-map',
      '[a]',
      '-ac',
      '2',
      '-shortest',
      './out/video.mp4',
    ];

    const ffmpeg = spawn(cmd, args);

    ffmpeg.stdout.on('data', (data) => {
      console.log(data);
    });

    ffmpeg.stderr.setEncoding('utf8');

    ffmpeg.stderr.on('data', (data) => {
      console.log(data);
    });

    ffmpeg.on('close', async () => {
      resolve();
    });
  });
};

const splitVideo = (n) => {
  return new Promise(async (resolve, reject) => {
    const durations = [];
    for (let i = 0; i < n; i++) {
      const duration = await getAudioDurationInSeconds(`./out/${i}.wav`);
      durations.push(duration);
    }
    const cmd = 'ffmpeg';

    const args = [
      '-y',
      '-i',
      'bg.mp4',
      '-filter_complex',
      `[0:v]trim=duration=${durations[0]}[v1]; \
      [0:v]trim=start=${durations[0]}:end=${durations[0] + durations[1]}[v2]; \
      [0:v]trim=start=${durations[0] + durations[1]}:end=${
        durations[0] + durations[1] + durations[2]
      }[v3]; \
      [0:v]trim=start=${durations[0] + durations[1] + durations[2]}:end=${
        durations[0] + durations[1] + durations[2] + durations[3]
      }[v4]; \
      [v1]setpts=PTS-STARTPTS[v1out]; \
      [v2]setpts=PTS-STARTPTS[v2out]; \
      [v3]setpts=PTS-STARTPTS[v3out]; \
      [v4]setpts=PTS-STARTPTS[v4out]`,
      '-map',

      '[v1out]',
      '-map_metadata',
      '-1',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '18',
      '-movflags',
      '+faststart',
      './util/background/0.mp4',
      '-map',

      '[v2out]',
      '-map_metadata',
      '-1',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '18',
      '-movflags',
      '+faststart',
      './util/background/1.mp4',
      '-map',

      '[v3out]',
      '-map_metadata',
      '-1',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '18',
      '-movflags',
      '+faststart',
      './util/background/2.mp4',
      '-map',

      '[v4out]',
      '-map_metadata',
      '-1',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '18',
      '-movflags',
      '+faststart',
      './util/background/3.mp4',
    ];

    const ffmpeg = spawn(cmd, args);

    ffmpeg.stdout.on('data', (data) => {
      console.log(data);
    });

    ffmpeg.stderr.setEncoding('utf8');

    ffmpeg.stderr.on('data', async (data) => {
      console.log(data);
    });

    ffmpeg.on('close', async () => {
      resolve();
    });
  });
};

const generateIntro = (intro) => {
  return new Promise(async (resolve, reject) => {
    fs.writeFileSync('./sentences.txt', intro, 'utf-8');
    await generateMain(0);
    resolve();
  });
};

const removeExtra = (n) => {
  for (let i = 0; i < n; i++) {
    fs.unlink(`./out/${i}.mp4`, () => {});
  }
  for (let i = 0; i < n; i++) {
    fs.unlink(`./out/${i}.wav`, () => {});
  }
  for (let i = 0; i < n; i++) {
    fs.unlink(`./util/background/${i}.mp4`, () => {});
  }
  fs.unlink('./out/x.mp4', () => {});
  fs.unlink('./out/image.jpg', () => {});
};

const main = async () => {
  const speed = 1.0;
  const intro = 'Did you know?';
  const n = 3;
  await generateVoice(`Did you know that`, speed, 0);
  for (let i = 0; i < n; i++) {
    const { text } = facts[i];
    await generateVoice(text, speed, i + 1);
  }
  await splitVideo(n + 1);
  for (let i = 0; i < n; i++) {
    const { text, object } = facts[i];
    const { photo } = await getPhoto(object);
    await downloadImage(photo);
    const lines = await getLines(text);
    fs.writeFileSync('./sentences.txt', lines, 'utf-8');
    await generateMain(i + 1);
  }
  await generateIntro(intro);
  await combineVideo();
  facts.splice(0, n);
  fs.writeFileSync('./util/facts.json', JSON.stringify(facts), 'utf-8');
  await addBgMusic();
  removeExtra(n + 1);
  console.log('Done 🤗');
};

main();
