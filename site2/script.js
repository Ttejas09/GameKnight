const muteButton = document.getElementsByClassName('mute')[0]; // Use [0] to get the first element
const video = document.getElementById('hero');

muteButton.addEventListener('click', function() {
    if (video.muted) {
        video.muted = false;
        muteButton.innerHTML = '<img src="loudspeaker_4407694.png" alt="Unmute" />';
    } else {
        video.muted = true;
        muteButton.innerHTML = '<img src="mute_6896807.png" alt="Mute" width="50px" />';
    }
});