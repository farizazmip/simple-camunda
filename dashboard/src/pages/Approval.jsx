import React, { useState, useEffect } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Paper,
  Container,
  CircularProgress,
  Alert,
  Chip,
  Button
} from '@mui/material';
import { Link } from 'react-router-dom';

const Approval = ({ currentUser }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!currentUser) {
          setTasks([]);
          return;
        }

        // Fetch both active and completed tasks
        const [activeTasksResponse, completedTasksResponse] = await Promise.all([
          fetch(`http://localhost:8088/engine-rest/task?assignee=${currentUser.name}`),
          fetch(`http://localhost:8088/engine-rest/history/task?taskAssignee=${currentUser.name}&finished=true`)
        ]);

        if (!activeTasksResponse.ok || !completedTasksResponse.ok) {
          throw new Error(`HTTP error! status: ${activeTasksResponse.status} or ${completedTasksResponse.status}`);
        }

        const activeTasks = await activeTasksResponse.json();
        const completedTasks = await completedTasksResponse.json();
        
        // Combine and sort all tasks
        const allTasks = [...activeTasks, ...completedTasks].sort((a, b) => {
          // Use created date if available, otherwise use endTime for completed tasks
          const dateA = a.created ? new Date(a.created) : new Date(a.endTime);
          const dateB = b.created ? new Date(b.created) : new Date(b.endTime);
          return dateB - dateA; // Descending order (newest first)
        });
        
        setTasks(allTasks);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentUser]);

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {currentUser ? `Tasks for ${currentUser.name}` : 'Please select a user'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error loading tasks: {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : tasks.length === 0 ? (
          <Typography variant="body1" sx={{ p: 2 }}>
            {currentUser 
              ? 'No tasks found for this user'
              : 'Please select a user from the dropdown'}
          </Typography>
        ) : (
          <List>
            {tasks.map((task) => (
              <ListItem 
                key={task.id} 
                component={Link}
                to={`/approval/${task.id}`}
                sx={{
                  border: '1px solid #e0e0e0',
                  mb: 1,
                  '&:hover': {
                    backgroundColor: '#f5f5f5'
                  },
                  opacity: task.endTime ? 0.8 : 1,
                  position: 'relative'
                }}
                secondaryAction={
                  <Button 
                    component={Link}
                    to={`/approval/${task.id}`}
                    size="small"
                    sx={{
                      textTransform: 'none',
                      color: task.endTime ? 'text.secondary' : 'primary.main'
                    }}
                  >
                    View Details
                  </Button>
                }
              >
                <ListItemText
                  primary={
                    <>
                      {task.name || 'Untitled Task'}
                      <Chip 
                        label={task.endTime ? 'Completed' : 'Pending'} 
                        color={task.endTime ? 'success' : 'warning'}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </>
                  }
                  secondary={
                    <>
                      <span>Created: {task.created ? new Date(task.created).toLocaleString() : new Date(task.endTime).toLocaleString()}</span>
                      {task.endTime && (
                        <>
                          <br />
                          <span>Completed: {new Date(task.endTime).toLocaleString()}</span>
                        </>
                      )}
                      <br />
                      <span>Process Instance: {task.processInstanceId}</span>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default Approval;