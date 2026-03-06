import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="application-name" content="Ekklesia" />
        <meta name="description" content="Ekklesia — Event check-in and assembly management system" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
