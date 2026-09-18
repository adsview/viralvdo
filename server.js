const express = require('express');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const admin = require('firebase-admin');

// ফায়ারবেজ কানেকশন (Render Environment Variables থেকে ডেটা নেবে)
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.use(cors());
app.use(express.json());

// ইউজারকে মিনি অ্যাপের লিংক দেওয়া
bot.start((ctx) => {
    ctx.reply('ভিডিওটি আনলক করতে নিচের বাটনে ক্লিক করুন:', {
        reply_markup: {
            inline_keyboard: [[
                { text: 'Open Full Video 📁', web_app: { url: process.env.GITHUB_PAGES_URL } }
            ]]
        }
    });
});

// ফ্রন্টএন্ড থেকে একটি অ্যাড দেখার সিগন্যাল আসলে
app.post('/api/ad-watched', async (req, res) => {
    const userId = req.body.userId;
    if (!userId) return res.status(400).send("User ID missing");

    const userRef = db.collection('users').doc(userId.toString());
    
    try {
        const doc = await userRef.get();
        let currentAds = doc.exists ? doc.data().adsWatched : 0;
        currentAds += 1;

        if (currentAds >= 3) {
            // ৩টি অ্যাড দেখা হয়ে গেলে ভিডিও পাঠানো এবং কাউন্ট জিরো করা
            await bot.telegram.sendVideo(userId, process.env.VIDEO_FILE_ID, { caption: "✅ আপনার ভিডিও!" });
            await userRef.set({ adsWatched: 0 });
        } else {
            // শুধুমাত্র ডেটাবেস আপডেট করা
            await userRef.set({ adsWatched: currentAds });
        }
        res.json({ success: true, count: currentAds });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
bot.launch();
