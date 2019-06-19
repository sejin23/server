const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql');
const app = express();

const PORT = 8000;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'onetwo12',
    port: 3306,
    database: 'rosia'
});

app.use(cors());
app.use(express.static(path.join(__dirname, './public/')));
app.use(express.json());

app.post('/login/user', (req, res) => {
    var query = 'select uid from User where uname = ? and phone = ? and upw = ?';
    var data = [req.body.name, req.body.phone, req.body.pw];
    db.query(query, data, (err, rows) => {
        if(!err && rows != "") res.send(true);
        else res.send(false);
    });
});

app.post('/login/store', (req, res) => {
    var query = 'select sid from Store where sname = ? and branch = ? and spw = ?';
    var data = [req.body.name, req.body.branch, req.body.pw];
    db.query(query, data, (err, rows) => {
        if(!err && rows != "") res.send(true);
        else res.send(false);
    });
});

app.post('/register/user', (req, res) => {
    var query = 'insert into User values (0, ?, ?, ?);';
    var data = [req.body.name, req.body.pw, req.body.phone];
    db.query(query, data, (err, result) => {
        if(err) res.send(false);
        else res.send(true);
    });
});

app.post('/register/store', (req, res) => {
    var query = 'insert into Store values (0, ?, ?, ?, ?);';
    var data = [req.body.name, req.body.branch, req.body.addr, req.body.pw];
    db.query(query, data, (err, result) => {
        if(err) res.send(false);
        else res.send(true);
    });
});

app.post('/register/menu', (req, res) => {
    var query = 'select sid from Store where sname = \''+req.body.name+'\' and branch = \''+req.body.branch+'\' and spw = \''+req.body.pw+'\';';
    db.query(query, (err, rows) => {
        if(!err) {
            query = 'select count(*) as num from Menu where sid = ' + rows[0].sid;
            db.query(query, (err2, rows2) => {
                if(!err2) {
                    query = 'insert into Menu values (?, ?, ?, ?, ?, ?)';
                    var data = [rows2[0].num + 1, rows[0].sid, req.body.menu, req.body.flavor, req.body.price, req.body.explain];
                    db.query(query, data, (err3, rows3) => {
                        if(err3) res.send(false);
                        else res.send(true);
                    });
                } else console.log(err2);
            });
        }
        else console.log(err);
    });
});

app.post('/register/table', (req, res) => {
    db.query('select sid from Store where sname = \''+req.body.name+'\' and branch = \''+req.body.branch+'\' and spw = \''+req.body.pw+'\';', (err, rows) => {
        if(!err) {
            req.body.tables.map(t => {
                db.query('insert into Tables values (?, ?, ?)', [t.num, rows[0].sid, t.cap], (err2, rows2) => {
                    if(err2) console.log(err3);
                });
            });
        }
    });
});

app.post('/order/store', (req, res) => {
    var query = 'select sid, sname, branch from Store where sname like \'%' + req.body.search + '%\' or branch like \'%' + req.body.search + '%\';';
    db.query(query, (err, rows) => {
        if(!err && rows != "") res.send(rows);
        else console.log(err);
    });
});

app.post('/order/menu', (req, res) => {
    var query = 'select S.sid, S.sname, S.branch from Store S where S.sid in (select M.sid from Menu M where M.mname like \"%' + req.body.search + '%\");';
    db.query(query, (err, rows) => {
        if(!err) res.send(rows);
        else console.log(err);
    });
});

app.post('/order/list', (req, res) => {
    var query = 'select mid, mname, flavor, price from Menu where sid = ' + req.body.sid;
    db.query(query, (err, rows) => {
        if(!err) res.send(rows);
        else console.log(err);
    });
});

app.post('/order/request', (req, res) => {
    var query = 'select uid from User where uname = \''+ req.body.user[0].name +'\' and phone = \''+ req.body.user[0].ph +'\' and upw = \'' + req.body.user[0].pw + '\';';
    db.query(query, (err, rows) => {
        if(!err && rows != "") {
            req.body.mid.map(el => {
                var query2 = 'insert into OrderRecord values (0, ?, ?, ?, ?, ?, ?)';
                var data = [req.body.sid, rows[0].uid, el.mid, req.body.tid, el.num, req.body.date];
                db.query(query2, data, (err, rows2) => {
                    if(err) {
                        res.send('올바른 테이블 번호를 선택해주세요.');
                        console.log(err);
                    } else {
                        res.send('success');
                    }
                });
            });
        } else {
            res.send('로그인 후 이용해주세요.');
            console.log(err);
        }
    });
});

app.post('/search/user', (req, res) => {
    var query = 'select uid from User where uname = \''+ req.body.name +'\' and phone = \''+ req.body.phone +'\' and upw = \'' + req.body.pw + '\';';
    db.query(query, (err, rows) => {
        if(!err && rows != "") {
            var query2 = 'select B.sname, B.mname, B.price, B.count, B.dates from (select A.sname, M.mname, M.price, A.count, A.uid, A.dates from (select S.sname, O.mid, O.uid, O.count, O.dates from OrderRecord O left join Store S on O.sid = S.sid) A left join Menu M on A.mid = M.mid) B where uid = \'' + rows[0].uid + '\' order by dates asc;'
            db.query(query2, (err2, rows2) => {
                if(!err && rows != "") res.send(rows2);
                else res.send('fail');
            });
        }
    });
});

app.post('/search/store', (req, res) => {
    var query = 'select sid from Store where sname = \'' + req.body.name + '\' and branch = \'' + req.body.branch + '\' and spw = \'' + req.body.pw + '\';';
    db.query(query, (err, rows) => {
        if(!err && rows != "") {
            var query2 = 'select * from (select O.mid, O.tid, O.count, O.dates, O.sid from OrderRecord O left join Store S on O.sid = S.sid where O.sid = \'' + rows[0].sid + '\') A left join Menu M on A.mid = M.mid where A.sid = M.sid order by dates asc';
            db.query(query2, (err2, rows2) => {
                if(!err2 && rows2 != "") res.send(rows2);
                else res.send('fail');
            });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
});