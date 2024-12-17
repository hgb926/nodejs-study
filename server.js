// express 라이브러리 사용한단 뜻
const express = require('express')
const app = express()
const {MongoClient, ObjectId} = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')
const env = require('dotenv')
env.config()
const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
    region : 'ap-northeast-2',
    credentials : {
        accessKeyId : process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
})

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'node-forum1217',
        key: function (req, file, cb) {
            cb(null, Date.now().toString()) // 파일명
        }
    })
})


app.use(passport.initialize())
app.use(session({
    secret: '암호화에 쓸 비번',
    resave: false, // 유저가 요청을 보낼때마다 세션을 갱신할건지
    saveUninitialized: false, // 로그인 안해도 세션 만들것인지
    cookie : { maxAge : 60 * 60 * 1000 }, // 1시간 유효, 세션 document 유효시간 변경 가능
    store : MongoStore.create({
        mongoUrl : process.env.MONGO_URL, // DB접속용 url,
        dbName : 'forum', // db네임
    })
}))
app.use(passport.session())

// method-override
app.use(methodOverride('_method'))

// 폴더를 server.js에 등록해두면
// 폴더안에 파일들 html에서 사용 가능
app.use(express.static(__dirname + '/public'))
// app.use(express.static(__dirname + '/public2'))

// ejs 라이브러리 세팅
app.set("view engine", 'ejs')

// post요청 console (req.body 쉽게 읽기)
app.use(express.json())
app.use(express.urlencoded({extended: true}))


let db;
const url = process.env.MONGO_URL;
new MongoClient(url).connect().then((client) => {
    console.log("DB연결 성공");
    db = client.db("forum");
    app.listen(process.env.PORT, () => { // 서버 띄우는 코드
        console.log('http://localhost:8080에서 서버 실행중')
    })
}).catch((err) => {
    console.log(err)
})


// req.login() 쓰면 자동실행됨
passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, {
            id : user._id,
            username : user.username,
        })
    })
})

// 유저가 보낸 쿠키 분석하는 모듈
// 이 코드가 있으면 하위의 어느 API에서나 req.user로 유저의 정보를 가져올 수 있다.
passport.deserializeUser(async (user, done) => {
    const result = await db.collection('user').findOne({_id: new ObjectId(user.id)});
    delete result.password
    process.nextTick(() => {
        done(null, result) // 쿠키가 이상없으면 현재 로그인된 유저정보 알려줌
    })
})



// 미들웨어 함수 : 로그인 여부 검사하는 코드 처럼 자주쓰이는 코드를 모듈화
// next는 미들웨어 실행을 끝내고 다음으로 진행할지 여부를 결정하는 파라미터
const checkAuthenticate = (req, res, next) => {
    const excludedRoutes = ['/login', '/register'];

    if (excludedRoutes.includes(req.path)) {
        // 제외된 경로는 인증 검사를 건너뛴다
        return next();
    }

    if (!req.user) {
        // 인증되지 않은 경우
        return res.send("로그인 하세요");
    }

    // 인증된 경우 다음 미들웨어로 진행
    next();
};


const showTime = (req, res, next) => {
    console.log(new Date())
    next();
}

const checkInputValue = (req, res, next) => {

    req.method === 'POST' && (!req.body.username || !req.body.password) ? res.send("빈값 안받는다") : next()
}

app.use('/login', checkInputValue)
app.use(showTime)
app.use(checkAuthenticate) // 여 코드 밑에 있는 API는 미들웨어 적용됨





app.get('/', (req, res) => {
    // html파일을 응답으로 보내려면 res.sendFile()
    //  현재 프로젝트 절대경로 + 보낼 html
    res.sendFile(__dirname + '/index.html')
})

app.get('/news', (req, res) => {
    db.collection('post').insertOne({title: "어쩌구"})
    // res.send("오늘 비옴")
})

app.get("/shop", (req, res) => {
    res.send("쇼핑페이지입니다")
})

app.get("/about", (req, res) => {
    res.sendFile(__dirname + '/about.html')
})

app.get('/list', async (req, res) => {
    let result = await db.collection('post').find().toArray() // findAll()
    // ejs파일 렌더링은 res.sendFile이 아닌 res.render
    res.render('list.ejs', {post: result, user: req.user})
})

app.get("/time", (req, res) => {
    res.render('time.ejs', {time: new Date()})
})

app.get('/write', (req, res) => {
    res.render('write.ejs')
})

app.post('/add', upload.single('image'), async (req, res) => {

    console.log('req.location: ',req.file.location)

    const response = req.body;
    try {
        // 입력값 검증 (예외처리)
        if (!response.title || !response.content) {
            res.send('제목입력 안됨')
            return;
        }
        await db.collection('post').insertOne({
            title: response.title,
            content: response.content,
            image: req.file.location, // url주소
        })
        res.redirect("/list")

    } catch (e) {
        console.log(e)
        res.status(500).send("서버에러남")
    }
})

app.get('/detail/:id', async (req, res) => {
    try {
        const result = await db.collection('post').findOne({_id: new ObjectId(req.params.id)});

        if (!result) res.status(400).send("요청 url 이상함")

        res.render('detail.ejs', {result: result})
    } catch (e) {
        console.log(e)
        res.status(404).send("url error")
    }
})

app.get('/edit/:id', async (req, res) => {
    try {
        const result = await db.collection('post').findOne({_id: new ObjectId(req.params.id)});
        if (!result) res.status(400).send("요청 url 이상함")
        res.render('edit.ejs', {result: result})
    } catch (e) {
        console.log(e)
        res.status(404).send("url error")
    }
})


app.put('/update', async (req, res) => {
    try {
        const result = req.body;

        // id 검증
        if (!ObjectId.isValid(result.id)) {
            return res.status(400).send("유효하지 않은 ID입니다.");
        }

        // 업데이트 수행
        const updateResult = await db.collection('post').updateOne(
            { _id: new ObjectId(result.id) },
            { $set: { title: result.title, content: result.content } }
        );

        // 업데이트 성공 여부 확인
        if (updateResult.matchedCount === 0) {
            return res.status(404).send("해당 ID를 가진 문서를 찾을 수 없습니다.");
        }

        console.log(result);
        res.redirect('/list');
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 내부 오류");
    }
});

app.delete('/delete',  async (req, res) => {
    await db.collection('post').deleteOne({
        _id: new ObjectId(req.query.docid)})
    res.send("삭제완료")
})

app.get('/list/:id', async (req, res) => {
    // 페이징. limit() 함수 사용
    let result = await db.collection('post').find().skip((req.params.id - 1) * 5).limit(5).toArray()
    res.render('list.ejs', {post: result})
})

// passport.authenticate('local') 쓰면 자동실행 됨
passport.use(new LocalStrategy(async (inputId, inputPw, cb) => {
    try {
        let result = await db.collection('user').findOne({ username: inputId });

        if (!result) {
            return cb(null, false, { message: "아이디 DB에 없음" });
        }

        if (await bcrypt.compare(inputPw, result.password)) {
            return cb(null, result);
        } else {
            return cb(null, false, { message: "비번 불일치" });
        }
    } catch (e) {
        console.log("에러 발생:", e);
        return cb(e);
    }
}));

app.get('/login', (req, res) => {
    res.render('login.ejs')
})

app.post('/login', async (req, res, next) => {

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

app.get('/register', (req, res) => {
    res.render('register.ejs')
})

app.post('/register', async (req, res) => {

    const hashed = await bcrypt.hash(req.body.password, 10);

    await db.collection('user').insertOne({
        username: req.body.username,
        password: hashed
    })
    res.redirect('/')
})