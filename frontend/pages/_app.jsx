import { useRouter } from 'next/router';
import { AuthProvider } from '../context/AuthContext';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import '../styles/globals.css';

const AUTH_PAGES = ['/login', '/register'];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isAuthPage = AUTH_PAGES.includes(router.pathname);

  return (
    <AuthProvider>
      {isAuthPage ? (
        <Component {...pageProps} />
      ) : (
        <ProtectedRoute>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ProtectedRoute>
      )}
    </AuthProvider>
  );
}
