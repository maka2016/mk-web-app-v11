const glob = require('glob');
const fse = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const rimraf = require('rimraf');
const prettier = require('prettier');
const compileOptionsFac = require('./webpack.config');

const tsconfig = require('../tsconfig.json');

const { outDir } = tsconfig.compilerOptions;

rimraf(outDir, err => {
  if (err) {
    console.log(err);
  } else {
    fse.mkdirp(outDir);

    const compileComps = () => {
      // const htmlEntriesPlugins = []
      glob
        .sync('./**/*.ts', {
          ignore: ['node_modules/*', 'dist/*', 'build/*', '*.bak'],
        })
        .forEach((matchFilePath, idx) => {
          const filename = path.basename(matchFilePath).replace(/tsx?/g, 'js');
          const compOutDir = path.dirname(
            path.join(__dirname, outDir, matchFilePath)
          );
          const compiler = webpack(
            compileOptionsFac(matchFilePath, {
              path: compOutDir,
              filename,
            })
          );

          compiler.run((err, stats) => {
            if (stats.hasErrors()) {
              const compileStats = stats.toJson();
              fse.writeFileSync(
                path.join(__dirname, '.compile.log'),
                prettier.format(JSON.stringify(compileStats.errors), {
                  parser: 'json',
                }),
                {
                  encoding: 'utf-8',
                }
              );
            }
          });
        }, {});
    };

    compileComps();
  }
});
