import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priority, setPriority] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchTodos(), fetchCategories()]);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchTodos();
    }
  }, [currentPage, searchTerm, selectedCategory]);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.body.className = savedDarkMode ? 'dark-mode' : '';
  }, []);

  const fetchTodos = async () => {
    try {
      console.log('Fetching todos with params:', {
        page: currentPage,
        search: searchTerm,
        category: selectedCategory
      });

      const response = await fetch(
        `http://localhost:5001/api/todos?page=${currentPage}&search=${encodeURIComponent(searchTerm)}&category=${selectedCategory || ''}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Failed to fetch todos: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Server response for todos:', data);
      
      if (!data || typeof data !== 'object') {
        console.error('Invalid data format received:', data);
        throw new Error('Invalid data format received from server');
      }

      if (!Array.isArray(data.todos)) {
        console.error('Todos is not an array:', data.todos);
        throw new Error('Todos data is not in the expected format');
      }

      setTodos(data.todos);
      setTotalPages(Math.max(1, data.pages || Math.ceil(data.total / 10) || 1));
      
      console.log('Successfully updated todos state:', {
        todosCount: data.todos.length,
        totalPages: data.pages,
        total: data.total
      });
    } catch (error) {
      console.error('Error fetching todos:', error);
      setTodos([]);
      setTotalPages(1);
      alert('Failed to fetch todos. Please refresh the page.');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      console.log('Adding new todo:', {
        text: newTodo,
        category_id: selectedCategory || null,
        priority: priority,
        due_date: dueDate || null
      });

      const response = await fetch('http://localhost:5001/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newTodo,
          category_id: selectedCategory ? parseInt(selectedCategory) : null,
          priority: parseInt(priority),
          due_date: dueDate || null
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server error response:', errorData);
        throw new Error(`Failed to add todo: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Server response for new todo:', data);
      
      // Update the todos list immediately
      setTodos(prevTodos => [...prevTodos, {
        ...data,
        category_name: categories.find(c => c.id === (selectedCategory ? parseInt(selectedCategory) : null))?.name,
        comment_count: 0
      }]);
      
      setNewTodo('');
      setSelectedCategory('');
      setPriority(1);
      setDueDate('');
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('Failed to add todo. Please try again.');
    }
  };

  const toggleTodo = async (id, completed) => {
    try {
      const response = await fetch(`http://localhost:5001/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update todo');
      }
      
      const updatedTodo = await response.json();
      console.log('Updated todo:', updatedTodo);
      
      setTodos(todos.map(todo => 
        todo.id === id ? updatedTodo : todo
      ));
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/todos/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete todo');
      }
      
      console.log('Deleted todo:', id);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    try {
      const response = await fetch('http://localhost:5001/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory }),
      });
      const data = await response.json();
      setCategories([...categories, data]);
      setNewCategory('');
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const fetchComments = async (todoId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/todos/${todoId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      console.log('Fetched comments:', data);
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  };

  const handleTodoClick = async (todo) => {
    setSelectedTodo(todo);
    await fetchComments(todo.id);
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTodo) return;

    try {
      const response = await fetch(`http://localhost:5001/api/todos/${selectedTodo.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const data = await response.json();
      console.log('Added new comment:', data);
      
      // Update comments list
      setComments(prevComments => [...prevComments, data]);
      
      // Update todo's comment count in the main list
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === selectedTodo.id 
            ? { ...todo, comment_count: (todo.comment_count || 0) + 1 }
            : todo
        )
      );
      
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };

  const exportData = async (format) => {
    try {
      const response = await fetch(`http://localhost:5001/api/export/${format}`);
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todos.${format}`;
        a.click();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todos.${format}`;
        a.click();
      }
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
    }
  };

  const importJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const todos = JSON.parse(e.target.result);
        await fetch('http://localhost:5001/api/import/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(todos),
        });
        fetchTodos();
      } catch (error) {
        console.error('Error importing JSON:', error);
      }
    };
    reader.readAsText(file);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    document.body.className = newDarkMode ? 'dark-mode' : '';
  };

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <div className="container">
        <header>
          <h1>Todo App</h1>
          <button onClick={toggleDarkMode} className="theme-toggle">
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </header>

        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="controls">
              <div className="search-filter">
                <input
                  type="text"
                  placeholder="Search todos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="import-export">
                <button onClick={() => exportData('csv')}>Export CSV</button>
                <button onClick={() => exportData('json')}>Export JSON</button>
                <input
                  type="file"
                  accept=".json"
                  onChange={importJSON}
                  style={{ display: 'none' }}
                  id="import-json"
                />
                <label htmlFor="import-json" className="button">Import JSON</label>
              </div>
            </div>

            <form onSubmit={addCategory} className="category-form">
              <input
                type="text"
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button type="submit">Add Category</button>
            </form>

            <form onSubmit={addTodo} className="todo-form">
              <input
                type="text"
                placeholder="New todo"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                {Array.isArray(categories) && categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              >
                <option value="1">Low Priority</option>
                <option value="2">Medium Priority</option>
                <option value="3">High Priority</option>
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <button type="submit">Add Todo</button>
            </form>

            <div className="todos-container">
              {Array.isArray(todos) && todos.map(todo => (
                <div key={todo.id} className={`todo-item priority-${todo.priority}`}>
                  <div className="todo-header">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id, todo.completed)}
                    />
                    <span className={todo.completed ? 'completed' : ''}>
                      {todo.text}
                    </span>
                    <span className="category-tag">{todo.category_name}</span>
                    <span className="priority-tag">
                      Priority: {['Low', 'Medium', 'High'][todo.priority - 1]}
                    </span>
                  </div>
                  
                  <div className="todo-footer">
                    <button onClick={() => handleTodoClick(todo)}>
                      Comments ({todo.comment_count})
                    </button>
                    <button onClick={() => deleteTodo(todo.id)} className="delete-btn">
                      Delete
                    </button>
                    {todo.due_date && (
                      <span className="due-date">
                        Due: {new Date(todo.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {todos.length === 0 && !isLoading && (
              <div className="no-todos">No todos found</div>
            )}

            {selectedTodo && (
              <div className="modal">
                <div className="modal-content">
                  <h3>Comments for: {selectedTodo.text}</h3>
                  <div className="comments-list">
                    {comments.map(comment => (
                      <div key={comment.id} className="comment">
                        <p>{comment.text}</p>
                        <small>{new Date(comment.created_at).toLocaleString()}</small>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="no-comments">No comments yet</p>
                    )}
                  </div>
                  <form onSubmit={addComment} className="comment-form">
                    <input
                      type="text"
                      placeholder="Add a comment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button type="submit">Add Comment</button>
                  </form>
                  <button onClick={() => {
                    setSelectedTodo(null);
                    setComments([]);
                  }} className="close-btn">
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="pagination">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App; 