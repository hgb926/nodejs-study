// express 라이브러리 사용한단 뜻
const express = require('express')
const app = express()


app.listen(8080, () => { // 서버 띄우는 코드
  console.log('http://localhost:8080에서 서버 실행중')  
})

app.get('/', (req, res) => {
  // html파일을 응답으로 보내려면 res.sendFile()
            //  현재 프로젝트 절대경로 + 보낼 html
  res.sendFile(__dirname + '/index.html')
})

app.get('/news', (req, res) => {
  res.send("오늘 비옴")
})

app.get("/shop", (req, res) => {
  res.send("쇼핑페이지입니다")
})

app.get("/about", (req, res) => {
  res.sendFile(__dirname + '/about.html')
})