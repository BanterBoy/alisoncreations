const fs = require('fs');
const path = require('path');

const imageDir = './resources/images';
const outputFile = './images.json';

fs.readdir(imageDir, (err, files) => {
    if (err) {
        console.error('❌ Error reading directory:', err);
        process.exit(1);
    }

    const images = files
        .filter(file => file.toLowerCase().endsWith('.jpg'))
        .map(file => ({
            src: `resources/images/${encodeURIComponent(file)}`, // ✅ Encode spaces
            description: file.replace('.jpg', '').replace(/_/g, ' ').replace(/\(Large\)/g, '').trim()
        }));

    if (images.length === 0) {
        console.log('⚠️ No JPG images found in the directory.');
    } else {
        console.log(`✅ Found ${images.length} images. Updating images.json...`);
    }

    fs.writeFileSync(outputFile, JSON.stringify(images, null, 2));
    console.log('🎉 Image list updated successfully!');
});
