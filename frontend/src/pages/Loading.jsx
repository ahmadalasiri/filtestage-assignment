import { Box, CircularProgress } from "@mui/material";

const Loading = () => (
  <Box
    sx={{
      display: "flex",
      height: "100vh",
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <CircularProgress />
  </Box>
);

export default Loading;
