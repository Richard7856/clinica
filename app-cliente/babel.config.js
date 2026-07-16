module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Alias @/* → src/* (coincide con tsconfig paths)
      [
        "module-resolver",
        {
          root: ["."],
          alias: { "@": "./src" },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
    ],
  };
};
