var express = require('express');
var router = express.Router();
const pool = require('../utils/baza');

obj = {
    getKorpa : function (req,res,next) {
        pool.query(`SELECT *,ARTIKAL.ID AS ARTIKAL_ID FROM KORPA  INNER JOIN ARTIKAL ON ARTIKAL_ID = ARTIKAL.ID
             INNER JOIN TRGOVAC ON TRGOVAC_ID = TRGOVAC.ID INNER JOIN KORISNIK K ON KUPAC_ID = K.ID
            WHERE KORPA.KUPAC_ID = $1;`,[req.session.korisnik_id], (err,result) => {
            if (err) {
                console.info(err);

                return res.sendStatus(500);
            }
            req.korpa = result.rows;
            next();
        })
    },
    obrisi : function (req,res,next) {
        pool.query(`DELETE FROM KORPA WHERE ARTIKAL_ID = $1 AND KUPAC_ID = $2`,[req.body.artikal_id,req.session.korisnik_id],
            (err,result) => {
            if (err) { console.info(err)}
            next();
            })
    }

}

router.get('/',autorizovan.potrebanKupacLogin,obj.getKorpa, function(req, res, next) {

    res.render('korpa', { tip : req.session.tip, id : req.session.korisnik_id , korpa : req.korpa});
});

router.post('/dodaj',autorizovan.potrebanKupacLogin,function (req,res,next) {
    console.info(req.body.id); // id iz AJAX poziva

    // PROCEDURA PROVJERAVA DA LI POSTOJI VEC U KORPI ARTIKAL
    /*
    CREATE OR REPLACE PROCEDURE INSERT_KORPA(ART_ID INT,KPC_ID INT)
    LANGUAGE PLPGSQL
        AS $$
        BEGIN
    IF NOT EXISTS (SELECT * FROM KORPA WHERE ARTIKAL_ID = ART_ID AND KUPAC_ID = KPC_ID)
        THEN INSERT INTO KORPA VALUES (ART_ID,KPC_ID);
    END IF;
    END; $$
    */
    pool.query(`CALL INSERT_KORPA($1,$2)`,[req.body.id,req.session.korisnik_id],(err,result) => {
       if (err) {
           console.info(err);
           return res.sendStatus(500);
       }
       res.sendStatus(200);
   })
})
router.post('/obrisi',autorizovan.potrebanKupacLogin,obj.obrisi,function (req,res,next) {
    res.sendStatus(200);
})

module.exports = router;


