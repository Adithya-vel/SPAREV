module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true
  },
  extends: ["standard-with-typescript"],
  parserOptions: {
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname
  },
  rules: {}
};
