import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Auth from "./pages/Auth";
import Projects from "./pages/Projects";
import File from "./pages/File";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useSession } from "./hooks/auth";
import { retryConfig } from "./backend";
import Loading from "./pages/Loading";

const theme = createTheme({
  components: {
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: "#FFF",
        },
      },
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: retryConfig,
    },
  },
});

const ProtectedRoute = () => {
  const { isLoading, isError } = useSession();
  const location = useLocation();

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <Outlet />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <ThemeProvider theme={theme}>
        <Router>
          <Routes>
            <Route path="/login" element={<Auth action="login" />} />
            <Route path="/signup" element={<Auth action="signup" />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<Projects />} />
              <Route path="/files/:fileId" element={<File />} />
            </Route>

            <Route path="*" element={<Navigate to="/projects" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
