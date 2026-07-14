let currentUser = null
let myId = parseInt(document.getElementById("chat-container").dataset.myid);
let selectionMode = false
let selectedMessages = new Set()
let deletebtn = document.getElementById('delete')
deletebtn.style.display = 'none'

async function findUser() {
    let phone = document.getElementById("phone").value
    let res = await fetch("/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
    })
    let data = await res.json()
    if (data.id) {
        currentUser = data.id
        loadMessages()

        document.getElementById("chat-header").innerText = "Խոսում եք: " + phone

        let exists = Array.from(document.querySelectorAll('.chat-item'))
            .some(el => el.innerText === phone)
        if (!exists) {
            let list = document.getElementById("chat-list")
            let div = document.createElement("div")
            div.className = "chat-item active"
            div.innerText = phone
            div.onclick = () => {
                currentUser = data.id
                loadMessages()
                document.getElementById("chat-header").innerText = "Խոսում եք: " + phone
                document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
            }
            list.appendChild(div)
        }

    } else {
        document.getElementById("chat-header").innerText = "User not found"
    }
}
async function sendMessage() {
    let text = document.getElementById("message").value
    let file = document.getElementById("imageInput").files[0]
    let img = document.getElementById('file-label')



    let formData = new FormData()
    formData.append("text", text)
    formData.append("to", currentUser)

    if (file) {
        formData.append("image", file)
    }

   let res = await fetch("/send", {
    method: "POST",
    body: formData
})

if(res.status === 403){
    alert("Դուք չեք կարող գրել այս user-ին")
    return
}
    
    document.getElementById("message").value = ""
    document.getElementById("imageInput").value = ""
    img.innerText = 'Նկար'
    loadMessages()
}
async function loadChats() {

    let chatsRes = await fetch("/chats")
    let chats = await chatsRes.json()

    let unreadRes = await fetch("/unread")
    let unread = await unreadRes.json()

    let list = document.getElementById("chat-list")
    list.innerHTML = ""

    chats.forEach(u => {

        let countObj = unread.find(x => x.sender == u.id)
        let count = countObj ? countObj.count : 0

        let div = document.createElement("div")
        div.className = "chat-item"
        div.style.display = 'flex'
        div.style.alignItems = 'center'
        div.style.justifyContent = 'space-between'
        div.style.padding = '7px'

        let left = document.createElement("div")
        left.style.display = "flex"
        left.style.alignItems = "center"
        left.style.gap = "10px"

        let avatar = document.createElement("div")
        avatar.className = "avatar"
        avatar.style.width = "35px"
        avatar.style.height = "35px"
        avatar.style.borderRadius = "50%"
        avatar.style.display = "flex"
        avatar.style.alignItems = "center"
        avatar.style.justifyContent = "center"
        avatar.style.fontWeight = "bold"
        avatar.style.color = "white"

        if (u.avatar && u.avatar[0] === "#") {
            avatar.style.backgroundColor = u.avatar
            avatar.innerText = u.username[0].toUpperCase()
        }
        else if (u.avatar) {
            let img = document.createElement("img")
            img.src = u.avatar
            img.style.width = "100%"
            img.style.height = "100%"
            img.style.borderRadius = "50%"
            img.style.objectFit = "cover"
            avatar.appendChild(img)
        }
        else {
            avatar.style.backgroundColor = randomColor()
            avatar.innerText = u.username[0].toUpperCase()
        }

        let name = document.createElement("span")
        name.innerText = u.username

        left.appendChild(avatar)
        left.appendChild(name)

        div.appendChild(left)

        if (count > 0) {
            let badge = document.createElement("span")
            badge.className = "badge"
            badge.innerText = count
            div.appendChild(badge)
        }

        div.onclick = () => {
            currentUser = u.id
            loadMessages()

            checkIfBlocked(u.id)
            fetch("/mark-read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sender: u.id })
            })

            document.getElementById("chat-header").innerText = "Խոսում եք: " + u.username

            document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'))
            div.classList.add('active')
        }
        let deleteBtn = document.createElement("button")
        deleteBtn.innerText = "🗑"
        deleteBtn.className = "delete-chat-btn"
        deleteBtn.title = "Ջնջել չաթը"
        deleteBtn.onclick = (e) => {
            e.stopPropagation()
            if (confirm(`Ջնջե՞լ ${u.username}-ի հետ ամբողջ չաթը`)) {
                fetch(`/delete-chat/${u.id}`, { method: "DELETE" })
                    .then(() => {
                        if (currentUser === u.id) {
                            currentUser = null
                            document.getElementById("messages").innerHTML = ""
                            document.getElementById("chat-header").innerText = "Ընտրեք user՝ խոսելու համար"
                        }
                        loadChats()
                    })
            }
        }
        div.appendChild(deleteBtn)
        avatar.onclick = (e) => {
            e.stopPropagation()
            showProfile(u)
        }

        list.appendChild(div)
    })
}

loadChats()
setInterval(loadChats, 3000)



document.getElementById("imageInput").addEventListener("change", function () {
    if (this.files[0]) {
        document.querySelector(".file-label").innerText = "📷 " + this.files[0].name
    }
})
function logout() {
    localStorage.clear()
    window.location.href = "/logout"
}

const themeBtn = document.getElementById("theme-toggle");


function toggleTheme() {
    document.body.classList.toggle("light");

    if (document.body.classList.contains("light")) {
        themeBtn.innerText = " Theme ☀️";
        localStorage.setItem("Theme", "light");
    } else {
        themeBtn.innerText = "Theme 🌙";
        localStorage.setItem("Theme", "dark");
    }
}

window.onload = function () {
    if (localStorage.getItem("Theme") === "light") {
        document.body.classList.add("light")
        themeBtn.innerText = "Theme ☀️";
    }
}
let selectedImage = null
function openFiles() {
    document.getElementById("filesPage").style.display = "block"
    loadFiles()
}

function closeFiles() {
    document.getElementById("filesPage").style.display = "none"
}

async function loadFiles() {
    let res = await fetch("/files")
    let data = await res.json()

    let list = document.getElementById("filesList")
    list.innerHTML = ""

    data.forEach(f => {
        let div = document.createElement("div")
        div.className = "file-card"
        console.log(f.image);
        div.innerHTML = `
    <img src="${f.image}" onclick="openImageModal('${f.image}')">
    <div class="file-info">
        ${f.sender} ➜ ${f.receiver}
    </div>
`

        list.appendChild(div)

    })


}



function openChat(userId) {
    fetch("/messages/" + userId)
    fetch("/mark-read", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            sender: currentUser
        })
    })

}

function openImageModal(img) {
    selectedImage = img.slice(14, img.length)
    console.log(selectedImage);
    document.getElementById("modalImage").src = img.slice(0, 14) + '/' + img.slice(14, img.length)
    document.getElementById("imageModal").style.display = "flex"
}

function closeImageModal() {
    document.getElementById("imageModal").style.display = "none"
}

function downloadImage() {

    let img = document.getElementById("modalImage").src

    let a = document.createElement("a")
    a.href = img

    let filename = img.split("/").pop()

    a.download = filename

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}


function openImageModal(src) {
    document.getElementById("imageModal").style.display = "flex"
    document.getElementById("modalImage").src = src

    selectedImage = src
}
function sendToChat() {
    if (!currentUser || !selectedImage) {
        return
    }

    fetch("/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            receiver: currentUser,
            image: selectedImage
        })
    }).then(() => {
        closeImageModal()
        loadMessages()
    })
}
function formatTime(dateStr) {
    let d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatDateLabel(dateStr) {
    let d = new Date(dateStr)
    let today = new Date()
    let yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (d.toDateString() === today.toDateString())
        return "Today"

    if (d.toDateString() === yesterday.toDateString())
        return "Yesterday"

    return d.toLocaleDateString()
}
function showReactionPicker(msgId, anchor, msgData) {
    let old = document.querySelector(".reaction-picker-popup")
    if (old) { old.remove(); return }

    const reactions = ["❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "👏"]

    let picker = document.createElement("div")
    picker.className = "reaction-picker-popup"

    reactions.forEach(r => {
        let btn = document.createElement("span")
        btn.className = "reaction-option"
        btn.innerText = r

        if (msgData.my_reaction === r) {
            btn.classList.add("selected-reaction")
        }

        btn.onclick = (e) => {
            e.stopPropagation()
            const newReaction = msgData.my_reaction === r ? "" : r;
            fetch("/react/" + msgId, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reaction: newReaction })
            }).then(() => {
                picker.remove()
                loadMessages()
            })
        }

        picker.appendChild(btn)
    })

    document.body.appendChild(picker)

    let rect = anchor.getBoundingClientRect()
    let pickerW = reactions.length * 42
    let left = rect.left - pickerW / 2 + rect.width / 2
    left = Math.max(8, Math.min(left, window.innerWidth - pickerW - 8))

    picker.style.position = "fixed"
    picker.style.left = left + "px"
    picker.style.top = (rect.top - 60) + "px"

    setTimeout(() => {
        document.addEventListener("click", () => picker.remove(), { once: true })
    }, 10)
}


document.addEventListener("click", () => {
    let menu = document.getElementById("reactionMenu")
    if (menu) menu.remove()
})

let lastDate = null

function renderMessage(m) {

    let div = document.createElement("div")
    div.className = "msg " + (m.sender == myId ? "me" : "them")

    let pressTimer = null

    div.onmousedown = () => {
        pressTimer = setTimeout(() => {
            selectionMode = true
            selectedMessages.add(m.id)
            deletebtn.style.display = 'block'
            loadMessages()
        }, 500)
    }

    div.onmouseup = () => clearTimeout(pressTimer)
    div.onmouseleave = () => clearTimeout(pressTimer)

    div.onclick = () => {
        if (selectionMode) {
            if (selectedMessages.has(m.id)) {
                selectedMessages.delete(m.id)
            } else {
                selectedMessages.add(m.id)
            }

            if (selectedMessages.size === 0) {
                selectionMode = false
                deletebtn.style.display = 'none'
            }

            loadMessages()
        }
    }

    if (selectionMode) {
        let circle = document.createElement("div")
        circle.className = "select-circle"

        if (selectedMessages.has(m.id)) {
            circle.classList.add("selected")
        }

        div.appendChild(circle)
    }

    let content = document.createElement("div")
    content.className = "msg-content"

    let text = document.createElement("div")
    text.innerText = m.text || ""
    content.appendChild(text)

    if (m.image) {
        let img = document.createElement("img")
        img.src = m.image
        img.className = "chat-img"
        content.appendChild(img)
    }

    let time = document.createElement("div")
    time.className = "msg-time"

    if (m.sender == myId) {

        let status = ""

        if (m.is_read) {
            status = "✔✔"   // seen
        } else {
            status = "✔"    // sent
        }

        time.innerHTML = `
            ${formatTime(m.time)}
            <span class="msg-status ${m.is_read ? "seen" : ""}">
                ${status}
            </span>
        `
    }
    else {
        time.innerText = formatTime(m.time)
    }

    content.appendChild(time)



    let reactionWrapper = document.createElement("div")
    reactionWrapper.className = "reaction-wrapper"

    if (m.reactions && m.reactions.length > 0) {
        m.reactions.forEach(r => {
            let bubble = document.createElement("div")
            bubble.className = "reaction-bubble" + (m.my_reaction === r.reaction ? " mine" : "")
            bubble.innerText = r.reaction + (r.count > 1 ? ` ${r.count}` : "")
            bubble.onclick = (e) => {
                e.stopPropagation()
                const newR = m.my_reaction === r.reaction ? "" : r.reaction
                fetch("/react/" + m.id, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reaction: newR })
                }).then(() => loadMessages())
            }
            reactionWrapper.appendChild(bubble)
        })
    }

    let addReactionBtn = document.createElement("div")
    addReactionBtn.className = "add-reaction-btn"
    addReactionBtn.innerText = "❤️"
    addReactionBtn.onclick = (e) => {
        e.stopPropagation()
        showReactionPicker(m.id, addReactionBtn, m)
    }
    reactionWrapper.appendChild(addReactionBtn)
    content.appendChild(reactionWrapper)

    div.appendChild(content)

    if (selectionMode && selectedMessages.has(m.id)) {
        div.classList.add("selected-msg")
    }

    return div
}
async function loadMessages() {

    if (!currentUser) return

    let res = await fetch("/messages/" + currentUser)
    let data = await res.json()

    let box = document.getElementById("messages")
    box.innerHTML = ""

    lastDate = null

    data.forEach(m => {

        let dateLabel = formatDateLabel(m.time)

        if (dateLabel !== lastDate) {
            let dateDiv = document.createElement("div")
            dateDiv.className = "date-separator"
            dateDiv.innerText = dateLabel
            box.appendChild(dateDiv)

            lastDate = dateLabel
        }

        box.appendChild(renderMessage(m))
    })
    await fetch("/mark-read", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            sender: currentUser
        })
    })
}

function saveProfile() {

    let form = new FormData()

    form.append("username",
        document.getElementById("usernameInput").value)

    form.append("bio",
        document.getElementById("bioInput").value)

    let file = document.getElementById("avatarInput").files[0]
    if (file) {
        form.append("avatar", file)
    }

    fetch("/update-profile", {
        method: "POST",
        body: form
    }).then(() => {
        closeProfileSettings()
        openProfile()
    })
}
function openProfile() {

    fetch("/get-profile")
        .then(r => r.json())
        .then(user => {
            renderProfile(user)
        })
}

function closeProfile() {
    document.getElementById("profileModal").style.display = "none"
}

function closeProfilepanel() {
    document.getElementById("profile-panel").style.display = "none"
}

function randomColor() {
    let colors = [
        "#FF6B6B", "#6BCB77", "#4D96FF",
        "#FFC75F", "#845EC2", "#FF9671",
        "#00C9A7", "#C34A36"
    ]
    return colors[Math.floor(Math.random() * colors.length)]
}

function openProfileSettings() {

    document.getElementById("profileModal").style.display = "none"

    fetch("/get-profile")
        .then(r => r.json())
        .then(user => {
            document.getElementById("usernameInput").value = user.username || ""
            document.getElementById("bioInput").value = user.bio || ""
        })

    document.getElementById("profileSettings").style.display = "flex"
}

function closeProfileSettings() {
    document.getElementById("profileSettings").style.display = "none"
}
function renderProfile(user) {
    let postbtn = document.getElementById('postBtn')
    let btn = document.getElementById("profileSettingsBtn")
    btn.style.display = "none"
    document.getElementById("profileUsername").innerText = user.username
    document.getElementById("profilePhone").innerText = user.phone || ""
    document.getElementById("profileBio").innerText = user.bio || ""

    let avatar = document.getElementById("profileAvatar")

    avatar.innerHTML = ""

    if (user.avatar && user.avatar[0] !== '#') {
        avatar.innerHTML = `<img src="${user.avatar}">`
    } else {
        avatar.innerHTML = `
            <div class="avatar-placeholder"
                 style="background:${user.avatar || randomColor()}">
                 ${user.username[0].toUpperCase()}
            </div>`
    }



    if (user.id == myId) {
        btn.style.display = "block";
        postbtn.style.display = 'block';
    } else {
        btn.style.display = "none";
        postbtn.style.display = 'none';
    }

    document.getElementById("profileModal").style.display = "flex";
    loadUserPosts(user.id);
    let blockBtn = document.getElementById("blockBtn")

if(user.id == myId){
    blockBtn.style.display = "none"
} else {

    blockBtn.style.display = "block"

    fetch("/is-blocked/" + user.id)
    .then(r => r.json())
    .then(data => {

        if(data.blocked){
            blockBtn.innerText = "Unblock"
            blockBtn.className = "block-btn blocked"
        } else {
            blockBtn.innerText = "Block"
            blockBtn.className = "block-btn not-blocked"
        }

        blockBtn.onclick = () => {

            let url = data.blocked ? "/unblock/" : "/block/"

            fetch(url + user.id, { method: "POST" })
            .then(() => {

                data.blocked = !data.blocked

                if(data.blocked){
                    blockBtn.innerText = "Unblock"
                    blockBtn.className = "block-btn blocked"
                } else {
                    blockBtn.innerText = "Block"
                    blockBtn.className = "block-btn not-blocked"
                }

                loadChats()
            })
        }

    })
}

}

function showProfile(user) {
    let avatarDiv = document.getElementById("profile-avatar")
    avatarDiv.innerHTML = ""
    avatarDiv.style.width = "70px"
    avatarDiv.style.height = "70px"
    avatarDiv.style.borderRadius = "50%"
    avatarDiv.style.display = "flex"
    avatarDiv.style.alignItems = "center"
    avatarDiv.style.justifyContent = "center"
    avatarDiv.style.fontWeight = "bold"
    avatarDiv.style.fontSize = "20px"
    avatarDiv.style.color = "white"

    if (user.avatar && user.avatar[0] === "#") {
        avatarDiv.style.backgroundColor = user.avatar
        let initials = user.username.split(" ").map(n => n[0].toUpperCase()).join("").slice(0, 2)
        avatarDiv.innerText = initials
    }
    else if (user.avatar) {
        let img = document.createElement("img")
        img.src = user.avatar
        img.style.width = "100%"
        img.style.height = "100%"
        img.style.borderRadius = "50%"
        img.style.objectFit = "cover"
        avatarDiv.appendChild(img)
    }
    else {
        avatarDiv.style.backgroundColor = randomColor()
        let initials = user.username.split(" ").map(n => n[0].toUpperCase()).join("").slice(0, 2)
        avatarDiv.innerText = initials
    }

    document.getElementById("profile-username").innerText = user.username
    document.getElementById("profile-phone").innerText = user.phone
    document.getElementById("profile-bio").innerText = user.bio
}

function openContacts() {

    document.getElementById("contactsModal").style.display = "flex"

    fetch("/contacts")
        .then(r => r.json())
        .then(data => {

            let list = document.getElementById("contactsList")
            list.innerHTML = ""

            data.forEach(u => {

                let div = document.createElement("div")
                div.className = "contact-item"


                let avatar = u.avatar[0] !== '#' ? `<img src="${u.avatar}">`
                    : `<div class="contact-avatar-placeholder"
                        style="background:${u.avatar}">
                        ${u.username[0].toUpperCase()}
                   </div>`

                div.innerHTML = `
                <div class="contact-avatar">${avatar}</div>
                <div class="contact-name">${u.username}</div>
            `

                div.onclick = () => {
                    openContactProfile(u.id)
                }

                list.appendChild(div)
            })
        })
}

function closeContacts() {
    document.getElementById("contactsModal").style.display = "none"
}

function openContactProfile(userId) {
    fetch("/user/" + userId)
        .then(r => r.json())
        .then(user => {
            renderProfile(user)
        })
}
function deleteSelected() {

    let ids = Array.from(selectedMessages)

    if (ids.length === 0) {
        alert("Select messages first")
        return
    }

    fetch("/delete-messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids })
    }).then(() => {
        selectedMessages.clear()
        selectionMode = false
        loadMessages()
    })
}
async function createPost() {

    let text = document.getElementById("postText").value
    let file = document.getElementById("postImage").files[0]

    if (!text && !file) {
        alert("Գոնե text կամ image գրիր")
        return
    }

    let form = new FormData()
    form.append("text", text)

    if (file) {
        form.append("image", file)
    }

    await fetch("/create-post", {
        method: "POST",
        body: form
    })

    document.getElementById("postText").value = ""
    document.getElementById("postImage").value = ""

    closeCreatePost()

    loadUserPosts(myId)
}

function openPostModal(p) {

    let modal = document.getElementById("postModal")

    if (p.image) {
        document.getElementById("postModalImg").src = p.image
        document.getElementById("postModalImg").style.display = "block"
    } else {
        document.getElementById("postModalImg").style.display = "none"
    }

    document.getElementById("postModalText").innerText = p.text || ""

    modal.style.display = "flex"
}

function closePostModal() {
    document.getElementById("postModal").style.display = "none"
}

async function loadUserPosts(userId) {

    let res = await fetch("/user-posts/" + userId)
    let data = await res.json()

    let container = document.getElementById("postsContainer")
    container.innerHTML = ""

    data.forEach(p => {

        let div = document.createElement("div")
        div.className = "post"

        if (p.image) {
            div.innerHTML = `<img src="${p.image}">`
        } else {
            div.innerHTML = `<div class="post-text-only">${p.text || ""}</div>`
        }

        div.onclick = () => {
            openPostModal(p)
        }

        container.appendChild(div)
    })
}

function openCreatePost() {
    document.getElementById("createPostModal").style.display = "flex"
}

function closeCreatePost() {
    document.getElementById("createPostModal").style.display = "none"
}

document.getElementById("postImage").addEventListener("change", function () {
    if (this.files[0]) {
        console.log(URL.createObjectURL(this.files[0]))
    }
})

function closePostModal(e) {
    if (e.target.id === "postModal") {
        document.getElementById("postModal").style.display = "none"
    }
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        document.getElementById("postModal").style.display = "none"
    }
})

async function loadStories() {
    const res = await fetch("/stories");
    const stories = await res.json();

    const bar = document.getElementById("storiesBar");
    bar.innerHTML = "";

    const grouped = {};
    stories.forEach(s => {
        if (!grouped[s.user_id]) grouped[s.user_id] = [];
        grouped[s.user_id].push(s);
    });

    const sortedUserIds = Object.keys(grouped).sort((a, b) => {
        if (parseInt(a) === myId) return -1;
        if (parseInt(b) === myId) return 1;
        return 0;
    });

    for (const userId of sortedUserIds) {
        const userStories = grouped[userId];
        const first = userStories[0];
        const allViewed = userStories.every(s => s.viewed_by_me === 1);

        const div = document.createElement("div");
        div.className = "story-item";

        const ring = document.createElement("div");
        ring.className = `story-ring ${allViewed ? 'seen' : 'unseen'}`;
        ring.onclick = () => openStory(parseInt(userId), userStories);

        const inner = document.createElement("div");
        inner.className = "story-avatar-inner";

        if (first.avatar && first.avatar[0] === '#') {
            inner.style.background = first.avatar;
            inner.innerText = first.username[0].toUpperCase();
        } else if (first.avatar) {
            inner.innerHTML = `<img src="${first.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
        } else {
            inner.style.background = randomColor();
            inner.innerText = first.username[0].toUpperCase();
        }

        ring.appendChild(inner);

        const label = document.createElement("span");
        label.innerText = first.username;

        div.appendChild(ring);
        div.appendChild(label);
        bar.appendChild(div);
    }
}

let currentStories = []
let storyIndex = 0

function openStoryViewer(stories) {
    currentStories = stories
    storyIndex = 0

    document.getElementById("storyModal").style.display = "flex"
    showStory()
}
function showStory() {
    let s = currentStories[storyIndex]

    document.getElementById("storyImg").src = s.image

    fetch("/view-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: s.id })
    })

    setTimeout(() => {
        storyIndex++
        if (storyIndex < currentStories.length) {
            showStory()
        } else {
            closeStory()
            loadStories()
        }
    }, 3000)
}

function closeStory() {
    document.getElementById("storyModal").style.display = "none"
}

function openStoryUpload() {
    document.getElementById("storyUploadModal").style.display = "flex"
}

document.getElementById("storyUploadModal").onclick = () => {
    document.getElementById("storyUploadModal").style.display = "none"
}
async function createStory() {

    let file = document.getElementById("storyImage").files[0]

    if (!file) {
        alert("Ընտրիր նկար")
        return
    }

    let form = new FormData()
    form.append("image", file)

    await fetch("/create-story", {
        method: "POST",
        body: form
    })

    document.getElementById("storyUploadModal").style.display = "none"
    document.getElementById("storyImage").value = ""

    loadStories()
}
function showStory() {
    let s = currentStories[storyIndex]

    document.getElementById("storyImg").src = s.image

    fetch("/view-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: s.id })
    })

    setTimeout(() => {
        storyIndex++
        if (storyIndex < currentStories.length) {
            showStory()
        } else {
            closeStory()
            loadStories()
        }
    }, 3000)
}
window.onload = function () {

    if (localStorage.getItem("Theme") === "light") {
        document.body.classList.add("light")
    }

    loadStories()
}
async function openStory(userId, stories) {
    currentStories = stories
    storyIndex = 0

    const modal = document.getElementById("storyModal")

    if (parseInt(userId) === myId) {
        let viewersPanel = document.getElementById("storyViewersPanel")
        if (!viewersPanel) {
            viewersPanel = document.createElement("div")
            viewersPanel.id = "storyViewersPanel"
            viewersPanel.style.cssText = `
                position:absolute; bottom:20px; left:50%;
                transform:translateX(-50%);
                background:rgba(0,0,0,0.6);
                border-radius:12px; padding:10px 16px;
                color:white; font-size:13px; max-height:150px;
                overflow-y:auto; min-width:180px;
            `
            modal.appendChild(viewersPanel)
        }

        const res = await fetch(`/story-viewers/${stories[0].id}`)
        const viewers = await res.json()

        if (viewers.length === 0) {
            viewersPanel.innerHTML = `<div style="text-align:center;opacity:0.7">👁 Դեռ ոչ ոք չի տեսել</div>`
        } else {
            viewersPanel.innerHTML = `
                <div style="margin-bottom:6px;opacity:0.8">👁 Տեսել են (${viewers.length})</div>
                ${viewers.map(v => `
                    <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
                        <div style="width:24px;height:24px;border-radius:50%;background:${v.avatar};
                                    display:flex;align-items:center;justify-content:center;
                                    font-weight:bold;font-size:11px;color:white">
                            ${v.username[0].toUpperCase()}
                        </div>
                        <span>${v.username}</span>
                    </div>
                `).join("")}
            `
        }
        viewersPanel.style.display = "block"
    } else {
        const viewersPanel = document.getElementById("storyViewersPanel")
        if (viewersPanel) viewersPanel.style.display = "none"
    }

    modal.style.display = "flex"
    showStory()
}

let blockBtn = document.createElement("button")

blockBtn.innerText = " Block"

blockBtn.onclick = () => {
    fetch("/block/" + user.id, { method: "POST" })
    .then(()=> {
        alert("Blocked")
        closeProfile()
        loadChats()
    })
if(user.id != myId){
    document.querySelector(".profile-card").appendChild(blockBtn)
}


}


async function checkIfBlocked(userId){
    let res = await fetch("/is-blocked/" + userId)
    let data = await res.json()

    let input = document.getElementById("message")

    if(data.blocked){
        input.disabled = true
        input.placeholder = "Դուք չեք կարող գրել"
    } else {
        input.disabled = false
        input.placeholder = "Գրեք հաղորդագրություն..."
    }
}
