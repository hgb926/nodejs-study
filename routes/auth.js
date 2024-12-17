const router = require('express').Router();

const connectDB = require('./../database.js')
const passport = require("passport");
const bcrypt = require("bcrypt");

let db;
connectDB.then((client) => {
    console.log("DB연결 성공");
    db = client.db("forum")
}).catch((err) => {
    console.log(err)
})


router.get('/login', (req, res) => {
    res.render('login.ejs')
})

router.post('/login', async (req, res, next) => {

    if (!req.body.username || !req.body.password) return res.send("빈값 안받는다")

    passport.authenticate('local', (err, user, info) => {
        if (err) return res.status(500).json(err)
        if (!user) return res.status(401).json(info.message)
        req.login(user, (err) => {
            if (err) return next(err)
            res.redirect("/")
        })
    })(req, res, next)
})

router.get('/register', (req, res) => {
    res.render('register.ejs')
})

router.post('/register', async (req, res) => {

    const hashed = await bcrypt.hash(req.body.password, 10);

    await db.collection('user').insertOne({
        username: req.body.username,
        password: hashed
    })
    res.redirect('/')
})


module.exports = router