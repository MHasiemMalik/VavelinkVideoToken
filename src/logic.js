// logic.js - With Dynamic Grid Layout

import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "ce748e0828444323855aef66b05162d9";
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

let localAudioTrack = null;
let localVideoTrack = null;

const urlParams = new URLSearchParams(window.location.search);
const channelName = urlParams.get('room');

if (!channelName) {
    window.location = 'lobby.html';
}

// --- NEW --- Function to dynamically change the video layout
function updateVideoLayout() {
    const container = document.getElementById('video-streams');
    const participantCount = client.remoteUsers.length + 1; // +1 for the local user

    if (participantCount > 2) {
        container.classList.add('grid-view');
    } else {
        container.classList.remove('grid-view');
    }
}

async function fetchToken(channel) {
    // Get the server URL from the environment variable (set in Vercel/Netlify for deployment)
    // Provide localhost as a fallback for local development (`npm run dev`)
    const serverUrl = import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:8080';

    // Log the URL being used for easier debugging
    console.log(`Fetching token from: ${serverUrl}/get-token?channelName=${channel}`);

    try {
        // --- FIX --- Use the correct endpoint for the video app
        const response = await fetch(`${serverUrl}/get-token?channelName=${channel}`); 
        if (!response.ok) throw new Error(`Failed to fetch token. Status: ${response.status}`);
        const data = await response.json();
        if (!data.token) throw new Error(`Token received from server was empty or invalid`);
        return data.token;
    } catch (error) {
        console.error("Token fetch error:", error);
        alert(`Failed to get token from server. Check console for details.`);
        return null;
    }
}

async function joinChannel() {
    const token = await fetchToken(channelName);
    if (!token) return;

    await client.join(APP_ID, channelName, token, null);

    [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    
    const localPlayerContainer = document.getElementById("local-player");
    localPlayerContainer.innerHTML = '';
    localVideoTrack.play(localPlayerContainer);

    await client.publish([localAudioTrack, localVideoTrack]);
    console.log("Publish success!");

    updateVideoLayout(); // Update layout after joining
}

async function handleUserPublished(user, mediaType) {
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        const remotePlayerContainer = document.getElementById("remote-players");
        const userPlayer = document.createElement('div');
        userPlayer.id = `player-${user.uid}`;
        remotePlayerContainer.append(userPlayer);
        user.videoTrack.play(userPlayer);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }

    updateVideoLayout(); // Update layout when a new user joins
}

function handleUserUnpublished(user) {
    const playerContainer = document.getElementById(`player-${user.uid}`);
    if (playerContainer) {
        playerContainer.remove();
    }
    updateVideoLayout(); // Update layout when a user leaves
}

async function leaveChannel() {
    localAudioTrack?.close();
    localVideoTrack?.close();
    
    document.getElementById("local-player").innerHTML = '';
    document.getElementById("remote-players").innerHTML = '';

    await client.leave();
    window.location = 'lobby.html';
}

async function toggleCamera() {
    if (!localVideoTrack) return;
    if (localVideoTrack.enabled) {
        await localVideoTrack.setEnabled(false);
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)';
    } else {
        await localVideoTrack.setEnabled(true);
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)';
    }
}

async function toggleMic() {
    if (!localAudioTrack) return;
    if (localAudioTrack.enabled) {
        await localAudioTrack.setEnabled(false);
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)';
    } else {
        await localAudioTrack.setEnabled(true);
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)';
    }
}

// Event Listeners and Initialization
client.on("user-published", handleUserPublished);
client.on("user-unpublished", handleUserUnpublished);

document.getElementById("leave").addEventListener("click", leaveChannel);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('mic-btn').addEventListener('click', toggleMic);

window.addEventListener('load', joinChannel);