import { generateWordInfoDeepseek } from './lib/generator';
import fs from 'fs';
import path from 'path';

async function testGenerator() {
  const words = ['casa', 'comer', 'bonito']; // 명사, 동사, 형용사
  const results: any[] = [];

  console.log('Starting DeepSeek Word Generation Test...');

  for (const word of words) {
    console.log(`Generating info for: ${word}...`);
    try {
      const info = await generateWordInfoDeepseek(word);
      results.push(info);
    } catch (error) {
      console.error(`Failed to generate info for ${word}:`, error);
      results.push({ word, error: String(error) });
    }
  }

  const outputPath = path.join(process.cwd(), '.gemini/antigravity/brain/79cf02d9-e9ec-4bb5-9011-0d79fb44458f/scratch/test_results.json');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to ${outputPath}`);
}

testGenerator();
