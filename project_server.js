const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql');
const multer = require('multer');
const fs = require('fs');
const app = express();

const PORT = 8000;

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, `${__dirname}/public/uploads`)
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({storage});

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'onetwo12',
    port: 3306,
    database: 'project'
});

const corsOptions = {
    origin: '*',
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, './public/uploads')));
app.use(express.json());

app.get('/', (req, res) => {
    console.log("get");
    res.send("get");
});

app.post('/api/auth/upload/post', (req, res) => {
    db.query('select uid from User where uemail = ? and upw = ?', [req.body.email, req.body.pw], (err, rows) => {
        if(!err && rows != "") {
            const date = new Date();
            db.query('insert into Posting values (0, ?, ?, ?, ?, ?, ?, ?)', [rows[0].uid, req.body.univ, req.body.classes, req.body.prof, date, req.body.title, req.body.script], (err2, rows2) => {
                if(!err2 && rows2 != "") res.status(200).send((rows2.insertId).toString());
                else console.log(err2);
            });
        } else console.log(err);
    });
});

app.post('/api/auth/upload/images', upload.single('image'), (req, res) => {
    db.query('insert into Pieces values (?, ?, ?, ?)', [req.body.aid, req.body.pid, req.file.filename, 0], err => {
        if(err) res.send(false)
        else res.send(true);
    });
});

app.post('/api/auth/upload/comments', (req, res) => {
    db.query('insert into Wholikes (wid, uid, aid, pid, comment, imog, voted) values (0, ?, ?, ?, ?, ?, ?)', [req.body.uid, req.body.aid, req.body.pid, req.body.msg, req.body.imog, req.body.voted], (err, rows) => {
        if(!err && rows != "") {
            if(req.body.voted)
                db.query('update Pieces set likes = likes + 1 where aid = ? and pid = ?', [req.body.aid, req.body.pid], (err2, rows2) => {
                    if(!err2 && rows2 != "") res.send(true);
                    else res.send(false);
                });
            else res.send(true);
        } else res.send(false);
    });
});

app.post('/api/auth/userinfo', (req, res) => {
    db.query('select uid from User where uemail = ? and upw = ?', [req.body.email, req.body.pw], (err, rows) => {
        if(!err && rows != "") res.status(200).send((rows[0].uid).toString());
        else res.send(false);
    });
});

app.post('/api/auth/register', (req, res) => {
    var query = 'insert into User values (0, ?, ?, ?, ?, ?, ?);';
    var data = [req.body.pw, req.body.email, req.body.univ, req.body.depart, req.body.age, req.body.made];
    db.query(query, data, (err, rows) => {
        if(err) res.send(false);
        else res.send(true);
    });
});

app.post('/api/auth/login', (req, res) => {
    db.query('select uemail, upw from User where uemail = ? and upw = ?', [req.body.email, req.body.pw], (err, rows) => {
        if(!err && rows != "") res.send(true);
        else res.send(false);
    });
});

app.post('/api/auth/related', (req, res) => {
    db.query('select distinct aid, pid from Wholikes where uid = ?', [req.body.uid], (err, rows) => {
        if(!err && rows != "") {
            let images = new Array();
            if(rows.length === 0) res.send(false);
            else rows.forEach((el, i) => db.query('select pid from Posting where pid = ? and uid <> ?', [el.pid, req.body.uid], (err2, rows2) => {
                    if(!err2 && rows2 != "")
                        db.query('select image from Pieces where aid = ? and pid = ?', [el.aid, el.pid], (err3, rows3) => {
                            if(!err3 && rows3 != "")
                                images.push({img: rows3[0].image, pid: el.pid});
                            if(i === rows.length - 1) res.send(images);
                        });
                }));
        } else res.send(false);
    });
});

app.post('/api/auth/infomation', (req, res) => {
    db.query('select uid, university, department, age, made from User where uemail = ? and upw = ?', [req.body.email, req.body.pw], (err, rows) => {
        if(!err && rows != "") {
            db.query('select pid from Posting where uid = \'' + rows[0].uid + '\'', (err2, rows2) => {
                if(!err2) {
                    let data = new Object();
                    data.uid = rows[0].uid;
                    data.university = rows[0].university;
                    data.department = rows[0].department;
                    data.age = rows[0].age;
                    data.made = rows[0].made;
                    data.images = [];
                    if(rows2 != "") rows2.forEach((post, i) => db.query('select image from Pieces where pid = ?', [post.pid], (err3, rows3) => {
                        if(!err3 && rows3 != "") rows3.forEach(im => data.images.push({imn: im.image, pid: post.pid}));
                        if(i == rows2.length - 1) res.send(data);
                    }));
                    else res.send(data);
                } else res.send(false);
            });
        } else res.send(false);
    });
});

app.get('/api/auth/load/comment', (req, res) => {
    db.query('select comment from Wholikes W left join Posting P on P.pid = W.pid where P.uid = ? and W.uid <> P.uid order by W.commented desc limit 1', [req.query.uid], (err, rows) => {
        if(!err)
            db.query('select count(distinct W.uid) as num from Wholikes W left join Posting P on P.pid = W.pid where P.uid = ? and P.uid <> W.uid', [req.query.uid], (err2, rows2) => {
                if(!err2) res.send({msg: rows != ""? rows[0].comment: '', num: rows2 != ""? rows2[0].num: 0});
                else res.send(false);
            });
        else res.send(false);
    });
});

app.get('/api/auth/load/timeline', (req, res) => {
    db.query('select pid, title from Posting limit 20', (err, rows) => {
        if(!err && rows != "") {
            let data = new Array();
            rows.forEach((p, i) => db.query('select image from Pieces where pid = ? limit 4', [p.pid], (err2, rows2) => {
                if(!err2 && rows2 != "") data.push({pid: p.pid, title: p.title, images: rows2.map(im => [im.image])});
                if(i === rows.length - 1) res.send(data);
            }))
        } else res.send(false);
    });
});

app.get('/api/auth/load/search', (req, res) => {
    db.query('select distinct pid from Posting where univ like \'%' + req.query.search + '%\' or classes like \'%' + req.query.search + '%\'', (err, rows) => {
        if(!err && rows != "") {
            let data = new Array();
            rows.forEach((el, i) => db.query('select image from Pieces where pid = ? order by rand()', [el.pid], (err2, rows2) => {
                if(!err2 && rows2 != "") rows2.forEach(im => data.push({pid: el.pid, image: im.image}));
                if(i === rows.length - 1) {
                    if(!data) res.send(false);
                    else res.send(data);
                }
            }))
        } else res.send(false);
    });
});

app.get('/api/auth/load/posting', (req, res) => {
    var result = new Object();
    db.query('select uid, univ, classes, prof, title, script, posted from Posting where pid = ' + req.query.pid, (err, rows) => {
        result.uid = rows[0].uid;
        result.univ = rows[0].univ;
        result.class = rows[0].classes;
        result.prof = rows[0].prof;
        result.title = rows[0].title;
        result.script = rows[0].script;
        result.date = rows[0].posted;
        result.image = new Array();
        result.comment = new Array();
        db.query('select image, likes from Pieces where pid = ' + req.query.pid, (err2, rows2) => {
            if(!err && rows != "") 
                rows2.forEach((el, i) => {
                    result.image.push({image: el.image, like: el.likes});
                    if(i == rows2.length - 1)
                        db.query('select uid, aid, comment, imog, commented, voted from Wholikes where pid = ' + req.query.pid, (err3, rows3) => {
                            rows3.forEach((com, j) => result.comment.push({uid: com.uid, aid: com.aid, msg: com.comment, emoticon: com.imog, date: com.commented, voted: com.voted}));
                            res.send(result);
                        });
                });
            else res.send(false);
        });
    });
});

app.get('/api/auth/load/result', (req, res) => {
    var pieces = new Object();
    db.query('select title, uid from Posting where pid = ?', [req.query.pid], (err, rows) => {
        pieces.title = rows[0].title;
        pieces.pie = new Array();
        db.query('select aid, image, likes from Pieces where pid = ? order by likes desc', [req.query.pid], (err2, rows2) => {
            if(!err2 && rows2 != "") {
                rows2.forEach((arg, i) => {
                    pieces.pie.push({aid: arg.aid, img: arg.image, like: arg.likes, isopen: false, comm: []});
                    db.query('select uid, comment, voted from Wholikes where aid = ? and pid = ? and uid <> ?', [arg.aid, req.query.pid, rows[0].uid], (err3, rows3) => {
                        if(!err3 && rows3 != "")
                            rows3.forEach((end, j) => {
                                if(end.voted && end.comment != "")
                                    pieces.pie[i].comm.push({uid: end.uid, comment: end.comment, voted: end.voted})
                                if(i === rows2.length - 1 && j === rows3.length - 1) res.send(pieces);
                            });
                        else {
                            if(i === rows2.length - 1) res.send(pieces);
                        }
                    });
                });
            } else res.send(false);
        });
    });
});

app.post('/api/auth/load/likelist', (req, res) => {
    if(req.body.uid) db.query('select image from Pieces P, (select aid, pid from Wholikes where uid = ? and pid <> ? and voted = 1) S where S.aid = P.aid and S.pid = P.pid limit 4', [req.body.uid, req.body.pid], (err, rows) => {
        if(!err && rows != "") res.send(rows);
        else res.send(false);
    });
});

app.get('/api/auth/load/images', (req, res) => {
    var string = req.query.name.split('.');
    fs.readFile(__dirname + '/public/uploads/' + req.query.name, (err, data) => {
        res.writeHead(200, {"Context-Type": "image/" + string[1]});
        res.write(data);
        res.end();
    });
});

app.post('/api/auth/leave', (req, res) => {
    var query = 'delete from User where uemail = ? and upw = ?';
    var data = [req.body.email, req.body.pw];
    db.query(query, data, (err, rows) => {
        if(!err && rows != "") res.send(true);
        else res.send(false);
    });
});

app.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
});