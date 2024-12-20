const router = require('express').Router();

const connectDB = require('./../database.js')
const passport = require("passport");
const bcrypt = require("bcrypt");

let db;
connectDB.then((client) => {
    db = client.db("forum")
}).catch((err) => {
    console.log(err)
})


router.get('/login', (req, res) => {
    if (req.user) {
        return res.send("이미로그인함")
    }
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
    if (req.user) {
        return res.send("로그아웃하고 가입하세요")
    }
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

router.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            console.error(err);
            return res.status(500).send('로그아웃 처리 중 오류 발생');
        }
        // 쿠키 삭제 (express-session이 사용하는 쿠키 이름은 기본적으로 `connect.sid`)
        res.clearCookie('connect.sid', { path: '/' });

        // 홈 페이지로 리다이렉트
        res.redirect('/');
    });
})


module.exports = router