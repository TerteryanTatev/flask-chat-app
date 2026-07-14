from flask import Flask, render_template, request, jsonify, session, redirect
from DB.db import (get_db, init_db, get_user_profile, update_profile,
                   mark_messages_read, get_unread_counts, get_story_viewers,
                   delete_chat, set_reaction, get_reactions, get_my_reaction, is_blocked,block_user, unblock_user)
import os
import random
import math
import uuid

def randomColor():
    colors = [
                    "#FF6B6B","#6BCB77","#4D96FF",
                    "#FFC75F","#845EC2","#FF9671",
                    "#00C9A7","#C34A36"
                ]
    return colors[math.floor(random.random()*len(colors))]


app = Flask(__name__)
app.secret_key = "secret"

init_db()
@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        phone = request.form["phone"].strip()
        username = request.form["username"].strip()

        conn = get_db()
        cur = conn.cursor()

        cur.execute("SELECT * FROM users WHERE phone=?", (phone,))
        user_by_phone = cur.fetchone()

        cur.execute("SELECT * FROM users WHERE username=?", (username,))
        user_by_username = cur.fetchone()

        if user_by_phone and user_by_phone["username"] != username:
            conn.close()
            return render_template("login.html", error="Սխալ username այս համարի համար")

        if user_by_username and user_by_username["phone"] != phone:
            conn.close()
            return render_template("login.html", error="Այս username-ը կապված է այլ համարի հետ")

        if not user_by_phone and not user_by_username:
            cur.execute(
                "INSERT INTO users (phone, username, avatar) VALUES (?, ?, ?)",
                (phone, username, randomColor())
            )
            conn.commit()
            user_id = cur.lastrowid
        else:
            user_id = user_by_phone["id"]

        session["user_id"] = user_id
        session["username"] = username

        conn.close()
        return render_template("chat.html")

    return render_template("login.html")


@app.route("/delete-chat/<int:user_id>", methods=["DELETE"])
def delete_chat_route(user_id):
    delete_chat(session["user_id"], user_id)
    return jsonify({"status": "ok"})

@app.route("/mark-read", methods=["POST"])
def mark_read():
    data = request.get_json()
    sender = data.get("sender")

    mark_messages_read(sender, session["user_id"])

    return jsonify({"status": "ok"})

@app.route("/user/<int:user_id>")
def get_user(user_id):
    user = get_user_profile(user_id)

    return jsonify({
        "id": user["id"],  
        "username": user["username"],
        "phone": user["phone"],
        "bio": user["bio"],
        "avatar": user["avatar"]
    })

@app.route("/contacts")
def contacts():
    me = session["user_id"]

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT DISTINCT u.id, u.username, u.avatar
        FROM users u
        JOIN messages m
        ON (u.id = m.sender_id OR u.id = m.receiver_id)
        WHERE u.id != ?
        AND (m.sender_id = ? OR m.receiver_id = ?)
    """, (me, me, me))

    rows = cur.fetchall()
    conn.close()

    return jsonify([
        {
            "id": r["id"],
            "username": r["username"],
            "avatar": r["avatar"]
        } for r in rows
    ])

@app.route("/search", methods=["POST"])
def search():
    phone = request.json["phone"]

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE phone=?", (phone,))
    user = cur.fetchone()

    conn.close()
    
    


    if user:
        if is_blocked(session["user_id"], user["id"]):
            return jsonify({"error": "blocked"})
        return jsonify({"id": user["id"]})

    return jsonify({"error": "not found"})


UPLOAD_FOLDER = os.path.join("static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/send", methods=["POST"])
def send():
    sender = session["user_id"]

    if request.is_json:
        data = request.get_json()
        receiver = data.get("receiver")
        image = data.get("image")  
        text = None
    else:
        receiver = request.form.get("to")
        text = request.form.get("text")
        file = request.files.get("image")

        image = None
        if file and file.filename != "":
            ext = file.filename.split(".")[-1]
            filename = f"{uuid.uuid4()}.{ext}"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
            image = f"/static/uploads/{filename}"

    if is_blocked(sender, int(receiver)):
        return jsonify({"error": "blocked"}), 403

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO messages (sender_id, receiver_id, text, image)
        VALUES (?, ?, ?, ?)
    """, (sender, receiver, text, image))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

@app.route("/messages/<int:user_id>")
def messages(user_id):
    me = session["user_id"]
    conn = get_db()

    if is_blocked(me, user_id):
        return jsonify([])
    
    rows = conn.execute("""
        SELECT 
            m.id,
            m.sender_id,
            m.text,
            m.image,
            m.reaction,
            m.created_at,
            m.is_read,

            COUNT(ml.id) as like_count,

            MAX(
                CASE 
                    WHEN ml.user_id = ? THEN 1
                    ELSE 0
                END
            ) as i_liked

        FROM messages m

        LEFT JOIN message_likes ml 
            ON ml.message_id = m.id

        WHERE 
            (m.sender_id = ? AND m.receiver_id = ?)
            OR
            (m.sender_id = ? AND m.receiver_id = ?)

        GROUP BY m.id

        ORDER BY m.created_at
    """, (
        me,
        me, user_id,
        user_id, me
    )).fetchall()
    conn.close()
 
    result = []
    for r in rows:
        reactions = get_reactions(r["id"])
        my = get_my_reaction(r["id"], me)
        result.append({
        "id": r["id"],
        "text": r["text"],
        "sender": r["sender_id"],
        "image": r["image"],
        "time": r["created_at"],
        "is_read": r["is_read"],
        "like_count": r["like_count"],
        "i_liked": r["i_liked"],
        "reactions": reactions, 
        "my_reaction": my         
        })
    return jsonify(result)
    
@app.route("/block/<int:user_id>", methods=["POST"])
def block(user_id):
    block_user(session["user_id"], user_id)
    return jsonify({"status":"blocked"})

@app.route("/unblock/<int:user_id>", methods=["POST"])
def unblock(user_id):
    unblock_user(session["user_id"], user_id)
    return jsonify({"status":"unblocked"})

@app.route("/chats")
def chats():
    me = session["user_id"]
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT DISTINCT u.id, u.phone, u.username, u.avatar, u.bio
        FROM users u
        JOIN messages m 
          ON (u.id = m.sender_id OR u.id = m.receiver_id)
        WHERE u.id != ? AND (m.sender_id = ? OR m.receiver_id = ?)
        AND u.id NOT IN (
        SELECT blocked_id FROM blocked_users WHERE blocker_id = ?
        )
        AND u.id NOT IN (
        SELECT blocker_id FROM blocked_users WHERE blocked_id = ?
        )""", (me, me, me, me, me))
    
    rows = cur.fetchall()
    conn.close()
    
    return jsonify([
        {
            "id": r["id"],
            "phone": r["phone"],
            "username": r["username"],
            "avatar": r["avatar"],
            "bio": r["bio"] or ""    
        } 
        for r in rows
    ])
    

@app.route("/unread")
def unread():
    user_id = session["user_id"]
    data = get_unread_counts(user_id)
    return jsonify(data)
    
@app.route("/files")
def files():
    conn = get_db()
    rows = conn.execute("""
        SELECT 
            m.image,
            s.username,
            r.username
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        JOIN users r ON m.receiver_id = r.id
        WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND m.image IS NOT NULL
    """, (session["user_id"], session["user_id"])).fetchall()

    return jsonify([
        {
            "image": r[0],
            "sender": r[1],
            "receiver": r[2]
        }
        for r in rows
    ])

@app.route("/is-blocked/<int:user_id>")
def check_block(user_id):
    blocked = is_blocked(session["user_id"], user_id)
    return jsonify({"blocked": blocked})

@app.route("/send_image", methods=["POST"])
def send_image():
    data = request.json
    conn = get_db()
    conn.execute("""
        INSERT INTO messages(sender_id, receiver_id, image)
        VALUES (?, ?, ?)
    """, (
        session["user_id"],
        data["receiver_id"],
        data["image"]
    ))

    conn.commit()
    return "ok"

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

@app.route("/get-profile")
def get_profile():
    user_id = session["user_id"]
    user = get_user_profile(user_id)

    return jsonify({
        "id": user["id"],
        "username": user["username"],
        "phone": user["phone"],
        "bio": user["bio"],
        "avatar": user["avatar"]
    })

AVATAR_FOLDER = "static/avatars"
os.makedirs(AVATAR_FOLDER, exist_ok=True)

@app.route("/update-profile", methods=["POST"])
def update_profile_route():
    user_id = session["user_id"]

    username = request.form.get("username")
    bio = request.form.get("bio")

    avatar_path = None
    file = request.files.get("avatar")

    if file and file.filename != "":
        ext = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"  
        path = os.path.join(AVATAR_FOLDER, filename)

        file.save(path)

        avatar_path = f"/static/avatars/{filename}" 

    update_profile(user_id, username, bio, avatar_path)

    return "ok"

@app.route("/delete-messages", methods=["POST"])
def delete_messages():

    data = request.get_json()
    ids = data.get("ids", [])

    if not ids:
        return jsonify({"status": "empty"})

    conn = get_db()
    cur = conn.cursor()

    query = f"DELETE FROM messages WHERE id IN ({','.join(['?']*len(ids))})"
    cur.execute(query, ids)

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})


@app.route("/create-post", methods=["POST"])
def create_post():
    user_id = session["user_id"]

    text = request.form.get("text")
    file = request.files.get("image")

    image_path = None

    if file and file.filename != "":
        import uuid, os
        filename = f"{uuid.uuid4()}.{file.filename.split('.')[-1]}"
        path = os.path.join("static/posts", filename)
        os.makedirs("static/posts", exist_ok=True)
        file.save(path)

        image_path = f"/static/posts/{filename}"

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO posts (user_id, text, image)
        VALUES (?, ?, ?)
    """, (user_id, text, image_path))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})


@app.route("/user-posts/<int:user_id>")
def user_posts(user_id):

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM posts
        WHERE user_id=?
        ORDER BY created_at DESC
    """, (user_id,))

    rows = cur.fetchall()
    conn.close()

    return jsonify([
        {
            "text": r["text"],
            "image": r["image"],
            "time": r["created_at"]
        }
        for r in rows
    ])

@app.route("/create-story", methods=["POST"])
def create_story():
    user_id = session["user_id"]
    file = request.files.get("image")

    if not file:
        return "no file"

    filename = file.filename
    path = os.path.join("static/stories", filename)
    os.makedirs("static/stories", exist_ok=True)
    file.save(path)

    image_path = f"/static/stories/{filename}"

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO stories (user_id, image)
        VALUES (?, ?)
    """, (user_id, image_path))

    conn.commit()
    conn.close()

    return "ok"

@app.route("/story-viewers/<int:story_id>")
def story_viewers(story_id):
    viewers = get_story_viewers(story_id)
    return jsonify(viewers)

@app.route("/stories")
def get_stories():
    me = session["user_id"]
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    SELECT s.id, s.user_id, s.image, s.created_at, s.seen,
           u.username, u.avatar,
           CASE WHEN sv.viewer_id IS NOT NULL THEN 1 ELSE 0 END as viewed_by_me
    FROM stories s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = ?
    WHERE (
        s.user_id IN (
            SELECT DISTINCT 
                CASE 
                    WHEN sender_id = ? THEN receiver_id
                    ELSE sender_id
                END
            FROM messages
            WHERE sender_id = ? OR receiver_id = ?
        )
        OR s.user_id = ?
    )
    AND datetime(s.created_at) >= datetime('now', '-1 day')
    ORDER BY s.created_at DESC
    """, (me, me, me, me, me))

    rows = cur.fetchall()
    conn.close()

    return jsonify([
        {
            "id": r["id"],
            "user_id": r["user_id"],
            "image": r["image"],
            "seen": r["seen"],
            "username": r["username"],
            "avatar": r["avatar"],
            "viewed_by_me": r["viewed_by_me"]  
        }
        for r in rows
    ])


@app.route("/view-story", methods=["POST"])
def view_story():
    data = request.get_json()
    story_id = data.get("story_id")
    viewer_id = session["user_id"]

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM story_views
        WHERE story_id=? AND viewer_id=?
    """, (story_id, viewer_id))

    exists = cur.fetchone()

    if not exists:
        cur.execute("""
            INSERT INTO story_views (story_id, viewer_id)
            VALUES (?, ?)
        """, (story_id, viewer_id))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

@app.route("/react/<int:msg_id>", methods=["POST"])
def react(msg_id):
    reaction = request.json["reaction"]
    set_reaction(msg_id, session["user_id"], reaction)
    reactions = get_reactions(msg_id)
    my = get_my_reaction(msg_id, session["user_id"])
    return jsonify({"reactions": reactions, "my_reaction": my})

if __name__ == "__main__":
    app.run(debug=True)