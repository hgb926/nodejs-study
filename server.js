// express 라이브러리 사용한단 뜻
const express = require('express')
const app = express()

// 폴더를 server.js에 등록해두면
// 폴더안에 파일들 html에서 사용 가능
app.use(express.static(__dirname + '/public'))
// app.use(express.static(__dirname + '/public2'))

// ejs 라이브러리 세팅
app.set("view engine", 'ejs')

// post요청 console (req.body 쉽게 읽기)
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const {MongoClient} = require('mongodb')

let db;
const url = "mongodb+srv://root:mongodb@cluster0.ugbml." +
    "mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
new MongoClient(url).connect().then((client) => {
    console.log("DB연결 성공");
    db = client.db("forum");
    app.listen(8080, () => { // 서버 띄우는 코드
        console.log('http://localhost:8080에서 서버 실행중')
    })
}).catch((err) => {
    console.log(err)
})


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
    let result = await db.collection('post').find().toArray()
    // ejs파일 렌더링은 res.sendFile이 아닌 res.render
    res.render('list.ejs', {post: result})
})

app.get("/time", (req, res) => {
    res.render('time.ejs', {time: new Date()})
})

app.get('/write', (req, res) => {
    res.render('write.ejs')
})

app.post('/add', async (req, res) => {
    const response = req.body;
    console.log('response : ', response)
    try {
        // 입력값 검증 (예외처리)
        if (!response.title || !response.content) {
            res.send('제목입력 안됨')
            return;
        }
        await db.collection('post').insertOne({title: response.title, content: response.content})
        res.redirect("/list")

    } catch(e) {
        console.log(e)
        res.status(500).send("서버에러남")
    }
})