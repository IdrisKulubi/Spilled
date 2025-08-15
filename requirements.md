# Requirements.md

## 📱 Project Title: TeaKE – Is He Seeing Others?

### 🧭 Mission
To help Kenyan women discreetly check if the guy they’re dating is seeing other people — by letting others share info, comment anonymously, and talk privately.

---

## 🔑 Core Use Case

> “I met a guy — I want to check if other girls have posted about him before. If they have, I can read what they said, comment, or even message them privately.”

---

## ✨ MVP Features

### 1. 🔍 Search for a Guy
- Enter name / nickname / phone / social handle (optional fields)
- See existing profile (if posted)
- No images required (but optional)
- One “profile” per guy (others add to it)

### 2. 📓 Add a Story
- Add a post about the guy
- Anonymous or display nickname
- Choose tags: 🚩 red flag, ❓ unsure, ✅ good vibes
- Attach screenshots (optional)
- View existing comments under guy's post

### 3. 💬 Comment System
- Other users can comment anonymously on any guy's page
- Comments are public but anonymous
- Can flag harmful/offensive comments

### 4. 📨 Direct Messaging
- If a user wants to chat with another girl who posted, they can send a private request
- Messaging only unlocked if both users accept (like Tinder mutual match)
- All chats are end-to-end encrypted and auto-delete after 7 days

---

## 🔐 Security & Privacy

- No real names shown unless users choose to add
- Posts and messages are encrypted
- ID verification for users (optional, but adds a "verified girl" badge)
- Strict moderation for doxxing, abuse, threats
- Users can report posts or block others

---

## 🧰 Tech Stack

### Frontend (Expo App)
- React Native (with NativeWind for Tailwind styling)
- React Navigation
- Context + Supabase auth

### Backend (Supabase)
- PostgreSQL (Guy profiles, Stories, Comments, Users)
- Supabase Auth (Email/Phone OTP)
- Storage for optional images/screenshots
- Supabase Edge Functions for:
  - Adding posts
  - Fetching a guy's profile + comments
  - Secure messaging

---

## 📁 Folder Structure

/app
/screens
- SearchScreen.tsx
- GuyProfileScreen.tsx
- AddPostScreen.tsx
- ChatScreen.tsx
/components
- PostCard.tsx
- CommentCard.tsx
- MessageBubble.tsx
/actions
- addPost.ts
- fetchGuyProfile.ts
- sendMessage.ts
/utils
- auth.ts
- validatePhone.ts




---

## 🗂️ Database Tables

### `users`
- id
- phone / email
- verified (boolean)
- nickname
- created_at

### `guys`
- id
- name (optional)
- phone (optional)
- socials (optional)
- created_by_user_id

### `stories`
- id
- guy_id
- user_id
- text
- tags: red_flag / unsure / good_vibes
- image_url (optional)
- created_at

### `comments`
- id
- story_id
- user_id
- text
- created_at

### `messages`
- id
- sender_id
- receiver_id
- text
- created_at

---

## 🚧 Rules

- You can only message if the other person accepts
- You can report abusive messages or posts
- All identities are hidden unless users choose to show nickname
- Admin panel allows moderator review of flagged content

---

## 🎯 Success Criteria

- Users can find a guy’s profile by phone/nickname/social
- Stories are added easily
- Messaging is safe and encrypted
- Moderation tools prevent abuse



