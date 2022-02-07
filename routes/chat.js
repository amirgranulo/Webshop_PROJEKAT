var express = require('express');
var router = express.Router();
var path = require('path');
const { check, validationResult } = require('express-validator');
const Console = require("console");
const pool = require('../utils/baza');

obj = {
    getChats : function (req,res,next) {

            pool.query(`select * from CHAT_GRUPA_UCESNICI CG INNER JOIN ( SELECT CHAT_GRUPA_ID FROM CHAT_GRUPA G
             INNER JOIN CHAT_GRUPA_UCESNICI C ON G.ID = C.CHAT_GRUPA_ID where KORISNIK_ID = $1) TABELA1 
             ON CG.CHAT_GRUPA_ID = TABELA1.CHAT_GRUPA_ID LEFT JOIN TRGOVAC T ON CG.KORISNIK_ID = T.ID
                LEFT JOIN KUPAC K ON CG.KORISNIK_ID = K.ID
                WHERE CG.KORISNIK_ID != $1;`, [req.session.korisnik_id], (err, result) => {
                if (err) {
                    console.info(err)
                }
                req.chats = result.rows;
                console.info(req.chats);
                next();
            })
    },
    getPoruke : function (req,res,next) {
        let vrijeme_poruke = req.body.vrijeme_poruke;
        console.info(vrijeme_poruke);
        if (!req.body.vrijeme_poruke) {  vrijeme_poruke = new Date(Date.now()).toISOString();} // konverzija u postgres timestamp

        pool.query(`SELECT * FROM CHAT_PORUKA WHERE CHAT_GRUPA_ID = $1 AND VRIJEME_SLANJA < $2 ORDER BY VRIJEME_SLANJA DESC LIMIT 10;`,[req.body.chat_id,vrijeme_poruke],(err,result) => {
            if (err) {console.info(err)}
            req.poruke = result.rows;
            next();

        })
    },
    addPoruka : function (req,res,next) {
        pool.query(`INSERT INTO CHAT_PORUKA(PORUKA,CHAT_GRUPA_ID,POSLAO,VRIJEME_SLANJA) VALUES($1,$2,$3,CURRENT_TIMESTAMP)`
            ,[req.body.poruka,req.body.chat_id,req.session.korisnik_id],(err,result) => {
            if (err) {console.info(err)}
            console.info(result);
            next();

        })
    },
    makeChat : function (req,res,next) {
        if ( req.body.korisnik2 === 'admin' ) {
            req.body.korisnik2 = 29; // hardkodirano, malo ruzno,mogao bih ovdje staviti upit koji vraca admin id
        }
        else if (req.body.korisnik1 ==='admin') {
            req.body.korisnik1 = 29;
        }
        pool.query(`SELECT MAKE_CHAT($1,$2)`,[req.body.korisnik1,req.body.korisnik2],(err,result) => {
            if (err) {
                console.info(err)
            }
            if (result.rows[0].make_chat !== -1) { // ako ne postoji vec chat
                pool.query(`INSERT INTO CHAT_GRUPA_UCESNICI(CHAT_GRUPA_ID,KORISNIK_ID) VALUES ($1,$2),($1,$3)`
                    ,[result.rows[0].make_chat,req.body.korisnik1,req.body.korisnik2],(err,result) => {
                    if (err) { console.info(err)}
                })
            }
            next();
        })

    }

}


router.get('/',autorizovan.potrebanLogin,pomocna.getKorisnik,obj.getChats,function (req, res, next) {

    res.render('chat',{tip : req.session.tip,id : req.session.korisnik_id, korisnik : req.korisnik,chats : req.chats});
})
router.post('/',autorizovan.potrebanLogin,obj.getPoruke,function (req,res,next) {
    res.send({poruke : req.poruke})

})
router.post('/dodaj',autorizovan.potrebanLogin,obj.addPoruka,function (req,res,next) {
    res.sendStatus(200);
})

router.post('/napravi_chat',autorizovan.potrebanLogin,obj.makeChat,function (req,res,next) {

    res.sendStatus(200);
})


module.exports = router;


