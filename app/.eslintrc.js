module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "plugins": [
      "security",
      "node",
      "promise",
      "prettier"
    ],
    "extends": [
      "airbnb-base",
      "plugin:promise/recommended",
      "plugin:node/recommended",
      "plugin:security/recommended",
      "plugin:prettier/recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly",
        "fetch": false
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module",
        "ecmaFeatures":{
          "impliedStrict" : true
        }
    },
    "rules": {
      'no-console': 'off',
      "prettier/prettier": [
        "warn",
        {
          "arrowParens" : "always",
          "singleQuote": true 
        }
      ],
      "no-var": [
        "error"
      ],
      "no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_" }
      ],
    }
};