import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  
DB_PATH = os.path.join(BASE_DIR, "chat.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS story_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER,
    viewer_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    seen INTEGER DEFAULT 0
        )""")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE,
        username TEXT,
        avatar TEXT,
        bio TEXT
    
    )
        """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS blocked_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER,
    blocked_id INTEGER,
    UNIQUE(blocker_id, blocked_id)
    )
    """)
    cur.execute("""
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    text TEXT,
    image TEXT,
    reaction TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER DEFAULT 0
)
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    text TEXT,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS message_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER,
        user_id INTEGER,
        reaction TEXT,
        UNIQUE(message_id, user_id)
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS message_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER,
        user_id INTEGER,
        reaction TEXT,
        UNIQUE(message_id, user_id)
    )
""")
    conn.commit()
    conn.close()

def block_user(blocker, blocked):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id)
        VALUES (?, ?)
    """, (blocker, blocked))

    conn.commit()
    conn.close()


def unblock_user(blocker, blocked):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        DELETE FROM blocked_users
        WHERE blocker_id=? AND blocked_id=?
    """, (blocker, blocked))

    conn.commit()
    conn.close()


def is_blocked(user1, user2):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT 1 FROM blocked_users
        WHERE (blocker_id=? AND blocked_id=?)
           OR (blocker_id=? AND blocked_id=?)
    """, (user1, user2, user2, user1))

    res = cur.fetchone()
    conn.close()

    return res is not None
def update_profile(user_id, username, bio, avatar=None):
    conn = get_db()
    cur = conn.cursor()

    if avatar:
        cur.execute("""
            UPDATE users
            SET username=?, bio=?, avatar=?
            WHERE id=?
        """, (username, bio, avatar, user_id))
    else:
        cur.execute("""
            UPDATE users
            SET username=?, bio=?
            WHERE id=?
        """, (username, bio, user_id))

    conn.commit()
    conn.close()

def get_user_profile(user_id):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE id=?", (user_id,))
    user = cur.fetchone()

    conn.close()
    return user

def get_unread_counts(user_id): 
    conn = get_db() 
    cur = conn.cursor() 
    cur.execute(""" SELECT sender_id, COUNT(*) 
                as count FROM messages 
                WHERE receiver_id=? AND is_read=0 GROUP BY sender_id """, 
                (user_id,)) 
    data = cur.fetchall() 
    conn.close() 
    return [{"sender": row["sender_id"], "count": row["count"]} for row in data]

def mark_messages_read(sender_id, receiver_id): 
    conn = get_db() 
    cur = conn.cursor() 
    cur.execute(""" UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=? AND is_read=0 """, 
                (sender_id, receiver_id)) 
    conn.commit() 
    conn.close()

def get_story_viewers(story_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT u.id, u.username, u.avatar
        FROM story_views sv
        JOIN users u ON sv.viewer_id = u.id
        WHERE sv.story_id = ?
        ORDER BY sv.created_at
    """, (story_id,))
    rows = cur.fetchall()
    conn.close()
    return [{"id": r["id"], "username": r["username"], "avatar": r["avatar"]} for row in rows for r in [row]]

def delete_chat(user1_id, user2_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM messages
        WHERE (sender_id=? AND receiver_id=?)
           OR (sender_id=? AND receiver_id=?)
    """, (user1_id, user2_id, user2_id, user1_id))
    conn.commit()
    conn.close()

def toggle_like(message_id, user_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id FROM message_likes WHERE message_id=? AND user_id=?", (message_id, user_id))
    exists = cur.fetchone()
    if exists:
        cur.execute("DELETE FROM message_likes WHERE message_id=? AND user_id=?", (message_id, user_id))
        liked = False
    else:
        cur.execute("INSERT INTO message_likes (message_id, user_id) VALUES (?, ?)", (message_id, user_id))
        liked = True
    conn.commit()
    conn.close()
    return liked

def get_likes(message_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM message_likes WHERE message_id=?", (message_id,))
    row = cur.fetchone()
    conn.close()
    return row["cnt"]

def set_reaction(message_id, user_id, reaction):
    conn = get_db()
    cur = conn.cursor()
    if reaction == "":
        cur.execute("DELETE FROM message_reactions WHERE message_id=? AND user_id=?", (message_id, user_id))
    else:
        cur.execute("""
            INSERT INTO message_reactions (message_id, user_id, reaction)
            VALUES (?, ?, ?)
            ON CONFLICT(message_id, user_id) DO UPDATE SET reaction=excluded.reaction
        """, (message_id, user_id, reaction))
    conn.commit()
    conn.close()

def get_reactions(message_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT reaction, COUNT(*) as cnt
        FROM message_reactions
        WHERE message_id=?
        GROUP BY reaction
    """, (message_id,))
    rows = cur.fetchall()
    conn.close()
    return [{"reaction": r["reaction"], "count": r["cnt"]} for r in rows]

def get_my_reaction(message_id, user_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT reaction FROM message_reactions WHERE message_id=? AND user_id=?", (message_id, user_id))
    row = cur.fetchone()
    conn.close()
    return row["reaction"] if row else None