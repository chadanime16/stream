// Profile Images for User Selection
const PROFILE_IMAGES = [
    "https://i.ibb.co/Hf9zGtKc/kazehaya.png",
    "https://i.ibb.co/3y401jk3/sawako2.png",
    "https://i.ibb.co/N2FqbtZ5/sawako1.png",
    "https://i.ibb.co/B53M7p5D/mahiru.png",
    "https://i.ibb.co/xq7Fghbt/babu1.jpg",
    "https://i.ibb.co/35xK579S/berserk1.png",
    "https://i.ibb.co/FqdsYZqr/kirito1.png",
    "https://i.ibb.co/TDt0zXmY/rin2.png",
    "https://i.ibb.co/fVtJMX8j/rin1.png",
    "https://i.ibb.co/jkrpM6kk/anya2.jpg",
    "https://i.ibb.co/tp6pJt0S/anaya1.jpg",
    "https://i.ibb.co/p6qYzvbR/rinn.png",
    "https://i.ibb.co/N6XDHdTQ/yato.png",
    "https://i.ibb.co/YBP6Ccrs/love2.jpg",
    "https://i.ibb.co/QFw4T3Bb/lovechunibyo.jpg",
    "https://i.ibb.co/RTJWSB0c/kaze2.png",
    "https://i.ibb.co/hJDF4hhK/hanko-pfp.png"
];

// Get default profile image
function getDefaultProfileImage() {
    return PROFILE_IMAGES[0];
}

// Get random profile image
function getRandomProfileImage() {
    const randomIndex = Math.floor(Math.random() * PROFILE_IMAGES.length);
    return PROFILE_IMAGES[randomIndex];
}
