import {
  TextField,
  Button,
  Box,
  Typography,
  Container,
  Link,
} from "@mui/material";
import { useLogin, useSignUp } from "../hooks/auth";
import { useSearchParams, Link as RouterLink } from "react-router-dom";

const Auth = ({ action }) => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const actions = {
    login: useLogin(),
    signup: useSignUp(),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    actions[action].mutate({
      email: e.target.email.value,
      password: e.target.password.value,
    });
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography variant="h5">
          {action === "login" ? "Login" : "Sign Up"}
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ mt: 2, width: "100%" }}
        >
          <TextField
            name="email"
            label="Email"
            fullWidth
            margin="normal"
            required
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            required
          />
          {actions[action].isError && (
            <Typography color="error">
              {actions[action].error.message}
            </Typography>
          )}
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            {action === "login" ? "Login" : "Sign Up"}
          </Button>
          <Typography variant="body2" sx={{ mt: 2 }}>
            {action === "login"
              ? "Don't have an account"
              : "Already have an account?"}{" "}
            <Link
              component={RouterLink}
              to={`/${action === "login" ? "signup" : "login"}${redirect ? `?redirect=${redirect}` : ""}`}
              replace
              underline="hover"
            >
              {action === "login" ? "Sign up here" : "Login here"}
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Auth;
