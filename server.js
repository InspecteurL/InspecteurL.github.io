const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

let comments = [];

// Endpoint pour obtenir tous les commentaires
app.get('/comments', (req, res) => {
    res.json(comments);
});

// Endpoint pour ajouter un commentaire
app.post('/add-comment', (req, res) => {
    const newComment = req.body;
    comments.push(newComment);
    res.json({ message: 'Commentaire ajouté avec succès!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
