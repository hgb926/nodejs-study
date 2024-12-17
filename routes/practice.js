const router = require('express').Router();

router.get('/news', (req, res) => {
    res.send("오늘 비옴")
})


router.get("/time", (req, res) => {
    res.render('time.ejs', {time: new Date()})
})

module.exports = router;