import { useRouter } from 'next/router';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import '../styles/globals.css';

const PUBLIC_PAGES = ['/login', '/view/[uniqueId]', '/403'];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isPublicPage = PUBLIC_PAGES.includes(router.pathname);

  return (
    <ThemeProvider>
      <AuthProvider>
        {isPublicPage ? (
          <Component {...pageProps} />
        ) : (
          <ProtectedRoute>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </ProtectedRoute>
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}
