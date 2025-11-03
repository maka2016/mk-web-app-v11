const path = require('path');
const copyFile = require('./copy-files-base');

copyFile({
  outdir: path.join(__dirname, '../dist'),
  targetFiles: [path.join(__dirname, '../README.md')],
  targetPackageJson: path.join(__dirname, '../package.json'),
  packageExtraOptions: {
    types: './index.d.ts',
  },
});
