const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const fs = require('fs');

// Determine the target browser from environment variable or default to chrome
const TARGET_BROWSER = (process.env.TARGET_BROWSER || 'chrome').trim().toLowerCase();
console.log(`Building for browser: ${TARGET_BROWSER}`);

// Determine the correct manifest file to use
const manifestFile = TARGET_BROWSER === 'firefox' 
  ? 'manifest.firefox.json' 
  : 'manifest.chrome.json';
console.log(`Using manifest file: ${manifestFile}`);

module.exports = (env, argv) => ({
  mode: argv.mode === 'production' ? 'production' : 'development',
  devtool: argv.mode === 'production' ? false : 'source-map',
  entry: {
    background: {
      import: './background.js',
      filename: 'background.js'
    },
    popup: {
      import: './popup.js',
      filename: 'popup.js'
    }
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
    publicPath: ''
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'icons/[name][ext]'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      'webextension-polyfill': path.resolve(__dirname, 'node_modules/webextension-polyfill/dist/browser-polyfill.js')
    }
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.TARGET_BROWSER': JSON.stringify(TARGET_BROWSER)
    }),
    new CopyPlugin({
      patterns: [
        { from: 'popup.html', to: 'popup.html' },
        { from: 'styles.css', to: 'styles.css' },
        { from: 'icons', to: 'icons' },
        { from: 'rules.json', to: 'rules.json' },
        { 
          from: manifestFile, 
          to: 'manifest.json',
          transform: (content) => {
            try {
              const manifest = JSON.parse(content.toString());
              console.log(`Using manifest for ${TARGET_BROWSER}`);
              return JSON.stringify(manifest, null, 2);
            } catch (error) {
              console.error('Error processing manifest:', error);
              throw error;
            }
          }
        },
        { from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js', to: 'browser-polyfill.js' }
      ],
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: 'popup.html', 
          to: '.',
          transform(content) {
            // Ensure popup.html has the correct script tags
            return content.toString()
              .replace('<script src="popup.js"></script>', 
                      '<script src="browser-polyfill.js"></script>\n    <script type="module" src="popup.js"></script>');
          }
        },
        { from: 'styles.css', to: '.' },
        { from: 'icons', to: 'icons' },
        { 
          from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js',
          to: 'browser-polyfill.js',
          toType: 'file'
        }
      ]
    })
  ],
  resolve: {
    fallback: {
      // Add any Node.js core modules that might be needed
      'path': require.resolve('path-browserify'),
      'util': require.resolve('util/')
    }
  },
  optimization: {
    minimize: argv.mode === 'production',
    usedExports: true
  }
});
