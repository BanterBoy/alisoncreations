const fs = require('fs');
const path = require('path');

const imageDir = './resources';
const outputFile = './images.json';

fs.readdir(imageDir, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        process.exit(1);
    }

    const images = files.filter(file => file.endsWith('.jpg')).map(file => ({
        src: `resources/${file}`,
        description: file.replace('.jpg', '').replace(/_/g, ' ')
    }));

    fs.writeFileSync(outputFile, JSON.stringify(images, null, 2));
    console.log('✅ Image list updated in images.json');
});
