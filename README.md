# Daily Expense Tracker — MongoDB

This version has **no registration and no login**.

The browser sends expenses to a small Node.js/Express backend, and the backend saves them in MongoDB Atlas.

## Data model

Database: `personal_expenses`

Collection: `expenses`

Each expense contains:
- `date`
- `amount`
- `category`
- `shift` (only for Travel)
- `note`
- `createdAt`

## Setup

1. Install Node.js.
2. Open this project folder in Terminal/PowerShell.
3. Run:

```bash
npm install
```

4. Create `.env` from `.env.example`.
5. Put your MongoDB Atlas connection string in `MONGODB_URI`.
6. Run:

```bash
npm start
```

7. Open:

`http://localhost:3000`

## MongoDB Atlas

The connection string must stay on the **server** in `.env`. Do not put it in `public/index.html`.

Use a database user with only the permissions needed for this application's database, rather than an Atlas administrator.

For a hosted version, add the server's public IP to the Atlas IP access list or use private networking.

## Important

The screenshots you supplied show a MongoDB database username and password. Treat those credentials as exposed and **rotate the database user's password before using this project**.
