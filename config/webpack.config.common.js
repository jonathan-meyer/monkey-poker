require("dotenv").config();

const { resolve, join } = require("path");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const DefinePlugin = require("webpack").DefinePlugin;

const IS_DEV = process.env.WEBPACK_MODE !== "production";

module.exports = {
  target: "web",
  entry: ["@babel/polyfill", "./src/client/index.js"],
  devtool: "inline-source-map",
  output: {
    publicPath: "/",
    path: resolve(__dirname, "..", "build", "client"),
    filename: IS_DEV ? "[name]-[hash].js" : "[name]-[chunkhash].js",
    chunkFilename: "[name]-[chunkhash].js",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        use: ["babel-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        loader: "html-loader",
      },
      {
        test: /\.s?css$/,
        use: ExtractTextPlugin.extract({
          fallback: {
            loader: "style-loader",
            options: { sourceMap: IS_DEV },
          },
          use: [
            {
              loader: "css-loader",
              options: {
                localIdentName: IS_DEV
                  ? "[path]-[name]_[local]"
                  : "[name]_[local]_[hash:5]", // [hash:base64]
                sourceMap: IS_DEV,
              },
            },
            {
              loader: "sass-loader",
              options: { sourceMap: IS_DEV },
            },
          ],
        }),
      },
      {
        test: /\.(eot|png|svg|ttf|woff|woff2)$/,
        loader: "file-loader",
      },
    ],
  },
  plugins: [
    new ExtractTextPlugin({
      filename: "[name]-[chunkhash].css",
      disable: IS_DEV,
    }),
    new DefinePlugin({
      DEBUG: JSON.stringify(process.env.DEBUG || undefined),
      WEBPACK_MODE: JSON.stringify(process.env.WEBPACK_MODE || undefined),
    }),
  ],
  resolve: {
    modules: ["node_modules", join("src", "client")],
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
          chunks: "all",
        },
      },
    },
  },
  stats: {
    assetsSort: "!size",
    children: false,
    chunks: false,
    colors: true,
    entrypoints: false,
    modules: false,
  },
};
