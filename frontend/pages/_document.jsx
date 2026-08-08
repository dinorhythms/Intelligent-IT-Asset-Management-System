import { Html, Head, Main, NextScript } from 'next/document';

const INITIAL_THEME_SCRIPT = `(function () {
  try {
    var stored = null;
    var match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
    if (match) stored = decodeURIComponent(match[1]);
    if (stored !== 'light' && stored !== 'dark') {
      stored = localStorage.getItem('theme');
    }
    if (stored !== 'light' && stored !== 'dark') {
      stored = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.classList.add(stored);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: INITIAL_THEME_SCRIPT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
