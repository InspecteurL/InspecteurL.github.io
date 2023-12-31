// Fonction pour récupérer tous les commentaires du serveur
async function fetchComments() {
    const response = await fetch('/comments');
    const data = await response.json();
    return data;
}

// Fonction pour ajouter un commentaire sur le serveur
async function addComment() {
    const commentText = document.getElementById('comment-text').value;
    if (!commentText) {
        alert('Veuillez écrire un commentaire avant de soumettre.');
        return;
    }

    const comment = {
        text: commentText,
        timestamp: new Date().toLocaleString()
    };

    const response = await fetch('/add-comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(comment)
    });

    const data = await response.json();
    if (data.message) {
        showNotification(data.message);
        fetchAndDisplayComments(); // Rafraîchir la liste des commentaires après avoir ajouté un nouveau commentaire
    }
}

// Fonction pour récupérer et afficher tous les commentaires du serveur
async function fetchAndDisplayComments() {
    const comments = await fetchComments();
    const commentList = document.getElementById('comment-list');
    commentList.innerHTML = ''; // Effacer les commentaires existants avant d'ajouter les nouveaux

    comments.forEach(comment => {
        displayComment(comment);
    });
}

// Appeler la fonction pour afficher les commentaires lors du chargement de la page
window.onload = function() {
    fetchAndDisplayComments();
}
