import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { LangProvider } from '../contexts/LangContext';

const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('ekklesia-theme') || 'light';
      document.documentElement.setAttribute('data-theme', t);
    } catch(e) {}
  })();
`;

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <LangProvider>
        <Component {...pageProps} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000, // auto-dismiss after 5 seconds
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--sans)',
              fontSize: '13px',
              boxShadow: 'var(--shadow-md)',
            },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
      </LangProvider>
    </>
  );
}
