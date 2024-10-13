const express = require('express');
const mysql = require('mysql2/promise');  // Use promise-based API
require('dotenv').config();
const cors = require('cors');


const app = express();
const port = process.env.PORT || 3000;

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(cors());
app.use(express.json());

app.get("/",async (req,res)=>{
    try {
        res.send("Server running!")
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
})

// Get all users
app.get('/data', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM projects');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const [rows] = await pool.query('SELECT * FROM Users WHERE username = ?', [username]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const user = rows[0];
  
      if (password !== user.password) {
        return res.status(401).json({ error: 'Invalid password' });
      }
        res.json({ message: 'Login successful' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  


  app.post('/api/projects', async (req, res) => {
    const { title, cover_img, description, link } = req.body;

    // Validate the input
    if (!title || !cover_img || !description || !link) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO projects (title, cover_img, description, link) VALUES (?, ?, ?, ?)',
            [title, cover_img, description, link]
        );

        res.status(200).json({
            id: result.insertId,
            title,
            cover_img,
            description,
            link,
         
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params; // Current Project_id to update
  const { newId, title, cover_img, description, link } = req.body; // New project details

  // Validate input
  if (!newId || !title || !cover_img || !description || !link) {
      return res.status(400).json({ error: 'All fields are required' });
  }

  try {
      // Check if the new Project_id already exists
      const [existingProject] = await pool.query(
          'SELECT * FROM projects WHERE id = ?',
          [newId]
      );

      // If the new ID exists, we need to swap
      if (existingProject.length > 0) {
          // Use a temporary ID to avoid conflicts
          await pool.query(
              'UPDATE projects SET id = -1 WHERE id = ?',
              [id]
          );

          // Swap the IDs
          await pool.query(
              'UPDATE projects SET id = ? WHERE id = ?',
              [id, newId]
          );

          // Restore the original ID
          await pool.query(
              'UPDATE projects SET id = ? WHERE id = -1',
              [newId]
          );
      } else {
          // Directly update if no conflict
          await pool.query(
              'UPDATE projects SET id = ?, title = ?, cover_img = ?, description = ?, link = ? WHERE id = ?',
              [newId, title, cover_img, description, link, id]
          );
      }

      // Check for successful update
      const [result] = await pool.query(
          'SELECT * FROM projects WHERE id = ?',
          [newId]
      );

      if (result.length === 0) {
          return res.status(404).json({ error: 'Project not found' });
      }

      res.status(200).json({
          message: 'Project updated successfully',
          newId,
          title,
          cover_img,
          description,
          link,
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});




app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;

  try {
      const [result] = await pool.query(
          'DELETE FROM projects WHERE id = ?',
          [id]
      );

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Project not found' });
      }

      res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});




app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

