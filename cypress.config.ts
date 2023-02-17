import { defineConfig } from "cypress";

export default defineConfig({
  env: {
    BASEURL: 'http://localhost:3001/',
    HOST: 'localhost',
    PORT: '16992',
    USERNAME: 'admin',
    AMTPASSWORD: 'P@ssword'
  },
  e2e: {
    experimentalRunAllSpecs: true,
    specPattern: 'cypress/e2e/integration/**/*.ts',
  }
});
