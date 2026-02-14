const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:5000",
    specPattern: "integration/**/*.js", // Replaces integrationFolder
    supportFile: "support/index.js",
    setupNodeEvents(on, config) {
      // Replaces pluginsFile
      return require("./plugins/index.js")(on, config);
    },
  },
  fixturesFolder: "fixtures",
  screenshotsFolder: "screenshots",
  videosFolder: "videos",
});
