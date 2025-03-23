const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const app = express();
const port = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('todos.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    
    // Drop existing tables
    db.run('DROP TABLE IF EXISTS comments', (err) => {
      if (err) {
        console.error('Error dropping comments table:', err);
        return;
      }
      
      db.run('DROP TABLE IF EXISTS todos', (err) => {
        if (err) {
          console.error('Error dropping todos table:', err);
          return;
        }
        
        db.run('DROP TABLE IF EXISTS categories', (err) => {
          if (err) {
            console.error('Error dropping categories table:', err);
            return;
          }
          
          // Create categories table
          db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
          )`, (err) => {
            if (err) {
              console.error('Error creating categories table:', err);
              return;
            }
            console.log('Categories table created successfully');

            // Create updated todos table with new fields
            db.run(`CREATE TABLE IF NOT EXISTS todos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              text TEXT NOT NULL,
              completed BOOLEAN DEFAULT 0,
              category_id INTEGER,
              priority INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              due_date DATETIME,
              FOREIGN KEY (category_id) REFERENCES categories (id)
            )`, (err) => {
              if (err) {
                console.error('Error creating todos table:', err);
                return;
              }
              console.log('Todos table created successfully');

              // Create comments table
              db.run(`CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                todo_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (todo_id) REFERENCES todos (id)
              )`, (err) => {
                if (err) {
                  console.error('Error creating comments table:', err);
                  return;
                }
                console.log('Comments table created successfully');
              });
            });
          });
        });
      });
    });
  }
});

// Routes
// Get all todos with pagination, search, and filters
app.get('/api/todos', (req, res) => {
  const { page = 1, limit = 10, search = '', category, priority, completed } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT t.*, c.name as category_name, 
    (SELECT COUNT(*) FROM comments WHERE todo_id = t.id) as comment_count 
    FROM todos t 
    LEFT JOIN categories c ON t.category_id = c.id 
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND t.text LIKE ?`;
    params.push(`%${search}%`);
  }
  if (category) {
    query += ` AND t.category_id = ?`;
    params.push(category);
  }
  if (priority) {
    query += ` AND t.priority = ?`;
    params.push(priority);
  }
  if (completed !== undefined) {
    query += ` AND t.completed = ?`;
    params.push(completed);
  }

  query += ` ORDER BY t.priority DESC, t.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Get total count for pagination
    db.get(`SELECT COUNT(*) as total FROM todos`, [], (err, count) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        todos: rows,
        total: count.total,
        pages: Math.ceil(count.total / limit)
      });
    });
  });
});

// Create a new todo
app.post('/api/todos', (req, res) => {
  const { text, category_id, priority, due_date } = req.body;
  
  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  // Validate priority
  const validPriority = priority ? parseInt(priority) : 1;
  if (![1, 2, 3].includes(validPriority)) {
    res.status(400).json({ error: 'Priority must be 1, 2, or 3' });
    return;
  }

  // Convert category_id to integer or null
  const validCategoryId = category_id ? parseInt(category_id) : null;

  console.log('Creating new todo:', { text, category_id: validCategoryId, priority: validPriority, due_date });

  db.run(
    'INSERT INTO todos (text, category_id, priority, due_date) VALUES (?, ?, ?, ?)',
    [text, validCategoryId, validPriority, due_date],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      // Fetch the complete todo to return
      db.get(
        `SELECT t.*, c.name as category_name, 
        (SELECT COUNT(*) FROM comments WHERE todo_id = t.id) as comment_count 
        FROM todos t 
        LEFT JOIN categories c ON t.category_id = c.id 
        WHERE t.id = ?`,
        [this.lastID],
        (err, row) => {
          if (err) {
            console.error('Error fetching created todo:', err);
            res.status(500).json({ error: err.message });
            return;
          }
          console.log('Created todo:', row);
          res.json(row);
        }
      );
    }
  );
});

// Categories routes
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  db.run('INSERT INTO categories (name) VALUES (?)', [name], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name });
  });
});

// Comments routes
app.get('/api/todos/:todoId/comments', (req, res) => {
  const { todoId } = req.params;
  db.all('SELECT * FROM comments WHERE todo_id = ? ORDER BY created_at DESC', [todoId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/todos/:todoId/comments', (req, res) => {
  const { todoId } = req.params;
  const { text } = req.body;
  db.run(
    'INSERT INTO comments (todo_id, text) VALUES (?, ?)',
    [todoId, text],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        id: this.lastID,
        todo_id: todoId,
        text,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Export to CSV
app.get('/api/export/csv', (req, res) => {
  db.all(`
    SELECT t.*, c.name as category_name 
    FROM todos t 
    LEFT JOIN categories c ON t.category_id = c.id
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const csvWriter = createCsvWriter({
      path: 'export.csv',
      header: [
        { id: 'id', title: 'ID' },
        { id: 'text', title: 'Task' },
        { id: 'completed', title: 'Completed' },
        { id: 'category_name', title: 'Category' },
        { id: 'priority', title: 'Priority' },
        { id: 'created_at', title: 'Created At' },
        { id: 'due_date', title: 'Due Date' }
      ]
    });

    csvWriter.writeRecords(rows)
      .then(() => {
        res.download('export.csv', 'todos.csv', (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
          }
          fs.unlinkSync('export.csv');
        });
      });
  });
});

// Export to JSON
app.get('/api/export/json', (req, res) => {
  db.all(`
    SELECT t.*, c.name as category_name 
    FROM todos t 
    LEFT JOIN categories c ON t.category_id = c.id
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Import from JSON
app.post('/api/import/json', (req, res) => {
  const todos = req.body;
  const stmt = db.prepare('INSERT INTO todos (text, completed, category_id, priority, due_date) VALUES (?, ?, ?, ?, ?)');
  
  todos.forEach(todo => {
    stmt.run([todo.text, todo.completed, todo.category_id, todo.priority, todo.due_date]);
  });
  
  stmt.finalize();
  res.json({ message: 'Import completed successfully' });
});

// Update a todo
app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { text, completed, category_id, priority, due_date } = req.body;
  
  let query = 'UPDATE todos SET';
  const params = [];
  const updates = [];

  if (text !== undefined) {
    updates.push(' text = ?');
    params.push(text);
  }
  if (completed !== undefined) {
    updates.push(' completed = ?');
    params.push(completed);
  }
  if (category_id !== undefined) {
    updates.push(' category_id = ?');
    params.push(category_id);
  }
  if (priority !== undefined) {
    updates.push(' priority = ?');
    params.push(priority);
  }
  if (due_date !== undefined) {
    updates.push(' due_date = ?');
    params.push(due_date);
  }

  query += updates.join(',') + ' WHERE id = ?';
  params.push(id);

  db.run(query, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Fetch the updated todo to return
    db.get(
      `SELECT t.*, c.name as category_name, 
      (SELECT COUNT(*) FROM comments WHERE todo_id = t.id) as comment_count 
      FROM todos t 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE t.id = ?`,
      [id],
      (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(row);
      }
    );
  });
});

// Delete a todo
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  
  // First delete associated comments
  db.run('DELETE FROM comments WHERE todo_id = ?', [id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Then delete the todo
    db.run('DELETE FROM todos WHERE id = ?', [id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Todo deleted successfully' });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 