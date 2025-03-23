# Todo Application

A full-stack todo application built with React, Express, Node.js, and SQLite.

## Features

- Create new todos
- Mark todos as complete/incomplete
- Delete todos
- Persistent storage using SQLite
- Modern and responsive UI

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup Instructions

1. Clone the repository
2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

## Running the Application

1. Start the backend server:
   ```bash
   npm run dev
   ```
   The server will start on http://localhost:5000

2. In a new terminal, start the frontend development server:
   ```bash
   cd client
   npm start
   ```
   The React app will start on http://localhost:3000

3. Open your browser and navigate to http://localhost:3000 to use the application

## API Endpoints

- GET /api/todos - Get all todos
- POST /api/todos - Create a new todo
- PUT /api/todos/:id - Update a todo
- DELETE /api/todos/:id - Delete a todo

## Technologies Used

- Frontend: React.js
- Backend: Express.js, Node.js
- Database: SQLite
- Styling: CSS 