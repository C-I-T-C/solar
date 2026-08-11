import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.join(process.cwd(), 'public');

async function processImages(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      await processImages(fullPath);
    } else if (file.endsWith('.jpg') || file.endsWith('.png')) {
      const ext = path.extname(file);
      const basename = path.basename(file, ext);
      const newPath = path.join(dir, `${basename}.webp`);
      
      console.log(`Processing: ${file}`);
      
      try {
        const image = sharp(fullPath);
        const metadata = await image.metadata();
        
        let width = metadata.width;
        let height = metadata.height;
        if (width > 4096) {
          height = Math.round(height * (4096 / width));
          width = 4096;
        }
        
        await image
          .resize(width, height)
          .webp({ quality: 80, effort: 6 }) 
          .toFile(newPath);
          
        console.log(`✅ Converted and saved: ${basename}.webp`);
        
        fs.unlinkSync(fullPath);
        console.log(`🗑️ Deleted original: ${file}`);
      } catch (err) {
        console.error(`❌ Error processing ${file}:`, err);
      }
    }
  }
}

processImages(publicDir).then(() => {
  console.log('🎉 All images processed!');
});
