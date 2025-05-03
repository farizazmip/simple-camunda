import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button,
  Menu,
  MenuItem,
  Avatar,
  Box,
  IconButton
} from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';

// Mock users data
const users = [
  { email: 'demo@demo.com', name: 'demo' },
  { email: 'adrian@gmail.com', name: 'adrian' },
  { email: 'farizazmip@gmail.com', name: 'farizazmip' },
];

const NavBar = ({ currentUser, onUserChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleUserSelect = (user) => {
    onUserChange(user);
    handleClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Approval System
        </Typography>
        
        <Button color="inherit" component={Link} to="/submission">
          New Submission
        </Button>
        <Button color="inherit" component={Link} to="/approval">
          Approvals
        </Button>
        <Button color="inherit" component={Link} to="/history">
          History
        </Button>
        
        <Box sx={{ ml: 2 }}>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            {currentUser ? (
              <Avatar sx={{ width: 32, height: 32 }}>
                {currentUser.name.charAt(0)}
              </Avatar>
            ) : (
              <AccountCircle />
            )}
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            {users.map((user) => (
              <MenuItem 
                key={user.email}
                onClick={() => handleUserSelect(user)}
                selected={currentUser?.email === user.email}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                    {user.name.charAt(0)}
                  </Avatar>
                  {user.name} ({user.email})
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
