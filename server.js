// express 라이브러리 사용한단 뜻
const express = require('express')
const app = express()
const {MongoClient, ObjectId} = require('mongodb')
const methodOverride = require('method-override')

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
    let result = await db.collection('post').find().toArray() // findAll()
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
