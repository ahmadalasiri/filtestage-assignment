import { Avatar, Tooltip } from "@mui/material";
import { useUser } from "../hooks/users";

const UserAvatar = ({ userId }) => {
  const { data: user } = useUser(userId);
  if (!user) {
    return;
  }

  return (
    <Tooltip title={user.email}>
      <Avatar src={`https://i.pravatar.cc/150?u=${user._id}`}>
        {user.email.slice(0, 2).toUpperCase()}
      </Avatar>
    </Tooltip>
  );
};

export default UserAvatar;
