# Distributed Online Marketplace System

Full-stack marketplace platform with a distributed MongoDB setup, real-time chat, and an AI assistant for user-facing help. Built with Node.js/Express on the backend and Angular on the frontend.

## Highlights
- Multi-database MongoDB design (user, product, payment, inventory, chat, report)
- Marketplace flows: products, cart, orders, transactions, wallet
- Real-time chat with Socket.IO
- AI assistant powered by Hugging Face chat completions
- Angular 18 UI with Bootstrap styling

## Architecture Overview
- Backend modules live under backend/src/modules (user, product, cart, order, transaction, wallet, report, chat, ai).
- Distributed DB connections are configured in backend/db/config/db.js.
- Static images are served from backend/src/utilities/images at /images.

## Diagrams
![Distributed Database Model](backend/diagrams/Distributed%20Database%20Model.jpeg)
![Layered Architecture](backend/diagrams/layered%20Architecture.jpeg)
![Use Case Diagram](backend/diagrams/useCase%20Diagram.jpeg)
![Application-Level Protocol](backend/diagrams/Application-Level%20Protocol.jpeg)

## Tech Stack
- Backend: Node.js, Express 5, Mongoose, Socket.IO, JWT, Nodemailer
- Frontend: Angular 18, Bootstrap 5, RxJS
- Database: MongoDB (multiple logical databases)

## Getting Started

### Prerequisites
- Node.js and npm installed
- MongoDB Atlas account or local MongoDB instance

### Backend Setup
1. Install dependencies:
	```bash
	cd backend
	npm install
	```
2. (Optional) Configure AI assistant environment variables:
	```bash
	# Windows PowerShell
	$env:HF_API_KEY="your_hf_api_key"
	$env:HF_MODEL_ID="meta-llama/Meta-Llama-3-8B-Instruct:fastest"
	```
3. Update the MongoDB connection string in backend/db/config/db.js for your environment.
4. Start the API server:
	```bash
	npm run dev
	```
	The backend listens on http://localhost:3000 (health check: /health).

### Frontend Setup
1. Install dependencies:
	```bash
	cd frontend
	npm install
	```
2. Run the Angular app:
	```bash
	npm start
	```
	The UI runs on http://localhost:4200.

## Useful Scripts
- Root smoke test: npm run smoke
- Backend: npm run dev, npm run start
- Frontend: npm start, npm run build, npm test

## Notes
- Get a Hugging Face key and Set HF_API_KEY in your environment.
