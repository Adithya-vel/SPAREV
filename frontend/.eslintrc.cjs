module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  extends: ["standard-with-typescript", "plugin:react/recommended", "plugin:react-hooks/recommended"],
  parserOptions: {
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off"
  }
};
