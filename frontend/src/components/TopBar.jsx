import { useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useLogout, useRemoveAccount } from "../hooks/auth";
import { useTheme } from "@mui/material/styles";
import { useSession } from "../hooks/auth";
import { useUser } from "../hooks/users";
import UserAvatar from "./UserAvatar";

const TopBar = ({ title, back = false }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const logout = useLogout();
  const removeAccount = useRemoveAccount();
  const {
    data: { userId },
  } = useSession();
  const { data: user } = useUser(userId);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            alignItems: "center",
            maxWidth: "100%",
          }}
        >
          {back ? (
            <IconButton
              edge="start"
              aria-label="back"
              component={RouterLink}
              to={back}
            >
              <ArrowBackIcon />
            </IconButton>
          ) : (
            <img src="/filestage.png" alt="Filestage" style={{ width: 100 }} />
          )}
          {title && (
            <Typography
              variant="h6"
              component="div"
              sx={{
                px: 12,
                color: theme.palette.text.primary,
                flexGrow: 1,
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>
          )}

          <IconButton aria-label="Account Menu" onClick={handleMenuOpen}>
            <UserAvatar userId={userId} />
          </IconButton>
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {user && <MenuItem disabled>{user.email}</MenuItem>}
          <MenuItem onClick={() => removeAccount.mutate()}>
            Remove Account
          </MenuItem>
          <MenuItem onClick={() => logout.mutate()}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
