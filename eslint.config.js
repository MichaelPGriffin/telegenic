const nodePlugin = require("eslint-plugin-node");

module.exports = {
  files: ["**/*.js"],
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: "script",
    globals: {
      require: "readonly",
      module: "readonly",
      process: "readonly",
      console: "readonly",
      __filename: "readonly",
      __dirname: "readonly"
    }
  },
  plugins: {
    node: nodePlugin
  },
  rules: {
    semi: ["error", "always"], 
  }
};


