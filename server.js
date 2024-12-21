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
// webSocekt config
const { createServer } = require('http')
const { Server } = require('socket.io')
const server = createServer(app)
const io = new Server(server)
env.config()


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


const connectDB = require('./database.js');

let db;
connectDB.then((client) => {
    console.log("DB연결 성공");
    db = client.db("forum");
    server.listen(process.env.PORT, () => { // 서버 띄우는 코드
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
    const excludedRoutes = ['/auth/login', '/auth/register'];

    if (excludedRoutes.includes(req.path)) {
        // 제외된 경로는 인증 검사를 건너뛴다
        return next();
    }

    if (!req.user) {
        // 인증되지 않은 경우
        return res.redirect('/auth/login')
    }

    // 인증된 경우 다음 미들웨어로 진행
    next();
};


const showTime = (req, res, next) => {
    // console.log(new Date())
    next();
}

const checkInputValue = (req, res, next) => {

    req.method === 'POST' && (!req.body.username || !req.body.password) ? res.send("빈값 안받는다") : next()
}

app.use('/auth/login', checkInputValue)
app.use(showTime)
app.use(checkAuthenticate) // 여 코드 밑에 있는 API는 미들웨어 적용됨



app.get('/', (req, res) => {
    // html파일을 응답으로 보내려면 res.sendFile()
    //  현재 프로젝트 절대경로 + 보낼 html
    const user = req.user
    res.render('../index.ejs', {user: user})
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

io.on('connection', (socket) => {
    socket.on('유저가 보낸 메세지', (data) => { // [유저 -> 서버] 데이터 수신
        console.log('유저가 보낸거 ',data)
        io.emit('서버가 보낸 메세지', 'server -> client') // [서버 -> 유저] 데이터 전송
    })
    // 위의 코드는 모든 유저에게 메세지를 전달한다. 채팅은 특정 인원에게만 전달해야 하므로 socket.join 사용
    socket.on('ask-join', (data) => {
        // socket.request.session // 현재 로그인된 유저
        socket.join(data)
    })
    // 유저가 특정 룸에 메세지 보내려면
    socket.on('message', (data) => {
        console.log(data)
        // 채팅내용 날짜 부모documentid 작성자
        io.to(data.room).emit('broadcast', data.msg)
    })
})

app.use('/', require('./routes/practice.js'))
app.use('/auth', require('./routes/auth.js'))
app.use('/board', require('./routes/board.js'))
app.use('/shop', require('./routes/shop.js'))