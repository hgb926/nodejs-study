const router = require('express').Router();

const connectDB = require('./../database.js')
const {ObjectId} = require("mongodb");
const moment = require('moment')
const {S3Client} = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
    region: 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
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

    if (req.file && req.file.location) console.log("req.location : ", req.file.location)

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
            image: req.file ? req.file.location : "",
            commentCount: 0,
            user: req.user._id,
            username: req.user.username
        })
        res.redirect("/board/list")

    } catch (e) {
        console.log(e)
        res.status(500).send("서버에러남")
    }
})

router.get('/detail/:id', async (req, res) => {
    try {
        const post = await db.collection('post').findOne({_id: new ObjectId(req.params.id)});
        if (!post) res.status(400).send("요청 url 이상함")
        const commentList = await db.collection('comment').find({post_id: new ObjectId(req.params.id)}).toArray();

        commentList.forEach(ct => {
            ct.createdAt = moment(commentList.createdAt).format("YYYY-MM-DD")
        })
        res.render('detail.ejs', {post: post, commentList: commentList, user: req.user})
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
            {_id: new ObjectId(result.id)},
            {$set: {title: result.title, content: result.content}}
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

router.delete('/delete', async (req, res) => {
    const result = await db.collection('post').deleteOne({
        _id: new ObjectId(req.query.docid),
        user: req.user._id
    });
    res.send(result.deletedCount > 0 ? "삭제완료" : "삭제실패")
})

router.get('/list/:id', async (req, res) => {
    // 페이징. limit() 함수 사용
    let result = await db.collection('post').find().skip((req.params.id - 1) * 5).limit(5).toArray()
    res.render('list.ejs', {post: result})
})

router.get('/search', async (req, res) => {
    const post = await db.collection('post')
        .find({title: {$regex: req.query.val}})
        .toArray();
    res.render('search.ejs', {post: post, word: req.query.val})
})

router.post('/comment', async (req, res) => {
    const request = req.body;
    if (!request.content) res.send("입력값 없음")
    try {
        await db.collection('comment').insertOne({
            post_id: new ObjectId(request._id),
            content: request.content,
            createdAt: new Date(),
            user_id: req.user._id,
            username: req.user.username
        });
        const post = await db.collection('post').findOne({_id: new ObjectId(request._id)})
        const currentCommentCount = post.commentCount || 0;

        await db.collection('post').updateOne(
            {_id: new ObjectId(request._id)},
            {$set: {commentCount: currentCommentCount + 1}}
        );

        // 댓글이 추가된 게시글의 상세 페이지로 이동
        res.redirect(`/board/detail/${request._id}`);
    } catch (e) {
        console.error(e);
        res.status(500).send("댓글 추가 중 오류 발생");
    }
})

router.get('/chat/request', async (req, res) => {
    if (req.user._id.equals(new ObjectId(req.query.writerId))) return res.send("불가능한 채팅방입니다.")
    try {
        // 해당 채팅방이 이미 존재하는지 확인
        const flag = await db.collection('chatRoom').findOne({
            member: { $all: [req.user._id, new ObjectId(req.query.writerId)] }, // $all 사용
        });

        if (flag) {
            // 채팅방이 이미 존재할 경우
            return res.send("이미 있는 채팅방입니다");
        }

        const writer = await db.collection('user').findOne({ _id: new ObjectId(req.query.writerId)});
        const title = writer.username + '님과의 채팅방'
        console.log(title)

        // 채팅방이 없으면 생성
        await db.collection('chatRoom').insertOne({
            title,
            member: [req.user._id, new ObjectId(req.query.writerId)],
            date: new Date(),
        });

        // 채팅방 목록으로 리다이렉트
        res.redirect('/board/chat/list');
    } catch (e) {
        console.error(e);
        res.status(500).send("채팅방 생성 중 오류 발생");
    }
});

router.get('/chat/list', async (req, res) => {

    const list = await db.collection('chatRoom').find({
        member: req.user._id
    }).toArray();
    for (const chat of list) {
        const flag = chat.member.some(memberId => memberId.equals(req.user._id));
        if (!flag) {
            return res.send("본인이 아닙니다."); // 조건에 맞지 않으면 즉시 응답
        }
    }
    list.forEach(ct => {
        ct.date = moment(list.date).format("YYYY-MM-DD HH:mm")
    })

    res.render('chatList.ejs', {list: list})
})

router.get('/chat/detail/:id', async (req, res) => {
    const result = await db.collection('chatRoom').findOne({
        _id: new ObjectId(req.params.id)
    });
    const flag = result.member.some(id => id.equals(req.user._id));
    if (!flag) {
        return res.send("본인이 아닙니다~")
    }

    res.render('chatDetail.ejs', {result: result, user: req.user})
})

module.exports = router