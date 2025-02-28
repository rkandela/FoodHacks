const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve index.html with environment variables
app.get('/', (req, res) => {
    const html = require('fs')
        .readFileSync(path.join(__dirname, 'index.html'), 'utf8')
        .replace('<%= process.env.OPENAI_API_KEY %>', process.env.OPENAI_API_KEY);
    res.send(html);
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 