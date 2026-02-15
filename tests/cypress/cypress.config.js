const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:5000",
    specPattern: "integration/**/*.js", // Replaces integrationFolder
    supportFile: "support/index.js",
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // Logic for older plugins/index.js
      return require("./plugins/index.js")(on, config);
    },
  },
  fixturesFolder: "fixtures",
  screenshotsFolder: "screenshots",
  videosFolder: "videos",
});
