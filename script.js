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

