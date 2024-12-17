const router = require('express').Router();

// const connectDB = require('./../database.js')

router.get('/shirts', (req, res) => {
    // const posts = await db.collection('post').find().toArray();
    res.send("셔츠 파는 페이지임")
})

router.get('/pants', (req, res) => {
    res.send("바지 파는 페이지임")
})

module.exports = router