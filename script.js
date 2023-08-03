document.addEventListener("DOMContentLoaded", function() {
    const profileForm = document.getElementById("profile-form");
    const usernameInput = document.getElementById("username");
    const profilePictureInput = document.getElementById("profile-picture");
    const profilePicturePreview = document.getElementById("profile-picture-preview");
    const bannerImageInput = document.getElementById("banner-image");
    const bannerImagePreview = document.getElementById("banner-image-preview");

    // Load profile data from storage (if available)
    const storedData = JSON.parse(localStorage.getItem("profileData")) || {};
    usernameInput.value = storedData.username || "";

    // Function to save profile data
    function saveProfileData() {
        const profileData = {
            username: usernameInput.value,
            profilePicture: profilePicturePreview.src,
            bannerImage: bannerImagePreview.src,
        };
        localStorage.setItem("profileData", JSON.stringify(profileData));
    }

    // Function to display images from stored data
    function displayImagesFromStorage() {
        profilePicturePreview.src = storedData.profilePicture || "";
        bannerImagePreview.src = storedData.bannerImage || "";
        profilePicturePreview.style.display = "block";
        bannerImagePreview.style.display = "block";
    }

    // Load and display images from storage on page load
    displayImagesFromStorage();

    profilePictureInput.addEventListener("change", function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = function() {
            profilePicturePreview.src = reader.result;
            profilePicturePreview.style.display = "block";
            saveProfileData(); // Save the profile data when the profile picture is loaded
        };

        if (file) {
            reader.readAsDataURL(file);
        }
    });

    bannerImageInput.addEventListener("change", function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = function() {
            bannerImagePreview.src = reader.result;
            bannerImagePreview.style.display = "block";
            saveProfileData(); // Save the profile data when the banner image is loaded
        };

        if (file) {
            reader.readAsDataURL(file);
        }
    });

    // Save the profile data when the form is submitted
    profileForm.addEventListener("submit", function(event) {
        event.preventDefault();
        saveProfileData();
        alert("Changements enregistrés !");
    });
});

let username = null;
let messages = [];
const broadcastChannel = new BroadcastChannel('chat_channel');

function setUsername() {
    const usernameInput = document.getElementById('username');
    const usernameValue = usernameInput.value.trim();

    if (usernameValue !== '') {
        // Enregistrez le pseudo choisi par l'utilisateur
        username = usernameValue;

        // Désactivez le champ de saisie du pseudo et le bouton pour le changer
        usernameInput.disabled = true;
        document.querySelector('.username-input button').disabled = true;

        // Activez le champ de saisie du message et le bouton d'envoi du message
        document.getElementById('message-input').disabled = false;
        document.querySelector('.chat-input button').disabled = false;
    }
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();

    if (message !== '') {
        if (username) {
            // Enregistrez le message avec le pseudo de l'utilisateur
            const fullMessage = `${username}: ${message}`;
            messages.push(fullMessage);

            // Sauvegarder les messages localement dans le localStorage
            localStorage.setItem('chat_messages', JSON.stringify(messages));

            // Synchroniser les messages entre les onglets
            broadcastMessage(fullMessage);

            // Afficher le message sur l'écran
            displayMessages();

            // Effacer le champ de saisie après l'envoi du message
            messageInput.value = '';
        }
    }
}

function deleteMessages() {
    // Supprimer tous les messages
    messages = [];
    // Effacer les messages du localStorage
    localStorage.removeItem('chat_messages');

    // Synchroniser la suppression des messages entre les onglets
    broadcastMessage('delete');

    // Mettre à jour l'affichage du chat
    displayMessages();
}

function displayMessages() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';

    // Charger les messages depuis le localStorage
    const storedMessages = localStorage.getItem('chat_messages');
    if (storedMessages) {
        messages = JSON.parse(storedMessages);
    }

    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;

        // Ajouter une barre de séparation après chaque message
        const separator = document.createElement('hr');
        chatMessages.appendChild(messageDiv);
        chatMessages.appendChild(separator);
    });
}

function broadcastMessage(message) {
    broadcastChannel.postMessage({ type: 'message', data: message });
}

// Afficher les messages au chargement de la page
displayMessages();

// Écouter les messages provenant des autres onglets
broadcastChannel.onmessage = (event) => {
    if (event.data.type === 'message') {
        messages.push(event.data.data);
        displayMessages();
    } else if (event.data.type === 'delete') {
        deleteMessages();
    }
};


