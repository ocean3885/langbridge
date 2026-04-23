import { listVideos } from '../lib/supabase/services/videos';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
}

async function check() {
  loadEnv();
  try {
    const videos = await listVideos({ visibility: 'public' });
    console.log('Public videos count:', videos.length);
    if (videos.length > 0) {
      console.log('First video:', JSON.stringify(videos[0], null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}

check();
