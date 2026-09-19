// ==========================================
// Bakir Hisab PWA - Final & Bulletproof app.js
// ==========================================

// ১. URL থেকে ডাইনামিক site_id রিড করার ফাংশন
function getSiteIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  let siteId = params.get('site_id');
  
  if (!siteId) {
    siteId = localStorage.getItem('current_site_id') || 'rahim_store';
  } else {
    localStorage.setItem('current_site_id', siteId);
  }
  return siteId;
}

const CURRENT_SITE_ID = getSiteIdFromUrl();
console.log("Current Site ID:", CURRENT_SITE_ID);

// ২. এপিআই লিংক (আপনার গুগল শিট ব্যাকএন্ড)
const ADMIN_API_URL = "https://script.google.com/macros/s/AKfycbyaJI5U91iG4ZzYRhpfRrnVAsBePWazIoR9Lw6-ayraPcoXsaQLGT1uEJfPgMcWTPR6/exec";

// ৩. সাবস্ক্রিপশন চেক ফাংশন (কোনো ঝামেলা ছাড়াই সরাসরি আনলক করার লজিক)
function checkSubscription() {
  const apiEndpoint = `${ADMIN_API_URL}?site_id=${CURRENT_SITE_ID}`;
  
  fetch(apiEndpoint)
    .then(response => response.json())
    .then(data => {
      console.log("API Response:", data);

      // স্ট্যাটাস ছোট বা বড় হাতের যাই হোক না কেন, চেক করবে
      const statusStr = data.status ? String(data.status).toLowerCase().trim() : "";
      const isActive = (statusStr === "active" || statusStr === "true" || statusStr === "1");

      // যদি ব্যাকএন্ড থেকে স্ট্যাটাস active আসে, তবে তারিখ নিয়ে আর কোনো প্যাঁচ লাগাবে না—সরাসরি আনলক করে দেবে!
      if (isActive) {
        console.log("Subscription is Active. Unlocking App.");
        unlockApp();
      } else {
        console.log("Subscription Paused or Expired.");
        lockApp();
      }
    })
    .catch(error => {
      console.error("API Connection Error:", error);
      // কোনো নেটওয়ার্ক সমস্যা বা ফেইল করলে অ্যাপ যাতে আটকে না যায়, তাই সেফটির জন্য আনলক করে দেবে
      unlockApp();
    });
}

// ৪. অ্যাপ আনলক করার ফাংশন
function unlockApp() {
  const pauseScreen = document.getElementById('pause-screen');
  if (pauseScreen) {
    pauseScreen.style.display = 'none';
  }
  const lockContainer = document.querySelector('.lock-container, #lock-screen');
  if (lockContainer) {
    lockContainer.style.display = 'none';
  }
}

// ৫. অ্যাপ লক বা পজ করার ফাংশন
function lockApp() {
  const pauseScreen = document.getElementById('pause-screen');
  if (pauseScreen) {
    pauseScreen.style.display = 'block';
  }
}

// পেজ লোড হওয়ার সাথে সাথে চেক রান হবে
window.addEventListener('DOMContentLoaded', () => {
  checkSubscription();
});
