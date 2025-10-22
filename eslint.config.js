import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'vendor'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXExpressionContainer > Identifier[name='profile']",
          message:
            'JSXにprofile(オブジェクト)を直接描画しないでください（safeDisplayName(profile) を使用）。',
        },
        {
          selector:
            "JSXAttribute[name.name=/^(title|label|text|caption|subtitle|header|aria-.*|data-.*)$/] > JSXExpressionContainer > Identifier[name='profile']",
          message:
            '文字列propsにprofileを直接渡さないでください（safeDisplayName(profile) を使用）。',
        },
      ],
    },
  },
)
