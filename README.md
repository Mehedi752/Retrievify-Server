# 🧳 Lost & Found System – Backend

This is the backend server for the **Lost & Found System**, a secure and scalable platform built with **Node.js**, **Express.js**, and **MongoDB**. It provides RESTful API endpoints, real-time communication via WebSockets, secure authentication, and integrations for payments and cloud storage.

---

## 📦 Features

- 🔐 **User Authentication** with Firebase
- 🧾 **Lost & Found Items API** (Create, Read, Search, Verify)
- 💬 **Real-Time Chat** using WebSockets
- 🧠 **AI-based Moderation** with OpenAI *(Optional)*
- 🏅 **Trust Score & Reward System**
- 📄 **Ownership Verification** via receipts or image uploads
- 📢 **Notification System** via WebSocket events
- 💳 **Donation & Payment System** using Stripe / PayPal / SSLCOMMERZ
- 🛠 **Admin Controls** for fraud detection, dispute resolution, and moderation

---

## 🛠️ Tech Stack

- **Node.js** – JavaScript runtime
- **Express.js** – Web server & routing
- **MongoDB** – NoSQL database (MongoDB Atlas)
- **Firebase Admin SDK** – Authentication & token verification
- **WebSocket (Socket.io)** – Real-time chat functionality
- **Stripe / PayPal / SSLCOMMERZ** – Payment integrations
- **Cloudinary / AWS S3** – Secure image storage
- **OpenAI API** – *(Optional)* Moderation & AI assistance

---

## ⚙️ API Overview

> **Base URL:** `/api`

| Method | Endpoint               | Description                             |
|--------|------------------------|-----------------------------------------|
| POST   | `/items`               | Report a new lost item                  |
| GET    | `/items`               | Search/filter items                     |
| GET    | `/items/:id`           | Get item details                        |
| POST   | `/verify`              | Submit verification proof               |
| GET    | `/chat/:userId`        | Retrieve chat messages                  |
| POST   | `/chat/send`           | Send a new message                      |
| POST   | `/payments/donate`     | Make a donation or initiate payment     |
| GET    | `/admin/reports`       | *(Admin)* View reported items           |
| PATCH  | `/admin/item/:id`      | *(Admin)* Update or resolve an item     |

> 🔐 Most routes are protected using Firebase token-based authentication.

---


