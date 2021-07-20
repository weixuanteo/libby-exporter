# libby-exporter
Export Libby notes and highlights to Notion

## About
This is a firebase project where the code is executed via Cloud Functions. This project is currently under development.

## Installation
Install Firebase Tools
```bash
npm install -g firebase-tools
```

Go to `functions` and install dependencies
```bash
cd functions
npm install
```

## Running locally
```bash
firebase emulators:start
```

The endpoint will be accessible at <http://localhost:5001/libby-notion/asia-southeast2/exportToNotion>.
In Postman, make a `POST` request that takes in two body parameters in JSON as shown below.
```json
{
    "notion_key": "secret_*************",
    "libby_url": "https://share.libbyapp.com/data/010d219f-b02a-46a5-969a-9a811cfe2136/libbyjourney-4510607-range.json"
}
```
