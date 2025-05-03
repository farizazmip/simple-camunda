import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Submission from './pages/Submission';
import Approval from './pages/Approval';
import ApprovalDetail from './pages/ApprovalDetail';
import History from './pages/History';
import NavBar from './components/NavBar';
import ApprovalDetailNoSharePoint from './pages/ApprovalDetailNoSharePoint';
import SubmissionNoSharePoint from './pages/SubmissionNoSharePoint';

const theme = createTheme();

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // Load user from localStorage when component mounts
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  // Update localStorage whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const handleUserChange = (user) => {
    setCurrentUser(user);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <NavBar 
          currentUser={currentUser} 
          onUserChange={handleUserChange} 
        />
        <Routes>
          <Route 
            path="/submission" 
            element={<SubmissionNoSharePoint currentUser={currentUser} />} 
          />
          <Route 
            path="/approval" 
            element={<Approval currentUser={currentUser} />} 
          />
          <Route path="/approval/:approval_id" element={<ApprovalDetailNoSharePoint />} />
          <Route 
            path="/history" 
            element={<History currentUser={currentUser} />} 
          />
          <Route 
            path="/" 
            element={<SubmissionNoSharePoint currentUser={currentUser} />} 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
