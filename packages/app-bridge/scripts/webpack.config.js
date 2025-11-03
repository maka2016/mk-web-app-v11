/* eslint-disable import/no-dynamic-require */
const path = require('path');
const fse = require('fs-extra');
// const HtmlWebpackPlugin = require("html-webpack-plugin")
// const externalsConfig = require("@mk/widgets-bridge-sdk/vendor/vendor_externals")
const {
  coreVendor,
  textLibVendor,
  uiVendor,
} = require('@mk/widgets-bridge-sdk/vendor/vendor_externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const rootCtx = path.join(__dirname, '..');

/**
 * 路径
 */
const paths = {
  sourcePath: path.resolve(__dirname, '../'),
  nodeModulePath: path.resolve(__dirname, '../node_modules'),
  parentNodeModulePath: path.resolve(__dirname, '../../../node_modules'),
};

module.exports = (entry, output) => {
  return {
    entry,
    cache: true,
    output,
    mode: 'development',
    // mode: "production",
    // 由于是预览模式，所以不需要优化打包内容
    optimization: {
      minimize: false,
      runtimeChunk: false,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    },
    externals: {
      ...coreVendor,
      ...textLibVendor,
      ...uiVendor,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          include: [paths.sourcePath],
          exclude: [/\.scss.ts$/, /\.test.tsx?$/, /node_modules/],
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              // onlyCompileBundledFiles: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(scss|sass)$/,
          // include: [paths.sourcePath],
          use: [
            {
              loader: require.resolve('style-loader'), // 把css添加到dom
            },
            {
              loader: require.resolve('css-loader'), // 加载css
            },
            {
              loader: require.resolve('postcss-loader'),
            },
            {
              loader: require.resolve('sass-loader'),
            },
          ],
        },
        {
          test: /\.(png|jpg|gif)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 8192,
              },
            },
          ],
        },
      ],
    },
    resolve: {
      modules: [paths.nodeModulePath, paths.parentNodeModulePath],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: path.join(__dirname, 'tsconfig.json'),
        }),
      ],
      extensions: ['.ts', '.tsx', '.js', '.json', '.jsx', '.css'],
    },
    // performance: {
    //   hints: "warning",
    //   maxEntrypointSize: 400000,
    //   assetFilter(assetFilename) {
    //     return assetFilename.endsWith(".css") || assetFilename.endsWith(".js");
    //   },
    // },
    // devtool: "cheap-source-map",
    context: rootCtx,
    target: 'web',
    stats: 'errors-only',
    node: {
      module: 'empty',
      dgram: 'empty',
      dns: 'mock',
      fs: 'empty',
      http2: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty',
    },
    plugins: [
      // ...htmlEntriesPlugins,
    ],
  };
};
