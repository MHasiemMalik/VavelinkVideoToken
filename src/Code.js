import AgoraRTC from "agora-rtc-sdk-ng";

// RTC client instance
let client = null;

// Declare variables for the local tracks
let localAudioTrack = null; 
let localVideoTrack = null; 

// Connection parameters - Token is now fetched dynamically
let appId = "d89a4e5aab5e4a80a36f57151d2bef62";
let channel = "malik";
let token = null; // Token will be fetched from your server
let uid = 0; // User ID

// --- NEW --- Function to fetch a token from your server
async function fetchToken(channelName) {
  try {
    const serverUrl = import.meta.env.VITE_TOKEN_SERVER_URL;
    const response = await fetch(`${serverUrl}/get-token?channelName=${channelName}`);if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to fetch token:', error);
    return null;
  }
}

// Initialize the AgoraRTC client
function initializeClient() {
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    setupEventListeners();
}

// Handle client events
function setupEventListeners() {
    client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        console.log("subscribe success");

        if (mediaType === "video") {
            displayRemoteVideo(user);
        }

        if (mediaType === "audio") {
            user.audioTrack.play();
        }
    });

    client.on("user-unpublished", (user) => {
        const remotePlayerContainer = document.getElementById(user.uid);
        remotePlayerContainer && remotePlayerContainer.remove();
    });
}

// --- UPDATED --- Join a channel and publish local media
async function joinChannel() {
    console.log("Fetching token from server...");
    // Fetch a new token every time join is called
    token = await fetchToken(channel);

    if (!token) {
        console.error("Failed to get token. Unable to join channel.");
        return;
    }

    console.log("Token fetched successfully. Joining channel...");
    await client.join(appId, channel, token, uid);
    await createLocalTracks();
    await publishLocalTracks();
    displayLocalVideo();
    console.log("Publish success!");
}

// Create local audio and video tracks
async function createLocalTracks() {
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localVideoTrack = await AgoraRTC.createCameraVideoTrack();
}

// Publish local audio and video tracks
async function publishLocalTracks() {
    await client.publish([localAudioTrack, localVideoTrack]);
}

// Display local video
function displayLocalVideo() {
    const localPlayerContainer = document.createElement("div");
    localPlayerContainer.id = uid;
    localPlayerContainer.textContent = `Local user ${uid}`;
    localPlayerContainer.style.width = "640px";
    localPlayerContainer.style.height = "480px";
    document.body.append(localPlayerContainer);
    localVideoTrack.play(localPlayerContainer);
}

// Display remote video
function displayRemoteVideo(user) {
    const remoteVideoTrack = user.videoTrack;
    const remotePlayerContainer = document.createElement("div");
    remotePlayerContainer.id = user.uid.toString();
    remotePlayerContainer.textContent = `Remote user ${user.uid}`;
    remotePlayerContainer.style.width = "640px";
    remotePlayerContainer.style.height = "480px";
    document.body.append(remotePlayerContainer);
    remoteVideoTrack.play(remotePlayerContainer);
}

// Leave the channel and clean up
async function leaveChannel() {
    // Close local tracks
    localAudioTrack && localAudioTrack.close();
    localVideoTrack && localVideoTrack.close();

    // Remove local video container
    const localPlayerContainer = document.getElementById(uid);
    localPlayerContainer && localPlayerContainer.remove();

    // Remove all remote video containers
    client.remoteUsers.forEach((user) => {
        const playerContainer = document.getElementById(user.uid);
        playerContainer && playerContainer.remove();
    });

    // Leave the channel
    await client.leave();
    console.log("You have left the channel.");
}

// Set up button click handlers
function setupButtonHandlers() {
    document.getElementById("join").onclick = joinChannel;
    document.getElementById("leave").onclick = leaveChannel;
}

// Start the basic call
function startBasicCall() {
    initializeClient();
    window.onload = setupButtonHandlers;
}

startBasicCall();