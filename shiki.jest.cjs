const languages = {
  javascript: true,
  typescript: true,
};

const aliases = {
  js: true,
  jsx: true,
  ts: true,
  tsx: true,
};

async function codeToTokensWithThemes(code) {
  return code.split('\n').map((content) => [
    {
      content,
      offset: 0,
      variants: {
        light: { color: '#0550AE' },
        dark: { color: '#79C0FF' },
      },
    },
  ]);
}

module.exports = {
  bundledLanguages: languages,
  bundledLanguagesAlias: aliases,
  codeToTokensWithThemes,
};
