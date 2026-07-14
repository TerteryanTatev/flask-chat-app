# Flask Messenger

A full-stack messaging platform built with Flask, SQLite, and Vanilla JavaScript that reproduces the core functionality of modern messaging applications. The project follows a REST-oriented backend architecture with a lightweight client-side implementation, providing private messaging, media sharing, user profiles, stories, reactions, posts, and user privacy controls.

The application was developed to demonstrate backend API design, relational database modeling, asynchronous client-server communication, and responsive interface development without relying on frontend frameworks.

---

## Overview

The system is composed of three major layers:

- Flask backend responsible for routing, authentication, business logic, and REST endpoints.
- SQLite relational database for persistent data storage.
- Vanilla JavaScript frontend responsible for rendering, state synchronization, asynchronous communication, and user interaction.

All communication between the client and server is performed through Fetch API requests returning JSON responses.

---

## Core Functionality

### Authentication

Authentication is performed using a phone number and username combination.

The authentication layer provides:

- User registration
- Existing account login
- Session management
- Client-side persistence
- Automatic account creation for first-time users

---

### Messaging

The messaging module supports private conversations between registered users.

Implemented functionality includes:

- One-to-one conversations
- Text messages
- Image messages
- Read receipts
- Conversation history
- Message timestamps
- Date grouping
- Entire conversation deletion
- Individual message deletion
- File sharing
- Conversation list
- Unread message counters

---

### Message Reactions

Every message supports emoji reactions.

The reaction engine allows users to:

- Add reactions
- Remove reactions
- Update existing reactions
- Display aggregated reaction counts
- Highlight the current user's reaction

Reaction statistics are computed dynamically from the database.

---

### Stories

The application implements temporary stories similar to those found in modern social platforms.

Features include:

- Story creation
- Media uploads
- Automatic 24-hour visibility
- Story viewer
- Seen status
- Story ordering
- Viewer tracking
- Owner-only viewer analytics

---

### User Profiles

Each user owns a customizable profile containing:

- Username
- Phone number
- Biography
- Avatar image

The profile system supports live editing without requiring account recreation.

---

### Social Posts

Users can publish standalone posts consisting of:

- Text
- Images

Posts are displayed inside the profile interface and can be opened in dedicated preview modals.

---

### User Privacy

The application includes a complete blocking system.

Blocked users:

- Cannot exchange messages
- Cannot appear inside conversations
- Cannot initiate new chats

Blocking relationships are persisted in the database.

---

### Media Management

Uploaded content is organized into dedicated storage directories.

Supported media includes:

- Chat images
- Story images
- Profile avatars
- Post images

All uploads are handled by Flask and stored inside the static directory.

---

## Software Architecture

```
Client (HTML/CSS/JavaScript)
            │
            │ HTTP / Fetch API
            ▼
        Flask Application
            │
            ▼
      Business Logic Layer
            │
            ▼
        SQLite Database
```

The frontend never communicates directly with the database. All operations pass through REST endpoints implemented in Flask.

---

## Database Design

The application uses SQLite as its relational database.

Primary entities include:

| Table | Description |
|--------|-------------|
| users | User accounts and profile information |
| messages | Private messages |
| message_reactions | Emoji reactions |
| message_likes | Message likes |
| posts | User posts |
| stories | Temporary stories |
| story_views | Story viewers |
| blocked_users | Blocking relationships |

The database layer is centralized inside `DB/db.py`, which contains schema initialization, reusable queries, and helper functions.

---

## Project Structure

```
Flask-Messenger
│
├── DB
│   ├── chat.db
│   └── db.py
│
├── static
│   ├── avatars
│   ├── css
│   │   ├── login.css
│   │   └── style.css
│   ├── img
│   ├── js
│   │   └── script.js
│   ├── posts
│   ├── stories
│   └── uploads
│
├── templates
│   ├── login.html
│   └── chat.html
│
├── app.py
├── requirements.txt
├── .gitignore
└── README.md
```

---

## REST API

### Authentication

```
POST /
GET /logout
```

### Messaging

```
POST /send
GET /messages/<user_id>
DELETE /delete-chat/<user_id>
POST /delete-messages
```

### Chats

```
GET /chats
GET /contacts
GET /unread
POST /mark-read
```

### Profiles

```
GET /get-profile
POST /update-profile
GET /user/<id>
```

### Stories

```
POST /create-story
GET /stories
POST /view-story
GET /story-viewers/<id>
```

### Posts

```
POST /create-post
GET /user-posts/<id>
```

### Privacy

```
POST /block/<id>
POST /unblock/<id>
GET /is-blocked/<id>
```

### Reactions

```
POST /react/<message_id>
```

---

## Technologies

### Backend

- Python 3
- Flask
- SQLite3

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript (ES6)

### Communication

- REST API
- Fetch API
- JSON

---

## Installation

Clone the repository.

```bash
git clone https://github.com/USERNAME/Flask-Messenger.git
```

Install the required packages.

```bash
pip install -r requirements.txt
```

Run the application.

```bash
python app.py
```

The application will be available at

```
http://127.0.0.1:5000
```

---

## Future Improvements

The current architecture has been designed to allow future extension with additional functionality, including:

- WebSocket-based real-time messaging
- Online presence detection
- Typing indicators
- Group conversations
- Voice messaging
- Video attachments
- Push notifications
- Message editing
- Message forwarding
- End-to-end encryption
- PostgreSQL support
- Docker deployment

---

## License

This project was developed for educational purposes and as a demonstration of full-stack web application development using Flask and Vanilla JavaScript.
