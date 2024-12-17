const router = require('express').Router();

const connectDB = require('./../database.js')
const {ObjectId} = require("mongodb");

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


let db;
connectDB.then((client) => {
    console.log("DB연결 성공");
    db = client.db("forum")
}).catch((err) => {
    console.log(err)
})

router.get('/list', async (req, res) => {
    let result = await db.collection('post').find().toArray() // findAll()
    // ejs파일 렌더링은 res.sendFile이 아닌 res.render
    res.render('list.ejs', {post: result, user: req.user})
})


router.get('/write', (req, res) => {
    res.render('write.ejs')
})


router.post('/add', upload.single('image'), async (req, res) => {

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
        res.redirect("/board/list")

    } catch (e) {
        console.log(e)
        res.status(500).send("서버에러남")
    }
})

router.get('/detail/:id', async (req, res) => {
    try {
        const result = await db.collection('post').findOne({_id: new ObjectId(req.params.id)});

        if (!result) res.status(400).send("요청 url 이상함")

        res.render('detail.ejs', {result: result})
    } catch (e) {
        console.log(e)
        res.status(404).send("url error")
    }
})

router.get('/edit/:id', async (req, res) => {
    try {
        const result = await db.collection('post').findOne({_id: new ObjectId(req.params.id)});
        if (!result) res.status(400).send("요청 url 이상함")
        res.render('edit.ejs', {result: result})
    } catch (e) {
        console.log(e)
        res.status(404).send("url error")
    }
})


router.put('/update', async (req, res) => {
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
        res.redirect('/board/list');
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 내부 오류");
    }
});

router.delete('/delete',  async (req, res) => {
    await db.collection('post').deleteOne({
        _id: new ObjectId(req.query.docid)})
    res.send("삭제완료")
})

router.get('/list/:id', async (req, res) => {
    // 페이징. limit() 함수 사용
    let result = await db.collection('post').find().skip((req.params.id - 1) * 5).limit(5).toArray()
    res.render('list.ejs', {post: result})
})


module.exports = router